# Mise en prod — InSituLeARn (home lab)

> Guide destiné à un **Claude Code exécuté sur le home lab** pour déployer l'application. Suit les étapes dans l'ordre, ne saute aucune vérification. Demande confirmation avant toute action destructive (kill de container existant, etc).

---

## Cible

| Sous-domaine | Sert | Service Docker | Port local par défaut |
|---|---|---|---|
| `insitu.futursimple.club` | Landing publique | `insitu-apprenant` (même container) | 8082 |
| `insituadmin.futursimple.club` | Back-office éditeur | `insitu-editor` | 8081 |
| `insituplay.futursimple.club` | Apprenant WebAR + URL publique des quêtes | `insitu-apprenant` | 8082 |
| (pas de sous-domaine si pas exposé) | API PocketBase | `insitu-pocketbase` | 8092 |

**Note importante** : `insitu.*` (landing) et `insituplay.*` (apprenant) **routent vers le même container** (`insitu-apprenant`). Le code sert la landing sur `/` et les expériences sur `/e/:slug`. C'est `PUBLIC_APP_URL` qui décide quel domaine est utilisé dans les liens de partage générés par l'éditeur — on met `https://insituplay.futursimple.club` pour que les liens partagés tombent bien sur le domaine « play ».

PocketBase **doit** être exposé en HTTPS via un sous-domaine séparé (ex. `pb.insitu.futursimple.club` ou `insitupb.futursimple.club`). Sans ça, le navigateur des apprenants (en HTTPS) ne pourra pas l'appeler (mixed content). Demande à l'utilisateur quel domaine il veut pour PB s'il ne l'a pas précisé.

---

## Étape 1 — Cloner le repo

```bash
cd ~  # ou le dossier où tu déploies typiquement
git clone https://github.com/alchymi/InSituLeARn.git insitu
cd insitu
```

Vérifie que tu as bien :
- `docker-compose.yml` à la racine
- `.env.example` à la racine
- Dossiers `server/`, `editor/`, `apprenant/`

---

## Étape 2 — VÉRIFIER LES PORTS DÉJÀ UTILISÉS

**Ne saute pas cette étape**. Les défauts du repo sont `8092` (PB), `8081` (éditeur), `8082` (apprenant). Beaucoup de home labs en ont déjà occupés.

```bash
# Liste les ports écoutés par tous les containers Docker existants
docker ps --format 'table {{.Names}}\t{{.Ports}}'

# Liste les ports écoutés au niveau OS (toutes interfaces)
ss -tlnp | grep -E ':(80|443|8081|8082|8090|8091|8092|3000|5173|5174)' || true

# Si ss n'est pas dispo, alternative
netstat -tlnp 2>/dev/null | grep LISTEN | sort -k4
```

Pour chaque port (`8092`, `8081`, `8082`) qui apparaît dans le résultat → **change-le dans `.env`** à l'étape suivante (variables `POCKETBASE_PORT`, `EDITOR_PORT`, `APPRENANT_PORT`).

Suggestion de range libre pour un home lab typique : `18092`, `18081`, `18082`. Ou trouve simplement les premiers ports `> 10000` libres.

Si Claude n'est pas sûr → demander à l'utilisateur les ports à utiliser avant de continuer.

---

## Étape 3 — Configurer `.env`

```bash
cp .env.example .env
```

Édite `.env` pour avoir **exactement** :

```env
# URLs publiques (ce que voient les navigateurs)
POCKETBASE_PUBLIC_URL=https://insitupb.futursimple.club    # ← adapte au sous-domaine PB choisi
EDITOR_PUBLIC_URL=https://insituadmin.futursimple.club
APPRENANT_PUBLIC_URL=https://insituplay.futursimple.club

# Ports locaux (cloudflared les cible côté machine)
# Adapter si l'étape 2 a montré un conflit
POCKETBASE_PORT=8092
EDITOR_PORT=8081
APPRENANT_PORT=8082
```

**Si `insitupb.futursimple.club` n'est pas le domaine retenu pour PB**, demander confirmation à l'utilisateur avant de continuer. Sans PB exposé en HTTPS, l'apprenant et l'éditeur ne peuvent pas l'appeler.

---

## Étape 4 — Build et démarrage des services

```bash
docker compose --profile prod up -d --build
```

Build initial = ~3-5 minutes (download node:20-alpine, install pnpm deps des deux fronts, build vite, image nginx finale).

Vérifie l'état :

```bash
docker compose ps
# Tous les 3 services doivent être "Up" et pocketbase doit avoir "(healthy)"

docker compose logs --tail=30 pocketbase
docker compose logs --tail=20 editor
docker compose logs --tail=20 apprenant
```

