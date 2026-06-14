# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## État du projet

Le repository ne contient pour l'instant **que le PRD** ([PRD_InSitu_AR_Learning.md](PRD_InSitu_AR_Learning.md)) — aucun code n'a encore été écrit. Le PRD est la source de vérité pour toutes les décisions produit et techniques tant que le code n'existe pas. Toute implémentation doit être faite en cohérence avec ses sections, et toute déviation doit être discutée avant d'être mise en œuvre.

Nom de travail : **InSitu AR Learning** — plateforme WebAR de formation en situation réelle où l'utilisateur scanne une image cible (affiche, machine, panneau…) et voit du contenu pédagogique superposé en AR, sans installer d'app native.

## Stack imposée

- **Frontend** : Vite + React + TypeScript + Tailwind CSS
- **Rendu 3D** : Three.js
- **Tracking AR** : **MindAR** en priorité (image tracking). AR.js gardé comme fallback uniquement si MindAR pose problème. ARUCO/markers carrés sont explicitement **exclus**.
- **Backend** : **PocketBase 0.22.21** (version figée — ne pas mettre à jour sans validation), SQLite intégré, fichiers gérés par PocketBase
- **Déploiement** : Docker + Docker Compose, reverse proxy (Caddy/Traefik) pour HTTPS
- **Package manager** : pnpm
- **Outils** : ESLint, Prettier, Playwright (tests), Lighthouse (perf)
- **Contrainte transverse** : stack open source autant que possible, self-hosting complet, **pas de dépendance SaaS propriétaire**.

Pour l'UI éditeur : React Hook Form + Zod, TanStack Query, Zustand (ou Jotai), TipTap pour le HTML simple, lib QRCode.

## Architecture cible

Trois composants indépendants :

```
[Apprenant mobile] --HTTPS--> [Frontend WebAR public] --SDK--> [PocketBase 0.22.21] --> SQLite + pb_data
[Éditeur]         --HTTPS--> [Frontend éditeur]      --SDK--> [PocketBase 0.22.21]
```

- **Frontend public** : consultable par URL `/e/:slug`. Charge l'expérience depuis PocketBase, initialise MindAR + Three.js, ancre les contenus sur les targets détectées.
- **Frontend éditeur** : routes `/admin/*`, CRUD projets → expériences → targets → ar_contents, upload médias, publication.
- **PocketBase** : auth, collections, fichiers, règles d'accès. Volume Docker `pb_data` à monter pour persistance.

Le PRD section 15 propose une organisation `frontend/src/` avec séparation claire `ar/` (moteur AR — `MindArAdapter`, `ArJsAdapter`, `TargetManager`, `ContentRenderer`), `editor/`, `publicExperience/`, `services/` (avec `pocketbase.ts`), `types/`, `utils/`. Cette structure suppose que **MindAR est isolé derrière un adapter** pour pouvoir basculer vers AR.js si nécessaire — respecter cette indirection.

## Modèle de données (PocketBase)

Hiérarchie : `organizations` → `projects` → `experiences` → `targets` → `ar_contents` (+ `quizzes`/`quiz_answers` pour les QCM, `media` pour la bibliothèque). Le schéma complet est dans la section 12 du PRD.

Points clés :
- `experiences.slug` est unique et sert d'identifiant public dans l'URL.
- `experiences.trackingEngine` (`mindar`|`arjs`) est stocké en base — le frontend doit choisir l'adapter en conséquence.
- `targets.compiledTarget` stocke le fichier `.mind` compilé (voir section suivante).
- `ar_contents` porte toute la transformation 3D (position/rotation/scale XYZ) + le style du panneau + l'action au clic.

Règles d'accès (section 13) : le public peut **uniquement lire** les expériences `status='published' && isPublic=true` et les ressources associées. Toute écriture passe par un utilisateur authentifié dont le rôle (`admin`/`editor`/`viewer`) est dans le champ utilisateur.

## Pipeline MindAR (point sensible)

MindAR nécessite un **fichier `.mind` compilé** à partir de l'image source. Pour le MVP, la compilation est **manuelle ou semi-automatique** côté éditeur (le fichier est uploadé dans `targets.compiledTarget`). Pour la V2, un service Node de compilation séparé est prévu (section 35). Ne pas chercher à intégrer la compilation dans PocketBase — c'est un service à part.

## Ordre d'implémentation recommandé

Le PRD insiste explicitement (sections 34 et 40) sur cet ordre, à respecter sauf instruction contraire :

1. **Prototype tracking nu** : Vite + TS + Three.js + MindAR + 1 image target compilée à la main + 1 panneau codé en dur. Tester sur Android **et** iOS réel.
2. Brancher PocketBase et charger l'expérience dynamiquement.
3. Construire l'éditeur back-office.
4. Automatiser la compilation des targets.

**Raison** : le risque principal est la qualité du tracking WebAR sur appareils réels, pas le backend. Valider terrain avant de construire l'éditeur.

## Contraintes WebAR à garder en tête

- **HTTPS obligatoire** pour l'accès caméra (donc pas de test sur `http://` sauf `localhost`).
- **iOS Safari** : autoplay vidéo limité, audio bloqué sans interaction utilisateur préalable → toujours requérir un tap avant audio/vidéo, prévoir un fallback HTML.
- **Android Chrome** : sélection caméra parfois capricieuse, fragmentation perf.
- Cibles perf : chargement < 5 s, détection target < 2 s en bonnes conditions.
- Le flux caméra **ne doit jamais être envoyé au serveur** ni enregistré.
- HTML utilisateur (contenus type `html`) doit être **sanitizé** avant rendu.

## Routes publiques attendues

```
/                         accueil optionnelle
/e/:slug                  expérience AR publique
/e/:slug/help             aide
/e/:slug/complete         fin
/admin/login              éditeur
/admin/dashboard
/admin/projects/:id
/admin/experiences/:id/{targets,contents}
/admin/media
```

## Variables d'environnement

```env
VITE_POCKETBASE_URL=https://pb.example.com
VITE_PUBLIC_APP_URL=https://ar.example.com
VITE_ADMIN_APP_URL=https://admin-ar.example.com
```

## Définition de MVP terminé

Voir section 39 du PRD — 14 critères concrets allant de « PocketBase tourne en Docker » à « les données survivent à un redémarrage Docker ». Référer à cette section pour juger si une fonctionnalité est dans ou hors MVP avant de l'implémenter.

## Hors MVP (ne pas implémenter sauf demande explicite)

Multi-utilisateur temps réel, géoloc AR, SLAM, occlusion, reconnaissance 3D d'objets, tracking spatial persistant, app native, éditeur 3D visuel complet, SCORM/xAPI complet, LMS, stats avancées. Ces éléments sont listés section 4 du PRD et peuvent revenir en V2 (section 32 — roadmap par phases).
