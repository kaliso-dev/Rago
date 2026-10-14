#![allow(dead_code)] // seal et version_key ne servent qu'à build.rs et aux tests
//! Chiffrement des scripts Premium embarqués dans l'exe.
//!
//! Les scripts des réglages Premium ne sont pas en clair dans le binaire : `build.rs` les chiffre avec une clé
//! propre à la version de l'app, `HMAC-SHA256(secret, "rago-scripts-v1|<version>")`. Le secret n'est connu que de
//! la CI (RAGO_SCRIPTS_SECRET) et du serveur de licences (SCRIPTS_SECRET), qui envoie la clé de la version à une
//! licence active (`scripts_key`). Sans licence, l'app ne peut ni lire ni lancer ces scripts.
//!
//! Chiffrement : flux HMAC-SHA256 en mode compteur, puis étiquette HMAC sur le nonce et le chiffré
//! (chiffrer puis authentifier). Ce fichier sert aussi à build.rs.

use sha2::{Digest, Sha256};

/// Secret de développement, comme la clé de test du serveur : un build release connecté le refuse.
pub const TEST_SECRET: &str = "rago-test-scripts-secret";

pub fn hmac(key: &[u8], msg: &[u8]) -> [u8; 32] {
    let mut k = [0u8; 64];
    if key.len() > 64 {
        k[..32].copy_from_slice(&Sha256::digest(key));
    } else {
        k[..key.len()].copy_from_slice(key);
    }
    let (mut ipad, mut opad) = ([0x36u8; 64], [0x5cu8; 64]);
    for i in 0..64 {
        ipad[i] ^= k[i];
        opad[i] ^= k[i];
    }
    let inner = Sha256::new().chain_update(ipad).chain_update(msg).finalize();
    Sha256::new().chain_update(opad).chain_update(inner).finalize().into()
}

/// Clé des scripts d'une version de l'app (le serveur fait le même calcul avec `device.app_version`).
pub fn version_key(secret: &str, version: &str) -> [u8; 32] {
    hmac(secret.as_bytes(), format!("rago-scripts-v1|{version}").as_bytes())
}

/// Secret d'obfuscation des scripts hors licence, reconstruit par XOR de deux moitiés pour qu'il n'apparaisse pas
/// d'un bloc dans le binaire. Ce n'est pas un vrai secret (il est dans l'exe), mais il évite qu'on lise les
/// commandes en ouvrant le fichier.
fn offline_secret() -> [u8; 32] {
    const A: [u8; 32] = [
        0xe0, 0x96, 0xc5, 0x19, 0x82, 0x6c, 0x5d, 0xb7, 0xbe, 0x70, 0xae, 0x4b, 0xa5, 0x2c, 0x1a, 0xc1,
        0xe5, 0xf8, 0x12, 0x6a, 0xd9, 0xbc, 0x45, 0x1f, 0xc5, 0xa0, 0x5b, 0x1f, 0x37, 0x2b, 0xb7, 0x5d,
    ];
    const B: [u8; 32] = [
        0x31, 0x86, 0x3b, 0xf1, 0xdf, 0xc6, 0x12, 0xc6, 0x91, 0xa8, 0xe5, 0x12, 0x75, 0x8d, 0x31, 0xb2,
        0xba, 0x52, 0xb6, 0x90, 0x1e, 0x8d, 0x94, 0xb6, 0x56, 0xd8, 0xdc, 0x40, 0x5b, 0x76, 0x35, 0xc4,
    ];
    let mut s = [0u8; 32];
    for i in 0..32 {
        s[i] = A[i] ^ B[i];
    }
    s
}

/// Clé des scripts du plan gratuit et de retour arrière, qui doivent tourner sans licence ni serveur. À la
/// différence de `version_key` (secret resté sur le serveur), elle est reconstituée dans le binaire : une
/// obfuscation, pas un secret. Elle empêche de lire les commandes en ouvrant l'exe (ou en le donnant à une IA) ;
/// elle n'arrête pas une rétro-ingénierie déterminée. Dérivée de la version, comme la clé Premium.
pub fn offline_key(version: &str) -> [u8; 32] {
    hmac(&offline_secret(), format!("rago-plain-v1|{version}").as_bytes())
}

fn xor_stream(key: &[u8; 32], nonce: &[u8], data: &mut [u8]) {
    let ek = hmac(key, b"enc");
    let mut block = nonce.to_vec();
    block.extend_from_slice(&[0u8; 8]);
    let n = nonce.len();
    for (i, chunk) in data.chunks_mut(32).enumerate() {
        block[n..].copy_from_slice(&(i as u64).to_be_bytes());
        let ks = hmac(&ek, &block);
        for (b, k) in chunk.iter_mut().zip(ks) {
            *b ^= k;
        }
    }
}

fn tag(key: &[u8; 32], nonce: &[u8], ct: &[u8]) -> [u8; 32] {
    let mk = hmac(key, b"mac");
    let mut m = nonce.to_vec();
    m.extend_from_slice(ct);
    hmac(&mk, &m)
}

/// nonce (16 octets) | chiffré | étiquette (32 octets)
pub fn seal(key: &[u8; 32], nonce: &[u8; 16], plain: &[u8]) -> Vec<u8> {
    let mut ct = plain.to_vec();
    xor_stream(key, nonce, &mut ct);
    let t = tag(key, nonce, &ct);
    let mut out = nonce.to_vec();
    out.extend_from_slice(&ct);
    out.extend_from_slice(&t);
    out
}

/// Déchiffre, ou None si la clé est fausse ou le contenu modifié.
pub fn open(key: &[u8; 32], sealed: &[u8]) -> Option<Vec<u8>> {
    if sealed.len() < 48 {
        return None;
    }
    let (nonce, rest) = sealed.split_at(16);
    let (ct, t) = rest.split_at(rest.len() - 32);
    let expect = tag(key, nonce, ct);
    // comparaison en temps constant
    if expect.iter().zip(t).fold(0u8, |acc, (a, b)| acc | (a ^ b)) != 0 {
        return None;
    }
    let mut plain = ct.to_vec();
    xor_stream(key, nonce, &mut plain);
    Some(plain)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hmac_matches_rfc4231() {
        // RFC 4231, cas 2
        let h = hmac(b"Jefe", b"what do ya want for nothing?");
        let hex: String = h.iter().map(|b| format!("{b:02x}")).collect();
        assert_eq!(hex, "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
    }

    #[test]
    fn seal_round_trip_and_rejects_wrong_key() {
        let k = version_key(TEST_SECRET, "1.1.6");
        let plain = "reg add \"HKLM\\x\" /v y /t REG_DWORD /d 1 /f\r\n".repeat(50);
        let s = seal(&k, &[9u8; 16], plain.as_bytes());
        assert!(!s.windows(7).any(|w| w == b"reg add"), "le chiffré ne doit pas contenir le clair");
        assert_eq!(open(&k, &s).unwrap(), plain.as_bytes());
        assert!(open(&version_key(TEST_SECRET, "1.1.7"), &s).is_none());
        let mut bad = s.clone();
        bad[20] ^= 1;
        assert!(open(&k, &bad).is_none());
    }
}