Les containers éditeur et apprenant doivent logger « env.js regenerated » avec les bonnes URL. Si tu vois des URL vides → tes env vars de l'étape 3 ne sont pas remontées, vérifie que `.env` est bien à la racine et que tu lances `docker compose` depuis cette racine.

Test rapide local (sans encore passer par Cloudflare) :

```bash
curl -s http://localhost:${POCKETBASE_PORT:-8092}/api/health   # doit retourner {"message":"API is healthy."...}
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:${EDITOR_PORT:-8081}/        # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:${APPRENANT_PORT:-8082}/     # 200
curl -s http://localhost:${APPRENANT_PORT:-8082}/env.js | head -10   # doit contenir les URLs publiques
```

---

## Étape 5 — Configurer Cloudflare Tunnel

Le tunnel est géré au niveau OS (pas dans ce repo, c'est volontaire). Hypothèse : `cloudflared` est déjà installé et un tunnel existe.

**⚠️ Deux modèles de tunnel — identifier lequel AVANT d'éditer quoi que ce soit :**

```bash
# Linux : voir comment le service est lancé
systemctl cat cloudflared 2>/dev/null | grep ExecStart
ps aux | grep cloudflared
# Windows (PowerShell) : (Get-CimInstance Win32_Service -Filter "Name='cloudflared'").PathName
```

- Si la commande contient **`--token eyJ...`** → **tunnel géré à distance (dashboard)**. Il n'y a **pas** de `config.yml` local, les routes se configurent dans le **dashboard Cloudflare Zero Trust** → voir 5A.
- Si la commande référence un **`config.yml`** (ou `--config`) → **tunnel à config locale** → voir 5B.

Le `--token` est un **secret** (il permet de lancer le tunnel) : ne pas le logger ni le partager.

### 5A — Tunnel géré par token (dashboard) — cas le plus courant sur Windows/home lab

Aucun fichier à éditer. Dans **Cloudflare Zero Trust → Networks → Tunnels →** ton tunnel **→ onglet "Public Hostname"**, ajoute 4 entrées (le DNS CNAME proxié est créé automatiquement) :

| Subdomain | Domain | Type | URL |
|---|---|---|---|
| `insituadmin` | futursimple.club | HTTP | `localhost:8081` |
| `insituplay` | futursimple.club | HTTP | `localhost:8082` |
| `insitu` | futursimple.club | HTTP | `localhost:8082` |
| `insitupb` | futursimple.club | HTTP | `localhost:8092` |

**Type = HTTP** (pas HTTPS) : les services tournent en HTTP local, Cloudflare gère le TLS public — pas besoin de `noTLSVerify`. Adapter les ports si l'étape 2 en a changé. Rien à redémarrer : le tunnel applique la conf du dashboard à chaud. Passer directement au « Test public » plus bas.

### 5B — Tunnel à config locale (YAML)

Identifier le fichier de config :
```bash
sudo cat /etc/cloudflared/config.yml 2>/dev/null \
  || cat ~/.cloudflared/config.yml 2>/dev/null
```

Ajoute les routes dans la section `ingress:` (avant le catch-all final `service: http_status:404`) :

```yaml
ingress:
  # … routes existantes …

  - hostname: insituadmin.futursimple.club
    service: http://localhost:8081       # ← EDITOR_PORT
  - hostname: insituplay.futursimple.club
    service: http://localhost:8082       # ← APPRENANT_PORT
  - hostname: insitu.futursimple.club
    service: http://localhost:8082       # ← APPRENANT_PORT (même container, sert la landing)
  - hostname: insitupb.futursimple.club
    service: http://localhost:8092       # ← POCKETBASE_PORT
    originRequest:
      noTLSVerify: true                  # PB est en HTTP local, cloudflare gère le TLS public

  # Catch-all
  - service: http_status:404
```

Ne pas oublier de pointer les DNS dans Cloudflare (côté dashboard) vers le tunnel pour chacun des 4 hostnames. Demander à l'utilisateur si tu n'es pas sûr de quel tunnel ID utiliser.

Recharger cloudflared :
```bash
sudo systemctl restart cloudflared
# Ou si géré différemment, adapter
```

Test public :
```bash
curl -s https://insitu.futursimple.club/ -o /dev/null -w "HTTP %{http_code}\n"
curl -s https://insituadmin.futursimple.club/ -o /dev/null -w "HTTP %{http_code}\n"
curl -s https://insituplay.futursimple.club/ -o /dev/null -w "HTTP %{http_code}\n"
curl -s https://insitupb.futursimple.club/api/health
```

Les 3 premiers doivent retourner 200, le 4ᵉ doit retourner `{"message":"API is healthy."...}`.

---

## Étape 6 — Premier admin PocketBase

À la première mise en prod, créer le compte super-admin technique de PocketBase :

1. Ouvrir `https://insitupb.futursimple.club/_/` dans un navigateur.
2. Remplir email + mot de passe → ce compte est **séparé** des utilisateurs éditeurs (qui se créent via self-register sur `insituadmin.futursimple.club/login`).
3. Stocker ce mot de passe en lieu sûr (gestionnaire de secrets).

Vérifie ensuite que les 3 collections métier existent : `experiences`, `targets`, `ar_contents`. Si elles sont absentes, regarde `docker compose logs pocketbase` pour des erreurs de migration.

---

## Étape 7 — Test end-to-end production

1. Aller sur `https://insituadmin.futursimple.club/` → page de login.
2. Créer un compte éditeur (self-register).
3. Créer une quête → ajouter une cible (compilation `.mind` dans le navigateur) → ajouter un contenu texte → **Publier**.
4. Copier le lien public → il doit pointer vers `https://insituplay.futursimple.club/e/<slug>`.
5. Ouvrir le lien sur un téléphone → la quête doit charger, autoriser la caméra, scanner.
6. Vérifier `https://insitu.futursimple.club/` → landing affichée, CTA pointe vers `insituadmin.futursimple.club`.

Si une étape échoue → consulter la section Troubleshooting plus bas.

---

## Troubleshooting

| Symptôme | Cause probable | Solution |
|---|---|---|
| `docker compose ps` montre un container en `Restarting` | Crash boucle (souvent migration PB ou conflit de port) | `docker compose logs <service>` pour voir l'erreur |
| `Bind for 0.0.0.0:XXXX failed: port is already allocated` | Port déjà pris (étape 2 mal faite) | Adapter le port dans `.env` puis `docker compose up -d` |
| Landing OK mais l'éditeur dit « Failed to fetch » | URL PB mal configurée dans env.js | Vérifier `docker compose exec editor cat /usr/share/nginx/html/env.js` et redémarrer le container après correction de `.env` |
| Mixed content errors dans la console navigateur | PB est en HTTP et l'éditeur/apprenant en HTTPS | PB **doit** être derrière HTTPS (donc derrière cloudflared) avec un sous-domaine dédié |
| Le tracking AR ne démarre pas sur mobile | Le `.mind` n'est pas accessible (CORS ou 404) | Tester `curl https://insitupb.futursimple.club/api/files/...` doit retourner le fichier sans erreur |
| Cloudflare retourne 502 sur un sous-domaine | Le tunnel ne joint pas le port local | Vérifier que `docker compose ps` montre le port mappé sur localhost de la même machine où tourne cloudflared |
| Les changements d'URL ne s'appliquent pas après édit de `.env` | Containers pas redémarrés | `docker compose --profile prod restart editor apprenant` (rebuild pas nécessaire — env.js est régénéré à chaque start) |

---

## Sauvegarde

À mettre dans un cron quotidien :

```bash
#!/bin/bash
cd /chemin/vers/insitu
tar -czf "/backups/insitu/insitu-$(date +%Y-%m-%d).tar.gz" \
  server/pocketbase/pb_data \
  server/pocketbase/pb_migrations \
  .env

# Rétention 14 jours
find /backups/insitu -name "insitu-*.tar.gz" -mtime +14 -delete
```

Demander à l'utilisateur où il veut stocker ces backups (NAS, externe, S3…) si pas déjà décidé.

---

## Mise à jour ultérieure

```bash
cd ~/insitu
git pull
docker compose --profile prod up -d --build
```

Si nouvelles migrations PB → elles s'appliquent automatiquement au prochain démarrage du container `insitu-pocketbase`. Vérifier les logs après pull :

```bash
docker compose logs --tail=50 pocketbase
```

Si une migration échoue, ne pas redémarrer en boucle — vérifier l'état avec l'utilisateur avant d'aller plus loin (la base pourrait être partiellement migrée).

---

## Garde-fous pour Claude

- **Avant de killer un container existant** (autre que ceux de ce projet), demander confirmation. Le home lab peut héberger d'autres services dépendants.
- **Ne pas modifier `/etc/cloudflared/config.yml` sans backup** : `sudo cp /etc/cloudflared/config.yml /etc/cloudflared/config.yml.bak.$(date +%s)` avant édition.
- **Ne pas exposer PocketBase en clair sur Internet** sans HTTPS. Toujours derrière le tunnel.
- **Si le port `.env` change**, faire `docker compose --profile prod down` puis `up -d` (pas juste restart) pour que Docker republie les bind.
- En cas de doute → lire `README.md` et `CLAUDE.md` à la racine du repo.
