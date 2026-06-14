# PRD - Application WebAR d’In Situ Learning avec éditeur PocketBase

## 1. Résumé du projet

### Nom de travail
InSitu AR Learning

### Objectif
Créer une application de formation en situation réelle utilisant la réalité augmentée dans le navigateur.

L’utilisateur scanne une image cible placée dans un lieu réel, par exemple une affiche, une machine, un panneau, une œuvre, un outil ou un élément de décor. L’application reconnaît cette image et affiche du contenu pédagogique directement en réalité augmentée.

L’application doit fonctionner en WebAR, sans application native à installer, avec une interface d’édition permettant de créer et gérer les contenus.

### Stack souhaitée
- Frontend WebAR : Three.js
- Tracking AR : MindAR en priorité
- Alternative tracking : AR.js image tracking si besoin
- Backend : PocketBase 0.22.21
- Hébergement : Docker sur home lab
- Base de données : SQLite intégrée à PocketBase
- Stockage médias : fichiers PocketBase
- Éditeur : back-office web connecté à PocketBase
- Authentification : PocketBase Auth
- Déploiement : Docker Compose
- Objectif : stack open source autant que possible

---

## 2. Vision produit

L’application doit permettre à une organisation de créer des expériences de formation contextualisées.

Exemples :
- Formation sécurité devant une machine
- Explication d’un poste de travail
- Parcours pédagogique dans un musée ou un centre de formation
- Assistance in situ pour maintenance
- Guide interactif dans un lieu physique
- Micro-learning par image target

L’utilisateur ne doit pas avoir besoin de télécharger une app. Il ouvre une URL ou scanne un QR code, autorise la caméra, puis pointe son smartphone ou sa tablette vers une image cible.

Quand l’image est reconnue, une couche AR apparaît avec :
- texte
- image
- vidéo
- modèle 3D
- bouton
- quiz
- fiche HTML
- consigne interactive
- lien vers une étape suivante

---

## 3. Objectifs principaux

### Objectifs utilisateur final
- Accéder rapidement à une expérience AR depuis une URL
- Scanner une image target
- Voir du contenu superposé au monde réel
- Lire une information claire
- Suivre un parcours pédagogique
- Répondre à des quiz simples
- Reprendre une expérience même après interruption

### Objectifs administrateur
- Créer une expérience
- Importer une ou plusieurs images targets
- Associer du contenu pédagogique à chaque image target
- Positionner les éléments AR
- Prévisualiser le rendu
- Publier ou dépublier une expérience
- Organiser les contenus par projet, lieu, parcours ou module
- Gérer les médias
- Gérer les utilisateurs éditeurs

### Objectifs techniques
- Fonctionner sur navigateur mobile moderne
- Utiliser la caméra du smartphone ou de la tablette
- Ne pas dépendre d’un service SaaS propriétaire
- Permettre un self-hosting complet
- Utiliser PocketBase 0.22.21 dans Docker
- Pouvoir exporter ou sauvegarder facilement les données
- Garder une architecture simple, maintenable et évolutive

---

## 4. Périmètre MVP

### Inclus dans le MVP
- Application WebAR responsive
- Reconnaissance d’image target
- Affichage AR avec Three.js
- Éditeur web simple
- Authentification éditeur
- Gestion des projets
- Gestion des expériences
- Upload des images targets
- Upload des médias
- Création de panneaux AR
- Contenus de type texte, image, vidéo, bouton et HTML simple
- Prévisualisation web
- Publication d’une expérience
- URL publique par expérience
- QR code d’accès à une expérience
- Backend PocketBase self-hosté
- Docker Compose pour le déploiement

### Exclu du MVP
- Multi-utilisateur temps réel
- Géolocalisation AR
- SLAM avancé
- Occlusion réelle
- Reconnaissance 3D d’objets
- Tracking spatial persistant
- Application native iOS ou Android
- Éditeur 3D complet type Unity Editor
- Statistiques avancées
- SCORM complet
- LMS complet

---

## 5. Utilisateurs cibles

### Apprenant
Personne qui consulte l’expérience AR sur site.

Besoins :
- Interface simple
- Chargement rapide
- Instructions claires
- Bouton d’aide si l’image n’est pas reconnue
- Contenu lisible en environnement réel

### Éditeur
Personne qui crée les contenus.

Besoins :
- Créer un parcours sans coder
- Uploader les images targets
- Ajouter des contenus multimédias
- Positionner les panneaux AR
- Prévisualiser
- Publier

### Administrateur technique
Personne qui héberge et maintient le système.

Besoins :
- Installation Docker simple
- Sauvegarde des données
- Logs accessibles
- Mise à jour maîtrisée
- Configuration claire

