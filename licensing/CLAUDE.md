# licensing/ : le serveur de comptes et licences (Node + Hono)

Lire d'abord `CLAUDE.md` à la racine et `docs/vault/Technique/Reprendre le développement.md`.

- Fonctionnement : `docs/vault/Technique/Architecture du serveur.md` ; routes : `docs/vault/Technique/API du serveur.md` ; Stripe : `Paiements Stripe.md` ; base : `Supabase.md` ; hébergement : `Railway.md` ; variables : `Variables d'environnement.md` (tous dans `docs/vault/Technique/`).
- Une fiche par fichier et par table : `docs/vault/Code/Serveur/Code du serveur.md`.
- Local : `npm install && npm run local` (http://localhost:8787, base en mémoire, variables de prod retirées). Tests : `npm test`.
- Une nouvelle variable : `src/config.js` + `.env.example` + `docs/MISE-EN-LIGNE.md` + la note du vault.
- `schema.sql` est rejoué à chaque démarrage : seulement des changements idempotents (`IF NOT EXISTS`), jamais de suppression.
- Ne jamais lancer `npm run keys`, ni changer `LICENSE_SIGNING_KEY`, `SESSION_SECRET` ou `SCRIPTS_SECRET` (`docs/vault/Technique/Clés et secrets.md`). Mettre à jour le vault à la fin de la tâche.
