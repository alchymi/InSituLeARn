# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Vue d'ensemble

**InSitu AR Learning** — plateforme WebAR de formation en situation réelle. Un éditeur place des images cibles dans un lieu physique, y attache du contenu pédagogique (texte, carte info riche, image, modèle 3D GLB, embed externe) et partage un lien `/e/:slug`. N'importe qui scanne l'image avec son téléphone, sans installation, et voit le contenu superposé en AR.

Le POC initial est implémenté. La **source de vérité produit** reste [PRD_InSitu_AR_Learning.md](PRD_InSitu_AR_Learning.md), mais **le code prime sur le PRD quand les deux divergent** — plusieurs choix d'implémentation s'écartent du PRD (voir « Écarts par rapport au PRD » plus bas).

## Structure du repo (monorepo, 3 apps + PB)

```
server/pocketbase/   PocketBase 0.22.21 (Go) — Dockerfile + pb_migrations/ (JS) + pb_data/ (volume, gitignoré)
editor/              Back-office éditeur — React, port dev 5174 (HTTP)
apprenant/           App WebAR publique — React + Three.js + MindAR, port dev 8443 (HTTPS auto)
phase0/              Prototype tracking nu (vanilla TS, sans React) — gardé pour référence, pas déployé
design/              Maquettes HTML statiques + design tokens (design-system.md)
docker-compose.yml   Orchestration ; profil `prod` pour les deux fronts
MiseEnProd.md        Procédure de déploiement home lab (Cloudflare Tunnel) — la suivre pas à pas pour déployer
```

`editor/` et `apprenant/` sont deux apps Vite **indépendantes** (chacune son `package.json`, son `pnpm-lock.yaml`). Elles partagent par **copie** plusieurs fichiers quasi-identiques (`src/lib/config.ts`, `src/lib/pb.ts`, `src/lib/mind-ar.d.ts`, `src/ar/buildArContent.ts`) — il n'y a **pas** de package partagé. Modifier l'un n'affecte pas l'autre : penser à répliquer un changement commun dans les deux si nécessaire.

## Commandes

Aucun framework de test n'est installé (pas de Playwright/Vitest malgré le PRD). La seule barrière qualité est `tsc --noEmit` via `pnpm build`. Pas d'ESLint/Prettier configurés non plus.

```bash
# Dev — PocketBase via Docker, fronts en pnpm (depuis editor/ ou apprenant/)
docker compose up -d pocketbase          # API + admin sur http://localhost:8092/_/
cd editor    && pnpm install && pnpm dev  # http://localhost:5174/
cd apprenant && pnpm install && pnpm dev  # https://localhost:8443/ (cert auto-signé à accepter)

# Vérif types + build (le "test" du projet)
pnpm build        # = tsc --noEmit && vite build

# Prod — les 3 services en Docker (build des fronts inclus)
docker compose --profile prod up -d --build
```

L'app **apprenant tourne en HTTPS en dev** (`@vitejs/plugin-basic-ssl`) car la caméra l'exige. Son `vite.config.ts` **proxifie `/api` et `/_` vers PocketBase** (`localhost:8092`) pour éviter le mixed-content quand on teste depuis un téléphone sur le LAN (`https://192.168.x.x:8443`). L'éditeur, lui, tourne en HTTP simple (port 5174).

## Configuration runtime (pattern critique : `env.js`)

Les fronts sont des **bundles statiques servis par nginx**. Leur config (`POCKETBASE_URL`, `ADMIN_APP_URL`, `PUBLIC_APP_URL`) **n'est PAS compilée dans le bundle** : à chaque démarrage du container, `docker-entrypoint.sh` régénère `/env.js` depuis les variables d'environnement, qui pose `window.__INSITU_CONFIG__`.

`src/lib/config.ts` résout chaque clé dans l'ordre **runtime (`window.__INSITU_CONFIG__`) > build-time (`import.meta.env.VITE_*`) > défaut**. Conséquence : **changer une URL ne nécessite pas de rebuild**, seulement `docker compose restart editor apprenant`. Toujours lire les URLs via `getConfig(...)`, jamais `import.meta.env` directement.

Les variables `.env` (à la racine, voir `.env.example`) sont `POCKETBASE_PUBLIC_URL` / `EDITOR_PUBLIC_URL` / `APPRENANT_PUBLIC_URL` (les URLs vues par le navigateur) et `POCKETBASE_PORT` / `EDITOR_PORT` / `APPRENANT_PORT` (binds locaux ciblés par cloudflared).

## Moteur AR (`apprenant/src/ar/`)

- `ArExperience.ts` — wrapper autour de `MindARThree`. Charge **un seul** fichier `.mind` mergé contenant toutes les targets de l'expérience ; l'index d'anchor correspond à l'ordre des targets (triées par `order`, puis `created`).
- **Détection de tracking maison** : MindAR ne fournit pas de signal « perdu » fiable, donc `ArExperience` combine deux ceintures — `onTargetFound/Update` ET la détection de changement de la matrice de l'anchor frame par frame (`MATRIX_EPSILON`). Une target est considérée perdue après `LOST_AFTER_FRAMES` (6) frames sans mise à jour. Les contenus sont **physiquement détachés** du groupe quand la target est perdue (mettre `visible=false` ne suffit pas à empêcher le rendu/raycast).
- `buildArContent.ts` — construit un `THREE.Object3D` par `ar_content` selon son `type`. `text` et `info` sont rendus en **canvas → CanvasTexture** (info passe par `html2canvas` sur du HTML Quill sanitizé). Le tap est géré par raycasting ; seuls les objets dont un ancêtre porte `userData.contentId` sont cliquables (cf. `embed`).
- L'adapter AR.js mentionné dans le PRD **n'existe pas** : seul MindAR est implémenté, sans la couche d'abstraction `MindArAdapter`/`ArJsAdapter` prévue.