---

## 6. Cas d’usage principaux

### UC1 - Consulter une expérience AR
1. L’utilisateur scanne un QR code ou ouvre une URL.
2. La page charge l’expérience.
3. L’utilisateur autorise l’accès caméra.
4. Une instruction apparaît : "Cadrez l’image cible".
5. L’image cible est reconnue.
6. Le contenu AR apparaît.
7. L’utilisateur interagit avec les éléments affichés.
8. L’utilisateur termine l’étape ou passe à la suite.

### UC2 - Créer une expérience
1. L’éditeur se connecte.
2. Il crée un projet.
3. Il crée une expérience.
4. Il ajoute une image target.
5. Il ajoute un ou plusieurs contenus AR.
6. Il configure la position et l’apparence.
7. Il prévisualise.
8. Il publie.

### UC3 - Modifier une expérience publiée
1. L’éditeur ouvre une expérience existante.
2. Il modifie le contenu.
3. Il prévisualise.
4. Il republie.
5. La version publique est mise à jour.

### UC4 - Créer un parcours multi-étapes
1. L’éditeur crée plusieurs targets dans une expérience.
2. Chaque target correspond à une étape.
3. L’apprenant doit scanner les images dans un ordre défini ou libre.
4. L’application enregistre la progression locale.
5. L’utilisateur voit son avancement.

---

## 7. Architecture générale

```text
[Utilisateur mobile]
       |
       | HTTPS
       v
[Frontend WebAR]
       |
       | PocketBase JS SDK
       v
[PocketBase 0.22.21]
       |
       | SQLite + fichiers
       v
[pb_data volume Docker]
```

### Frontend public
Application consultée par les apprenants.

Rôles :
- Charger la configuration de l’expérience depuis PocketBase
- Charger les targets AR
- Initialiser la caméra
- Initialiser MindAR
- Initialiser Three.js
- Afficher les objets AR
- Gérer les interactions utilisateur
- Gérer la progression locale

### Frontend éditeur
Application réservée aux éditeurs.

Rôles :
- Connexion
- CRUD projets
- CRUD expériences
- CRUD targets
- CRUD contenus AR
- Upload médias
- Prévisualisation
- Publication

### Backend PocketBase
Rôles :
- Authentification
- Base de données
- Stockage fichiers
- API REST
- API temps réel si besoin
- Gestion des collections
- Gestion des règles d’accès

---

## 8. Choix du moteur WebAR

### Option recommandée pour le MVP
MindAR + Three.js

Raisons :
- Open source
- Support de l’image tracking
- Fonctionne dans le navigateur
- Compatible Three.js
- Plus adapté au besoin image target qu’ARUCO
- Permet une expérience sans marqueur carré visible

### Alternative possible
AR.js image tracking

Raisons :
- Open source
- Connu dans l’écosystème WebAR
- Compatible image tracking
- Peut être testé comme fallback si MindAR pose problème

### Choix non prioritaire
ARUCO ou marker carré.

Raison :
- Moins esthétique
- Moins naturel pour du in situ learning
- Plus adapté à du prototypage ou à des usages techniques
- Moins pertinent pour une expérience pédagogique intégrée dans un lieu réel

---

## 9. Images targets

### Principe
Une image target est une image réelle que le moteur AR peut reconnaître.

Exemples :
- Affiche pédagogique
- Photo d’une machine
- Panneau de salle
- Illustration imprimée
- Carte
- Page d’un livret
- Visuel de poste de travail

### Contraintes de qualité
Les images targets doivent :
- Avoir beaucoup de détails visuels
- Avoir des contrastes suffisants
- Éviter les aplats de couleur
- Éviter les motifs trop répétitifs
- Être stables physiquement
- Être bien éclairées
- Être imprimées avec une bonne qualité
- Ne pas être trop réfléchissantes

### Workflow target
1. L’éditeur upload une image.
2. Le système génère ou stocke le fichier target compatible MindAR.
3. L’image est associée à une expérience.
4. Le frontend WebAR charge le fichier target.
5. La caméra détecte l’image.
6. Le contenu AR attaché à cette image s’affiche.

### Point technique important
MindAR utilise un fichier compilé pour les targets.

Deux possibilités :
- Compilation locale côté développeur au moment de la création des assets
- Compilation côté serveur via script Node dédié

Pour le MVP, la compilation peut être faite manuellement ou semi-automatiquement.
Pour la V2, elle doit être intégrée dans le back-office.

---

## 10. Fonctionnalités frontend WebAR

### Écran de chargement
- Logo
- Nom de l’expérience
- Indicateur de chargement
- Vérification compatibilité navigateur
- Message si caméra non disponible

