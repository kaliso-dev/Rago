//! Icône d'un programme en PNG (launchers de la bibliothèque) : l'icône que Windows affiche pour l'exe, à la taille
//! demandée, encodée sans bibliothèque d'image (PNG non compressé, quelques dizaines de Ko).

/// PNG RGBA 8 bits, données non compressées (blocs « stored » de deflate).
pub fn png(width: u32, height: u32, rgba: &[u8]) -> Vec<u8> {
    assert_eq!(rgba.len(), (width * height * 4) as usize);
    let mut raw = Vec::with_capacity(rgba.len() + height as usize);
    for row in rgba.chunks_exact(width as usize * 4) {
        raw.push(0); // filtre « aucun »
        raw.extend_from_slice(row);
    }
    let mut z = vec![0x78, 0x01];
    let mut blocks = raw.chunks(0xFFFF).peekable();
    if blocks.peek().is_none() {
        z.extend_from_slice(&[1, 0, 0, 0xFF, 0xFF]);
    }
    while let Some(b) = blocks.next() {
        z.push(u8::from(blocks.peek().is_none()));
        let len = b.len() as u16;
        z.extend_from_slice(&len.to_le_bytes());
        z.extend_from_slice(&(!len).to_le_bytes());
        z.extend_from_slice(b);
    }
    z.extend_from_slice(&adler32(&raw).to_be_bytes());

    let mut out = b"\x89PNG\r\n\x1a\n".to_vec();
    let mut ihdr = Vec::with_capacity(13);
    ihdr.extend_from_slice(&width.to_be_bytes());
    ihdr.extend_from_slice(&height.to_be_bytes());
    ihdr.extend_from_slice(&[8, 6, 0, 0, 0]);
    chunk(&mut out, b"IHDR", &ihdr);
    chunk(&mut out, b"IDAT", &z);
    chunk(&mut out, b"IEND", &[]);
    out
}

fn chunk(out: &mut Vec<u8>, kind: &[u8; 4], data: &[u8]) {
    out.extend_from_slice(&(data.len() as u32).to_be_bytes());
    let start = out.len();
    out.extend_from_slice(kind);
    out.extend_from_slice(data);
    let crc = crc32(&out[start..]);
    out.extend_from_slice(&crc.to_be_bytes());
}

fn crc32(data: &[u8]) -> u32 {
    let mut crc = 0xFFFF_FFFFu32;
    for &b in data {
        crc ^= u32::from(b);
        for _ in 0..8 {
            crc = if crc & 1 != 0 { (crc >> 1) ^ 0xEDB8_8320 } else { crc >> 1 };
        }
    }
    !crc
}

fn adler32(data: &[u8]) -> u32 {
    let (mut a, mut b) = (1u32, 0u32);
    for chunk in data.chunks(5552) {
        for &x in chunk {
            a += u32::from(x);
            b += a;
        }
        a %= 65521;
        b %= 65521;
    }
    (b << 16) | a
}

