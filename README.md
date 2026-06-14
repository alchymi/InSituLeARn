# InSitu AR Learning

Plateforme WebAR de formation **en situation réelle**. Un éditeur place des images cibles dans un lieu physique, attache du contenu pédagogique (texte, carte info riche, image, modèle 3D GLB, embed externe), et partage un lien. N'importe qui scanne l'image avec son téléphone, sans installation, et voit le contenu superposé en réalité augmentée.

Stack open source, self-hosted : **Vite + React + TypeScript + Tailwind + Three.js + MindAR** côté front, **PocketBase 0.22.21** + SQLite côté back, **Docker Compose** pour le déploiement.

---

## Structure du repo

```
.
├── docker-compose.yml          # orchestration des 3 services (avec profil "prod")
├── .env.example                # variables d'environnement de déploiement
├── server/pocketbase/          # Dockerfile + migrations + pb_data (volume)
├── editor/                     # back-office éditeur (React, port dev 5174)
├── apprenant/                  # app WebAR publique (React + Three.js + MindAR, port dev 8443)
├── design/                     # maquettes HTML + design tokens
├── phase0/                     # prototype de validation tracking (gardé pour référence)
└── PRD_InSitu_AR_Learning.md   # cahier des charges initial
```

---

## Développement local

Prérequis : Node 20+, **pnpm**, Docker.

```bash
# 1) PocketBase (le seul service docker en dev)
docker compose up -d pocketbase
# → http://localhost:8092/_/ (admin)

# 2) Éditeur back-office
cd editor && pnpm install && pnpm dev
# → http://localhost:5174/

# 3) Apprenant WebAR (HTTPS auto via plugin-basic-ssl)
cd ../apprenant && pnpm install && pnpm dev
# → https://localhost:8443/ (accepter le cert auto-signé)
```

Pour tester depuis un téléphone sur le même Wi-Fi, l'app apprenant est aussi disponible sur l'IP LAN de la machine (`https://192.168.x.x:8443`). Le navigateur du téléphone demandera d'accepter le certificat auto-signé.

---

## Déploiement (home lab via Cloudflare Tunnel)

1. **Configurer les variables d'environnement** :
   ```bash
   cp .env.example .env
   # Éditer .env avec les URL publiques (celles configurées dans ton tunnel cloudflared)
   ```

2. **Lancer les 3 services** :
   ```bash
   docker compose --profile prod up -d --build
   ```

3. **Configurer Cloudflare Tunnel** (côté OS, pas dans ce repo) pour router :
   - `pb.example.com` → `http://localhost:8092`
   - `admin-ar.example.com` → `http://localhost:8081`
   - `ar.example.com` → `http://localhost:8082`

   Cloudflare gère le TLS — les services internes restent en HTTP.

### Architecture runtime des frontends

Les apps front sont des bundles statiques servis par **nginx**. La config (`POCKETBASE_URL`, `ADMIN_APP_URL`, `PUBLIC_APP_URL`) est **injectée à chaque démarrage du container** dans `/env.js`, **pas** compilée dans le bundle. Conséquence pratique : changer une URL ne nécessite **pas** de rebuild, juste un `docker compose restart`.

Implementation : un script entrypoint nginx-alpine (`docker-entrypoint.d/30-insitu-config.sh`) génère `env.js` depuis les variables d'environnement, puis nginx démarre.

### Persistance

`./server/pocketbase/pb_data` est monté en volume. Sauvegarde avec :
```bash
tar -czf insitu-backup-$(date +%Y-%m-%d).tar.gz ./server/pocketbase/pb_data ./server/pocketbase/pb_migrations
```

---

## Stack

| Couche | Techno |
|---|---|
| Frontend | Vite, React 18, TypeScript, Tailwind CSS |
| 3D / AR | Three.js, MindAR (image tracking + compiler navigateur) |
| Édition de texte | Quill 2 (cartes info riches) |
| State | Zustand, TanStack Query |
| Forms | React Hook Form + Zod |
| Backend | PocketBase 0.22.21 (Go), SQLite |
| Container | Docker, Docker Compose, nginx-alpine pour les fronts |
| Reverse proxy / TLS | Cloudflare Tunnel (hors repo) |

---

## Documentation

- `PRD_InSitu_AR_Learning.md` — vision produit et décisions techniques initiales
- `CLAUDE.md` — guide d'orientation pour Claude Code
- `design/design-system.md` — tokens design (couleurs, typo, spacing, motion)
- `design/poc-mockup.html` — maquettes statiques des 8 écrans clés