### Écran de permission caméra
- Explication claire
- Bouton "Autoriser la caméra"
- Message d’aide si l’autorisation est refusée

### Mode scan
- Flux caméra plein écran
- Instruction courte
- Cadre visuel pour aider à viser l’image
- Bouton aide
- Bouton retour
- Bouton plein écran si disponible

### Mode AR
Quand une target est reconnue :
- Affichage des contenus 3D ou panneaux
- Ancrage sur l’image target
- Suivi temps réel
- Animation d’apparition
- Interactions tactiles

### États de tracking
- Target non détectée
- Target détectée
- Target perdue
- Tracking instable
- Contenu terminé

### Contenus supportés MVP
- Texte
- Image
- Vidéo
- Bouton
- HTML simple
- Panneau info
- Quiz QCM simple

### Contenus supportés V2
- Audio
- Modèle 3D GLB
- Animation GLTF
- Carrousel
- Étapes conditionnelles
- Mini-jeux
- Intégration SCORM ou xAPI
- Formulaire
- Feedback IA optionnel

---

## 11. Éditeur back-office

### Objectif
Permettre à un éditeur non développeur de créer une expérience WebAR.

### Pages principales
- Login
- Dashboard
- Projets
- Expériences
- Targets
- Contenus AR
- Médias
- Prévisualisation
- Paramètres
- Publication

### Dashboard
Affiche :
- Liste des projets
- Expériences récentes
- Expériences publiées
- Brouillons
- Accès rapide création

### Page projet
Champs :
- Titre
- Description
- Client ou lieu
- Langue par défaut
- Statut
- Liste des expériences liées

### Page expérience
Champs :
- Titre
- Slug
- Description
- Projet lié
- Statut : draft, published, archived
- Image de couverture
- Langue par défaut
- Mode parcours : libre ou séquentiel
- Liste des targets
- URL publique
- QR code

### Page target
Champs :
- Nom
- Image source
- Fichier target compilé
- Largeur physique approximative
- Ordre dans le parcours
- Statut actif ou inactif
- Contenus liés

### Page contenu AR
Champs :
- Target liée
- Type de contenu
- Titre
- Corps
- Média lié
- Position X Y Z
- Rotation X Y Z
- Scale X Y Z
- Largeur panneau
- Hauteur panneau
- Couleur fond
- Couleur texte
- Animation d’entrée
- Action au clic
- Ordre d’affichage

### Prévisualisation
L’éditeur peut :
- Voir la liste des targets
- Ouvrir une simulation 2D
- Ouvrir une prévisualisation AR sur mobile via QR code
- Tester les contenus avant publication

---

## 12. Modèle de données PocketBase

### Collection users
Collection native PocketBase.

Rôles possibles :
- admin
- editor
- viewer

Champs additionnels recommandés :
- name
- role
- organization

### Collection organizations

```json
{
  "name": "string",
  "description": "text",
  "logo": "file",
  "createdBy": "relation users",
  "created": "datetime",
  "updated": "datetime"
}
```

### Collection projects

```json
{
  "organization": "relation organizations",
  "title": "string",
  "description": "text",
  "cover": "file",
  "defaultLanguage": "select",
  "status": "select: draft, active, archived",
  "createdBy": "relation users",
  "created": "datetime",
  "updated": "datetime"
}
```

### Collection experiences

```json
{
  "project": "relation projects",
  "title": "string",
  "slug": "string unique",
  "description": "text",
  "cover": "file",
  "status": "select: draft, published, archived",
  "defaultLanguage": "select: fr, en, de, lu",
  "trackingEngine": "select: mindar, arjs",
  "navigationMode": "select: free, sequential",
  "isPublic": "bool",
  "publishedAt": "datetime",
  "createdBy": "relation users",
  "created": "datetime",
  "updated": "datetime"
}
```

### Collection targets

```json
{
  "experience": "relation experiences",
  "name": "string",
  "description": "text",
  "sourceImage": "file",
  "compiledTarget": "file",
  "physicalWidthCm": "number",
  "order": "number",
  "isActive": "bool",
  "trackingQualityNote": "number",
  "created": "datetime",
  "updated": "datetime"
}
```

### Collection ar_contents