/// Icône de l'exe en PNG carré de `size` pixels, None si l'exe n'en a pas.
#[cfg(windows)]
pub fn exe_png(path: &std::path::Path, size: i32) -> Option<Vec<u8>> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Graphics::Gdi::{
        DeleteObject, GetDC, GetDIBits, GetObjectW, ReleaseDC, BITMAP, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::{DestroyIcon, GetIconInfo, PrivateExtractIconsW, HICON, ICONINFO};

    let wide: Vec<u16> = path.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
    let mut icon: HICON = std::ptr::null_mut();
    let mut id = 0u32;
    let n = unsafe { PrivateExtractIconsW(wide.as_ptr(), 0, size, size, &mut icon, &mut id, 1, 0) };
    if n == 0 || n == u32::MAX || icon.is_null() {
        return None;
    }
    let mut info: ICONINFO = unsafe { std::mem::zeroed() };
    let ok = unsafe { GetIconInfo(icon, &mut info) } != 0;
    let result = (|| {
        if !ok || info.hbmColor.is_null() {
            return None;
        }
        let mut bm: BITMAP = unsafe { std::mem::zeroed() };
        if unsafe { GetObjectW(info.hbmColor, std::mem::size_of::<BITMAP>() as i32, (&mut bm as *mut BITMAP).cast()) } == 0 {
            return None;
        }
        let (w, h) = (bm.bmWidth, bm.bmHeight.abs());
        if !(1..=512).contains(&w) || !(1..=512).contains(&h) {
            return None;
        }
        let header = || {
            let mut bi: BITMAPINFO = unsafe { std::mem::zeroed() };
            bi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
            bi.bmiHeader.biWidth = w;
            bi.bmiHeader.biHeight = -h; // de haut en bas
            bi.bmiHeader.biPlanes = 1;
            bi.bmiHeader.biBitCount = 32;
            bi.bmiHeader.biCompression = BI_RGB;
            bi
        };
        let dc = unsafe { GetDC(std::ptr::null_mut()) };
        if dc.is_null() {
            return None;
        }
        let mut px = vec![0u8; (w * h * 4) as usize];
        let mut bi = header();
        let lines = unsafe { GetDIBits(dc, info.hbmColor, 0, h as u32, px.as_mut_ptr().cast(), &mut bi, DIB_RGB_COLORS) };
        // icône sans canal alpha (anciennes icônes) : la transparence vient du masque (noir = opaque)
        if lines == h && px.chunks_exact(4).all(|p| p[3] == 0) && !info.hbmMask.is_null() {
            let mut mask = vec![0u8; (w * h * 4) as usize];
            let mut bi = header();
            if unsafe { GetDIBits(dc, info.hbmMask, 0, h as u32, mask.as_mut_ptr().cast(), &mut bi, DIB_RGB_COLORS) } == h {
                for (p, m) in px.chunks_exact_mut(4).zip(mask.chunks_exact(4)) {
                    p[3] = if m[0] == 0 { 255 } else { 0 };
                }
            }
        }
        unsafe { ReleaseDC(std::ptr::null_mut(), dc) };
        if lines != h {
            return None;
        }
        // BGRA → RGBA
        for p in px.chunks_exact_mut(4) {
            p.swap(0, 2);
        }
        Some(png(w as u32, h as u32, &px))
    })();
    unsafe {
        if !info.hbmColor.is_null() {
            DeleteObject(info.hbmColor);
        }
        if !info.hbmMask.is_null() {
            DeleteObject(info.hbmMask);
        }
        DestroyIcon(icon);
    }
    result
}

#[cfg(not(windows))]
pub fn exe_png(_path: &std::path::Path, _size: i32) -> Option<Vec<u8>> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn checksums_match_the_references() {
        assert_eq!(crc32(b"IEND"), 0xAE42_6082);
        assert_eq!(crc32(b"123456789"), 0xCBF4_3926);
        assert_eq!(adler32(b"Wikipedia"), 0x11E6_0398);
    }

    #[test]
    fn writes_a_valid_png() {
        let (w, h) = (3u32, 2u32);
        let rgba: Vec<u8> = (0..w * h * 4).map(|i| i as u8).collect();
        let p = png(w, h, &rgba);
        assert!(p.starts_with(b"\x89PNG\r\n\x1a\n"));
        assert_eq!(&p[12..16], b"IHDR");
        assert_eq!(&p[16..24], &[0, 0, 0, 3, 0, 0, 0, 2]);
        assert!(p.ends_with(&[0, 0, 0, 0, b'I', b'E', b'N', b'D', 0xAE, 0x42, 0x60, 0x82]));
        // IDAT : zlib, un bloc final non compressé avec les lignes filtrées
        let idat = &p[33 + 8..];
        assert_eq!(&idat[..2], &[0x78, 0x01]);
        assert_eq!(idat[2], 1);
        let len = u16::from_le_bytes([idat[3], idat[4]]) as usize;
        assert_eq!(len, ((w * 4 + 1) * h) as usize);
        assert_eq!(&idat[7..7 + 1 + 12], &[0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        // gros PNG : plusieurs blocs
        let big = png(200, 200, &vec![255; 200 * 200 * 4]);
        assert!(big.len() > 160_000 && big.len() < 162_000);
        if let Ok(dir) = std::env::var("RAGO_PNG_OUT") {
            let grad: Vec<u8> = (0..64 * 64).flat_map(|i| [(i % 64 * 4) as u8, (i / 64 * 4) as u8, 128, if i % 64 < 32 { 255 } else { 90 }]).collect();
            std::fs::write(format!("{dir}/icon-test.png"), png(64, 64, &grad)).unwrap();
        }
    }
}