## Pipeline de compilation `.mind` (≠ PRD)

Contrairement au PRD (qui parlait de compilation manuelle/externe), **la compilation se fait dans le navigateur de l'éditeur, au moment de la publication** :

1. L'éditeur charge toutes les `sourceImage` des targets de l'expérience.
2. `editor/src/lib/compile.ts` (`compileMergedMindTargets`) les compile en **un seul `.mind` mergé** via le `Compiler` de MindAR.
3. Ce fichier est uploadé dans `experiences.compiledTargets` (champ ajouté par migration `1700000001`).
4. L'apprenant charge directement `compiledTargets` — il ne recompile jamais.

Raison du merge : MindAR ne charge qu'un seul `.mind` par runtime. Le champ `targets.compiledTarget` (par-target) existe encore au schéma mais c'est `experiences.compiledTargets` qui sert au runtime apprenant.

## Modèle de données PocketBase (≠ PRD)

Hiérarchie **réelle, plus plate que le PRD** : `users → experiences → targets → ar_contents`. **Pas** de collections `organizations`, `projects`, `quizzes`, `media`. Le schéma est défini en code dans `server/pocketbase/pb_migrations/*.js` (migrations JS appliquées au démarrage du container) — c'est la source de vérité du schéma, pas le PRD section 12.

Points clés :
- `experiences.slug` (unique, `^[a-z0-9][a-z0-9-]*$`) = identifiant public dans `/e/:slug`.
- `experiences.compiledTargets` = le `.mind` mergé runtime (voir ci-dessus).
- `ar_contents.type` ∈ `text | image | model3d | embed | info`. Le type `info` a **remplacé `h5p`** (migration `1700000002`) : il stocke du HTML riche (Quill) dans `body`, rendu en carte AR. Tout H5P est abandonné.
- `ar_contents` porte la transfo 3D (`position/rotation/scale` XYZ — rotations en **degrés** en base, converties en radians au build) et `actionType` (`none | open_modal | open_url | next_step`).

**Règles d'accès** : pas de modèle de rôles `admin/editor/viewer` appliqué. L'accès en écriture est scopé par `createdBy = @request.auth.id` (chaque éditeur ne voit/modifie que ses propres expériences et leurs enfants). Le **self-register est ouvert** (`users.createRule = ""`). Le public lit **uniquement** les ressources d'expériences `status='published' && isPublic=true` (+ `isActive`/`isVisible` pour targets/contents). Le champ `users.role` existe mais n'est pas utilisé pour l'autorisation.

> Modifier le schéma = écrire une **nouvelle** migration JS horodatée dans `pb_migrations/`, jamais éditer une migration déjà appliquée. Quirk PocketBase : muter les `SchemaField` en place (ne pas les spread — ça casse le marshaling Go), cf. commentaires des migrations existantes.

## Écarts par rapport au PRD (à connaître avant d'invoquer le PRD)

| Sujet | PRD | Implémentation réelle |
|---|---|---|
| Structure front | un seul `frontend/src/` avec adapters | deux apps séparées `editor/` + `apprenant/` (+ `phase0/`) |
| Hiérarchie données | organizations→projects→experiences→… | users→experiences→targets→ar_contents |
| Autorisation | rôles admin/editor/viewer | scope `createdBy`, self-register ouvert |
| Éditeur HTML riche | TipTap | **Quill 2** |
| Compilation `.mind` | manuelle / service externe | **in-browser à la publication**, mergée |
| Contenu interactif | quiz / H5P | type `info` (HTML Quill) ; H5P supprimé |
| Tests | Playwright + Lighthouse | aucun test installé |

## Contraintes WebAR (toujours valables)

- **HTTPS obligatoire** pour la caméra (donc pas de `http://` sauf `localhost` ; d'où le SSL auto en dev apprenant et l'exigence d'exposer PB en HTTPS — sinon mixed-content).
- **iOS Safari** : audio/vidéo bloqués sans interaction utilisateur → toujours requérir un tap avant lecture.
- Le flux caméra **ne doit jamais** être envoyé au serveur.
- HTML utilisateur (`info`) doit être **sanitizé** avant rendu. Le sanitizer actuel (`sanitizeHtml` dans `buildArContent.ts`) est volontairement minimal et **niveau POC** — le remplacer par DOMPurify avant prod sérieuse.
- Cibles perf : chargement < 5 s, détection target < 2 s.

## Déploiement

Voir [MiseEnProd.md](MiseEnProd.md) (procédure home lab via Cloudflare Tunnel, pas à pas). Reverse proxy/TLS gérés **hors repo** par cloudflared ; les services internes restent en HTTP. `server/pocketbase/pb_data` est le seul état à sauvegarder (volume monté). Le déploiement cible 3 sous-domaines + PB exposé en HTTPS séparé ; `insitu.*` (landing) et `insituplay.*` (apprenant) pointent vers **le même container** `apprenant`.

## Périmètre

`PocketBase 0.22.21` est **figé** — ne pas mettre à jour sans validation. La stack doit rester open source / self-hostable (pas de SaaS propriétaire). Pour le hors-MVP (multi-temps-réel, géoloc, SLAM, occlusion, app native, SCORM/xAPI, LMS, stats avancées), voir PRD section 4 — ne pas implémenter sauf demande explicite.