```json
{
  "experience": "relation experiences",
  "target": "relation targets",
  "type": "select: text, image, video, html, button, quiz, model3d",
  "title": "string",
  "body": "text",
  "html": "editor",
  "media": "file",
  "model3d": "file",
  "positionX": "number",
  "positionY": "number",
  "positionZ": "number",
  "rotationX": "number",
  "rotationY": "number",
  "rotationZ": "number",
  "scaleX": "number",
  "scaleY": "number",
  "scaleZ": "number",
  "width": "number",
  "height": "number",
  "backgroundColor": "string",
  "textColor": "string",
  "animation": "select: none, fade, scale, slide",
  "actionType": "select: none, open_url, next_step, open_modal, validate",
  "actionValue": "string",
  "order": "number",
  "isVisible": "bool",
  "created": "datetime",
  "updated": "datetime"
}
```

### Collection quizzes

```json
{
  "content": "relation ar_contents",
  "question": "text",
  "explanation": "text",
  "created": "datetime",
  "updated": "datetime"
}
```

### Collection quiz_answers

```json
{
  "quiz": "relation quizzes",
  "label": "string",
  "isCorrect": "bool",
  "feedback": "text",
  "order": "number"
}
```

### Collection media

```json
{
  "project": "relation projects",
  "title": "string",
  "file": "file",
  "type": "select: image, video, audio, model3d, document",
  "altText": "string",
  "createdBy": "relation users",
  "created": "datetime",
  "updated": "datetime"
}
```

### Collection sessions
Pour une V2 avec suivi léger.

```json
{
  "experience": "relation experiences",
  "anonymousId": "string",
  "startedAt": "datetime",
  "finishedAt": "datetime",
  "progress": "json",
  "score": "number"
}
```

### Collection events
Pour analytics V2.

```json
{
  "session": "relation sessions",
  "experience": "relation experiences",
  "target": "relation targets",
  "eventType": "select: start, target_found, target_lost, content_opened, quiz_answered, completed",
  "payload": "json",
  "created": "datetime"
}
```

---

## 13. Règles d’accès PocketBase

### Public
Peut lire :
- experiences publiées
- targets actives liées à une expérience publiée
- ar_contents visibles liés à une expérience publiée
- médias utilisés dans une expérience publiée

Ne peut pas :
- créer
- modifier
- supprimer

### Editor
Peut :
- créer et modifier ses projets
- créer et modifier ses expériences
- uploader des médias
- publier ou dépublier selon son rôle

Ne peut pas :
- modifier les projets d’une autre organisation
- modifier les utilisateurs admin

### Admin
Peut :
- tout gérer
- créer des utilisateurs
- gérer les organisations
- archiver ou supprimer

---

## 14. API frontend

### Charger une expérience publique

```http
GET /api/collections/experiences/records?filter=(slug='demo' && status='published' && isPublic=true)
```

### Charger les targets

```http
GET /api/collections/targets/records?filter=(experience='EXPERIENCE_ID' && isActive=true)&sort=order
```

### Charger les contenus AR

```http
GET /api/collections/ar_contents/records?filter=(experience='EXPERIENCE_ID' && isVisible=true)&sort=order
```

### Charger les réponses d’un quiz

```http
GET /api/collections/quiz_answers/records?filter=(quiz='QUIZ_ID')&sort=order
```

---

## 15. Structure frontend recommandée

```text
frontend/
  src/
    app/
      main.ts
      router.ts
    ar/
      ArExperience.ts
      MindArAdapter.ts
      ArJsAdapter.ts
      TargetManager.ts
      ContentRenderer.ts
      TrackingState.ts
    editor/
      pages/
        LoginPage.tsx
        DashboardPage.tsx
        ProjectsPage.tsx
        ExperienceEditPage.tsx
        TargetEditPage.tsx
        ContentEditPage.tsx
        MediaLibraryPage.tsx
      components/
        FormInput.tsx
        FileUpload.tsx
        ContentPositionEditor.tsx
        PreviewPanel.tsx
    publicExperience/
      PublicExperiencePage.tsx
      CameraPermissionView.tsx
      ScanView.tsx
      ArView.tsx
      HelpModal.tsx
    services/
      pocketbase.ts
      experienceService.ts
      mediaService.ts
      authService.ts
    types/
      Experience.ts
      Target.ts
      ArContent.ts
      Quiz.ts
    utils/
      qrCode.ts
      deviceSupport.ts
      assetUrl.ts
```

---

## 16. Stack frontend proposée

### Core
- Vite
- TypeScript
- React
- Three.js
- MindAR
- PocketBase JS SDK

### UI éditeur
- Tailwind CSS
- React Hook Form
- Zod
- TanStack Query
- Zustand ou Jotai
- TipTap pour édition HTML simple
- QRCode library pour générer les QR codes

### Rendu AR
- Three.js scene
- MindAR image target
- CSS2DRenderer ou HTML overlay si besoin
- GLTFLoader pour modèles 3D V2
- VideoTexture pour vidéos V2

---

## 17. Fonctionnement WebAR

### Initialisation
1. Charger l’expérience depuis PocketBase.
2. Charger le fichier target compilé.
3. Initialiser MindAR avec le fichier target.
4. Créer une scène Three.js.
5. Créer une caméra.
6. Créer un renderer WebGL transparent.
7. Ajouter un anchor par target.
8. Ajouter les contenus liés à chaque target.
9. Démarrer la caméra.
10. Écouter les événements targetFound et targetLost.

### Exemple de logique

```ts
const experience = await loadExperience(slug);
const targets = await loadTargets(experience.id);
const contents = await loadContents(experience.id);

const mindar = new MindARThree({
  container: document.body,
  imageTargetSrc: targets[0].compiledTargetUrl,
});

const { renderer, scene, camera } = mindar;

targets.forEach((target, index) => {
  const anchor = mindar.addAnchor(index);
  const targetContents = contents.filter(c => c.target === target.id);

  targetContents.forEach(content => {
    const object3d = createObjectFromContent(content);
    anchor.group.add(object3d);
  });

  anchor.onTargetFound = () => {
    showTrackingState("found");
  };

  anchor.onTargetLost = () => {
    showTrackingState("lost");
  };
});

await mindar.start();

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
```

---

## 18. Types de contenus AR

### Texte
Affiche une carte avec titre et corps.

Paramètres :
- titre
- texte
- position
- taille
- couleur
- animation

### Image
Affiche une image dans l’espace AR.

Paramètres :
- fichier image
- position
- taille
- rotation
- action au clic

### Vidéo
Affiche une vidéo sur un plan.

Paramètres :
- fichier vidéo
- autoplay
- loop
- bouton play
- mute par défaut

### HTML simple
Affiche un panneau riche.

Paramètres :
- contenu HTML nettoyé
- taille
- scroll interne optionnel
- style limité

Important :
Le HTML doit être sanitizé pour éviter les injections.

### Bouton
Déclenche une action.

Actions :
- ouvrir une URL
- ouvrir une modale
- passer à l’étape suivante
- valider une étape
- afficher un autre contenu

### Quiz QCM
Affiche une question et plusieurs réponses.

Fonctionnement :
- L’utilisateur choisit une réponse.
- Le système indique correct ou incorrect.
- Une explication s’affiche.
- La progression locale est mise à jour.

### Modèle 3D V2
Affiche un fichier GLB.

Paramètres :
- fichier GLB
- position
- rotation
- scale
- animation
- interaction simple

---

## 19. Éditeur de position AR

### MVP
Édition numérique simple :
- Position X
- Position Y
- Position Z
- Rotation X
- Rotation Y
- Rotation Z
- Scale X
- Scale Y
- Scale Z

### V2
Éditeur visuel :
- Drag and drop sur une prévisualisation
- Gizmo de déplacement
- Gizmo de rotation
- Prévisualisation sur image target
- Sauvegarde automatique

---

## 20. Gestion multilingue

### MVP
Une langue par expérience.

### V2
Contenus traduisibles.

Approche :
- Ajouter un champ `locale`
- Ou créer une collection `ar_content_translations`

Exemple V2 :

```json
{
  "content": "relation ar_contents",
  "locale": "select: fr, en, de, lu",
  "title": "string",
  "body": "text",
  "html": "editor"
}
```

---

## 21. Sécurité

### Caméra
- Demander explicitement l’autorisation
- Expliquer pourquoi la caméra est nécessaire
- Ne pas enregistrer le flux vidéo
- Ne pas envoyer les images caméra au serveur

### Authentification
- Back-office protégé par PocketBase Auth
- Règles d’accès strictes
- Pas d’édition publique

### Upload fichiers
- Limiter les extensions autorisées
- Limiter la taille
- Nettoyer les noms de fichiers
- Contrôler les fichiers HTML
- Sanitizer les contenus riches

### HTTPS
Obligatoire pour :
- accès caméra
- sécurité
- PWA éventuelle
- compatibilité mobile

---

## 22. Contraintes techniques WebAR

### Navigateurs cibles
- Chrome Android
- Safari iOS récent
- Chrome desktop pour tests
- Edge Chromium

### Contraintes iOS
- HTTPS obligatoire
- Permission caméra sensible
- Autoplay vidéo limité
- Audio souvent bloqué sans interaction utilisateur
- Performances variables selon modèle

### Contraintes Android
- Fragmentation des performances
- Caméras multiples parfois mal sélectionnées
- WebView intégrée possible mais à tester

### Performance
Objectif :
- Chargement initial inférieur à 5 secondes sur bonne connexion
- Assets optimisés
- Images compressées
- Modèles 3D légers
- Vidéos courtes
- Lazy loading des contenus non nécessaires

---

## 23. Déploiement Docker

### Structure serveur

```text
server/
  docker-compose.yml
  pocketbase/
    Dockerfile
    pb_data/
    pb_migrations/
```

### Dockerfile PocketBase 0.22.21

```dockerfile
FROM alpine:latest

ARG PB_VERSION=0.22.21

RUN apk add --no-cache \
    unzip \
    ca-certificates \
    wget

WORKDIR /pb

RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip \
    && chmod +x /pb/pocketbase

EXPOSE 8090

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
```

### docker-compose.yml

```yaml
services:
  pocketbase:
    build:
      context: ./pocketbase
      args:
        PB_VERSION: 0.22.21
    container_name: insitu-pocketbase
    restart: unless-stopped
    ports:
      - "8090:8090"
    volumes:
      - ./pocketbase/pb_data:/pb/pb_data
      - ./pocketbase/pb_migrations:/pb/pb_migrations
```

### Reverse proxy recommandé
Utiliser un reverse proxy pour HTTPS :
- Caddy
- Traefik
- Nginx Proxy Manager

Exemple recommandé :

```text
https://ar.example.com       -> frontend public
https://admin-ar.example.com -> frontend éditeur
https://pb.example.com       -> PocketBase
```

---

## 24. Sauvegarde

### Données à sauvegarder
- pb_data
- pb_migrations
- fichiers uploadés
- configuration Docker
- variables d’environnement

### Fréquence
- Sauvegarde quotidienne automatique
- Rétention 7 jours minimum
- Export manuel avant mise à jour

### Exemple simple

```bash
tar -czf backup-pocketbase-$(date +%Y-%m-%d).tar.gz ./pocketbase/pb_data ./pocketbase/pb_migrations
```

---

## 25. Variables d’environnement frontend

```env
VITE_POCKETBASE_URL=https://pb.example.com
VITE_PUBLIC_APP_URL=https://ar.example.com
VITE_ADMIN_APP_URL=https://admin-ar.example.com
```

---

## 26. Routes frontend

### Routes publiques

```text
/                         Page d’accueil optionnelle
/e/:slug                  Expérience AR publique
/e/:slug/help             Aide
/e/:slug/complete         Fin d’expérience
```

### Routes éditeur

```text
/admin/login
/admin/dashboard
/admin/projects
/admin/projects/:id
/admin/experiences/:id
/admin/experiences/:id/targets
/admin/experiences/:id/contents
/admin/media
/admin/settings
```

---

## 27. Parcours utilisateur public

### Étape 1
L’utilisateur scanne un QR code affiché dans le lieu réel.

### Étape 2
La page WebAR s’ouvre.

### Étape 3
L’utilisateur lit une courte consigne.

### Étape 4
L’utilisateur autorise la caméra.

### Étape 5
L’application affiche le mode scan.

### Étape 6
L’utilisateur cadre l’image target.

### Étape 7
Le contenu AR apparaît.

### Étape 8
L’utilisateur lit, observe ou répond.

### Étape 9
L’application indique la progression.

### Étape 10
L’utilisateur termine l’expérience.

---

## 28. UI publique

### Principes
- Très peu de boutons
- Texte court
- Fort contraste
- Compatible mobile
- Lisible en extérieur
- Pas de surcharge visuelle

### Composants
- Loader
- Bouton autoriser caméra
- Overlay scan
- Badge tracking
- Panneau contenu
- Bouton aide
- Bouton fermer
- Bouton suivant
- Quiz card
- Écran de fin

---

## 29. UI éditeur

### Principes
- Simple
- Formulaires clairs
- Prévisualisation fréquente
- Pas besoin de connaissance technique
- Messages d’erreur compréhensibles

### Composants
- Sidebar
- Liste de projets
- Liste d’expériences
- Formulaire expérience
- Upload image target
- Upload média
- Liste des contenus
- Formulaire contenu
- Prévisualisation target
- QR code public
- Bouton publier

---

## 30. Critères d’acceptation MVP

### Expérience publique
- L’utilisateur peut ouvrir une expérience via URL.
- L’utilisateur peut autoriser la caméra.
- L’application détecte au moins une image target.
- Un contenu texte apparaît en AR.
- Un contenu image apparaît en AR.
- Un bouton peut déclencher une action.
- Un quiz simple peut être complété.
- L’expérience fonctionne sur Android Chrome.
- L’expérience fonctionne sur iOS Safari récent.

### Back-office
- Un éditeur peut se connecter.
- Un éditeur peut créer un projet.
- Un éditeur peut créer une expérience.
- Un éditeur peut uploader une image target.
- Un éditeur peut créer un contenu AR.
- Un éditeur peut publier l’expérience.
- Un QR code public est généré.

### Backend
- PocketBase tourne dans Docker.
- Les données persistent via volume.
- Les fichiers uploadés sont accessibles.
- Les règles d’accès empêchent l’édition publique.
- Les expériences publiées sont lisibles publiquement.

---

## 31. Risques techniques

### Risque 1 : tracking instable
Cause :
- Image target peu détaillée
- Mauvais éclairage
- Reflets
- Caméra de mauvaise qualité

Réduction :
- Ajouter un score qualité target
- Donner des recommandations à l’éditeur
- Tester chaque target avant publication

### Risque 2 : performances faibles
Cause :
- Trop d’objets 3D
- Vidéos lourdes
- Images non optimisées

Réduction :
- Compression automatique
- Limite de taille média
- Lazy loading
- Modèles GLB légers

### Risque 3 : compatibilité iOS
Cause :
- Restrictions Safari
- Permissions caméra
- Autoplay vidéo

Réduction :
- Tester tôt sur iPhone
- Prévoir interactions utilisateur avant audio vidéo
- Garder un mode fallback HTML

### Risque 4 : compilation des image targets
Cause :
- Pipeline MindAR pas intégré au back-office

Réduction :
- MVP semi-manuel
- V2 avec service Node de compilation
- Documentation interne claire

### Risque 5 : home lab indisponible
Cause :
- Coupure réseau
- DNS
- Reverse proxy
- Certificat SSL

Réduction :
- Monitoring simple
- Sauvegarde
- Certificats automatiques avec Caddy ou Traefik
- Page de statut optionnelle

---

## 32. Roadmap

### Phase 0 - Prototype technique
Objectif :
Valider le tracking image target avec Three.js.

Livrables :
- Page WebAR simple
- Une image target
- Un cube ou panneau Three.js affiché
- Test Android
- Test iOS

### Phase 1 - MVP public
Objectif :
Créer l’expérience publique consultable.

Livrables :
- Chargement expérience depuis JSON ou PocketBase
- Tracking image
- Panneaux texte
- Images
- Boutons
- Quiz simple
- UI mobile

### Phase 2 - Backend PocketBase
Objectif :
Centraliser données et fichiers.

Livrables :
- Collections PocketBase
- Auth éditeur
- CRUD basique
- Upload médias
- Règles d’accès
- Docker Compose

### Phase 3 - Back-office éditeur
Objectif :
Permettre la création sans coder.

Livrables :
- Dashboard
- CRUD projets
- CRUD expériences
- CRUD targets
- CRUD contenus
- Prévisualisation
- Publication

### Phase 4 - Amélioration AR
Objectif :
Rendre l’expérience plus qualitative.

Livrables :
- Animations
- Vidéos
- GLB
- Meilleur tracking state
- Préchargement assets
- Optimisation mobile

### Phase 5 - Analytics et progression
Objectif :
Suivre l’usage pédagogique.

Livrables :
- Sessions anonymes
- Événements
- Score quiz
- Progression parcours
- Export CSV

---

## 33. Indicateurs de succès

### Techniques
- Temps de chargement inférieur à 5 secondes sur une expérience simple
- Tracking détecté en moins de 2 secondes dans de bonnes conditions
- Expérience utilisable sur Android Chrome et iOS Safari
- Aucun crash sur expérience simple
- Docker redémarre correctement après reboot

### Produit
- Un éditeur peut créer une expérience sans coder
- Une expérience peut être publiée en moins de 15 minutes
- Un utilisateur peut comprendre quoi faire sans aide externe
- Le contenu AR est lisible et utile
- Les targets peuvent être remplacées ou mises à jour facilement

### Pédagogiques
- L’utilisateur comprend mieux l’objet ou le lieu scanné
- L’information est contextualisée
- Le quiz permet de vérifier la compréhension
- Le parcours peut être utilisé en autonomie

---

## 34. Recommandation d’implémentation

### Choix recommandé pour démarrer
Commencer par un prototype minimal :

1. Vite + TypeScript
2. Three.js
3. MindAR
4. Une image target compilée manuellement
5. Un panneau AR codé en dur
6. Test smartphone

Ensuite seulement :
1. Brancher PocketBase
2. Charger les données dynamiquement
3. Construire l’éditeur
4. Automatiser le pipeline target

### Pourquoi cette approche
Le risque principal n’est pas PocketBase.
Le risque principal est la qualité de tracking WebAR sur les appareils réels.

Il faut donc valider très tôt :
- qualité des images targets
- performances mobile
- compatibilité iOS
- stabilité du tracking
- lisibilité des contenus AR

---

## 35. Architecture cible V2

```text
[Admin React]
     |
     v
[PocketBase API] ---- [pb_data]
     |
     v
[Target Compiler Service Node]
     |
     v
[Compiled .mind files]

[Public WebAR React]
     |
     v
[MindAR + Three.js]
     |
     v
[Camera + Image Tracking + AR Content]
```

### Service Node de compilation V2
Rôle :
- Recevoir une image source
- Compiler en format target MindAR
- Sauvegarder le fichier compilé
- Mettre à jour la collection targets

Ce service peut être séparé de PocketBase pour éviter de complexifier le backend.

---

## 36. Open source stack finale proposée

### Frontend
- Vite
- React
- TypeScript
- Tailwind CSS
- Three.js
- MindAR
- PocketBase JS SDK
- TanStack Query
- Zod
- React Hook Form
- Zustand
- TipTap
- QRCode

### Backend
- PocketBase 0.22.21
- SQLite
- Docker
- Docker Compose

### Reverse proxy
- Caddy ou Traefik

### Média et 3D
- GLB
- glTF
- WebP
- MP4 H.264
- SVG pour icônes

### Dev tools
- Git
- pnpm
- ESLint
- Prettier
- Playwright pour tests simples
- Lighthouse pour performance

---

## 37. Décisions produit importantes

### Image target plutôt qu’ARUCO
Décision validée.

Raison :
- Plus naturel
- Plus esthétique
- Plus adapté à la formation in situ
- Permet d’utiliser des supports pédagogiques existants

### WebAR plutôt qu’app native
Décision validée.

Raison :
- Accès immédiat
- Pas d’installation
- QR code simple
- Maintenance plus simple
- Déploiement instantané

### PocketBase self-hosté
Décision validée.

Raison :
- Simple
- Léger
- SQLite intégré
- Auth intégrée
- Fichiers intégrés
- Très adapté à un home lab
- API rapide à exploiter

### Three.js
Décision validée.

Raison :
- Standard WebGL open source
- Très flexible
- Compatible contenus 3D
- Bonne base pour évoluer

---

## 38. Questions ouvertes

### Q1
Faut-il que chaque expérience soit accessible publiquement sans login ou protégée par code ?

Recommandation MVP :
Public par URL non listée.

### Q2
Faut-il gérer plusieurs langues dès le MVP ?

Recommandation MVP :
Prévoir les champs mais implémenter une seule langue d’abord.

### Q3
Faut-il mesurer les résultats apprenants ?

Recommandation MVP :
LocalStorage uniquement.

Recommandation V2 :
Sessions anonymes dans PocketBase.

### Q4
Faut-il intégrer SCORM ou xAPI ?

Recommandation MVP :
Non.

Recommandation V2 :
xAPI plus adapté si l’objectif est de tracer des événements pédagogiques.

### Q5
Faut-il un éditeur 3D complet ?

Recommandation MVP :
Non.

Recommandation V2 :
Prévisualisation 2D plus édition numérique.
Éditeur visuel seulement après validation produit.

---

## 39. Définition du MVP final

Le MVP est considéré comme terminé quand :

1. PocketBase 0.22.21 tourne en Docker.
2. Un éditeur peut se connecter.
3. Un éditeur peut créer une expérience.
4. Une image target peut être associée à l’expérience.
5. Un contenu texte peut être créé.
6. Un contenu image peut être créé.
7. L’expérience peut être publiée.
8. Une URL publique peut être ouverte sur mobile.
9. La caméra s’active.
10. L’image target est reconnue.
11. Le contenu AR s’affiche avec Three.js.
12. L’expérience est utilisable sur Android et iOS.
13. Les données survivent à un redémarrage Docker.
14. Les règles d’accès empêchent une modification non autorisée.

---

## 40. Conclusion

Ce projet doit être pensé comme une plateforme légère de création d’expériences pédagogiques WebAR.

Le bon angle technique est :
- WebAR pour l’accès immédiat
- Image target pour une AR naturelle
- Three.js pour le rendu 3D
- MindAR pour le tracking
- PocketBase pour un backend simple et self-hosté
- Docker pour le home lab

Le développement doit commencer par le tracking réel sur smartphone avant de construire un éditeur complet.

La priorité est de valider l’expérience terrain :
- reconnaissance rapide
- contenu stable
- interface compréhensible
- fonctionnement mobile fiable

Une fois ce socle validé, l’éditeur PocketBase permettra de transformer le prototype en véritable outil de production de contenus in situ learning.
