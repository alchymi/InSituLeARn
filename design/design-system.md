# InSitu AR Learning — Design System

> Style direction : **sobre mais très moderne** — Linear / Vercel / Arc / Raycast.
> Dark mode par défaut (l'app vit caméra ouverte, le dark réduit la pollution visuelle).
> Tout token doit être traduisible en classe Tailwind ou variable CSS sans friction.

---

## 1. Couleurs

### Surface (du plus profond au plus surélevé)

| Token | Valeur | Usage |
|---|---|---|
| `bg-base` | `#09090B` (zinc-950) | Fond global, dark default |
| `bg-surface` | `#111114` | Cartes au repos |
| `bg-elevated` | `#18181B` (zinc-900) | Cartes hover, dropdowns, modals |
| `bg-highlight` | `#1F1F23` | Item sélectionné, focus container |

### Bordures

| Token | Valeur | Usage |
|---|---|---|
| `border-subtle` | `rgba(255,255,255,0.06)` | Séparateurs ultra-discrets |
| `border-default` | `rgba(255,255,255,0.10)` | Cartes, inputs |
| `border-strong` | `rgba(255,255,255,0.16)` | Hover, focus |

### Texte

| Token | Valeur | Usage |
|---|---|---|
| `text-primary` | `#FAFAFA` | Titres, contenu principal |
| `text-secondary` | `#A1A1AA` (zinc-400) | Sous-titres, descriptions |
| `text-muted` | `#71717A` (zinc-500) | Métadonnées, hints |
| `text-disabled` | `#52525B` (zinc-600) | États désactivés |

### Accent (un seul, contenu)

| Token | Valeur | Usage |
|---|---|---|
| `accent` | `#3B82F6` (blue-500) | CTA primaire, focus, liens |
| `accent-hover` | `#2563EB` (blue-600) | CTA hover |
| `accent-soft` | `rgba(59,130,246,0.12)` | Background subtil, badges |
| `accent-ring` | `rgba(59,130,246,0.30)` | Anneau de focus |

### Statut

| Token | Valeur | Usage |
|---|---|---|
| `success` | `#10B981` (emerald-500) | Découvert, publié, validé |
| `warning` | `#F59E0B` (amber-500) | Draft, tracking instable |
| `danger` | `#EF4444` (red-500) | Erreur, suppression |
| `info` | `#06B6D4` (cyan-500) | Info neutre |

### Gradients signature

- **Hero gradient** : `radial-gradient(circle at 30% 0%, rgba(59,130,246,0.18), transparent 50%)` posé sur `bg-base`. Réserve aux écrans landing.
- **Slot locked pattern** : gradient déterministe `conic-gradient` paramétré par hash de l'ID target. Saturation très basse.

---

## 2. Typographie

**Famille** : Inter (Google Fonts). Fallback `system-ui, -apple-system, "Segoe UI", sans-serif`. Mono : `JetBrains Mono` ou `ui-monospace`.

**Letter-spacing** : -0.01em sur les tailles ≥ 24px, -0.02em sur les display.

| Token | Taille | Line-height | Weight | Usage |
|---|---|---|---|---|
| `display-xl` | 56px | 1.05 | 600 | Hero, écrans de fin |
| `display-lg` | 40px | 1.1 | 600 | Titres de page principaux |
| `display-md` | 32px | 1.15 | 600 | Titres section, quête |
| `heading-lg` | 24px | 1.25 | 600 | H2 |
| `heading-md` | 20px | 1.3 | 600 | H3, cartes |
| `heading-sm` | 16px | 1.4 | 600 | H4, labels forts |
| `body-lg` | 16px | 1.55 | 400 | Corps standard |
| `body-md` | 14px | 1.55 | 400 | Corps secondaire, descriptions |
| `body-sm` | 13px | 1.5 | 400 | Métadonnées |
| `caption` | 11px | 1.4 | 500 | Tags, badges, status |
| `mono-sm` | 12px | 1.5 | 500 | Code, slug, IDs |

**Règle de hiérarchie** : jamais plus de 3 niveaux de taille par écran. Le contraste se fait surtout par **poids** (400 vs 600) et par **couleur** (primary vs secondary), pas par taille.

---

## 3. Spacing

Échelle multiple de 4. Ne pas inventer de valeurs intermédiaires.

| Token | Valeur |
|---|---|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 20px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-10` | 40px |
| `space-12` | 48px |
| `space-16` | 64px |
| `space-24` | 96px |

**Règles** :
- Padding intérieur d'une carte : `space-5` minimum, `space-6` recommandé.
- Gap entre cartes : `space-3` à `space-4`.
- Marge entre sections : `space-12` à `space-16`.
- Touch target mobile : 44px minimum (≈ `h-11` Tailwind).

---

## 4. Radius

| Token | Valeur | Usage |
|---|---|---|
| `radius-sm` | 6px | Inputs, petits badges |
| `radius-md` | 10px | Boutons, items de liste |
| `radius-lg` | 14px | Cartes, panneaux |
| `radius-xl` | 20px | Modals, hero containers |
| `radius-pill` | 9999px | Badges status, tags, boutons CTA optionnels |

Pas de coins parfaitement carrés (sauf séparateurs/lignes).

---

## 5. Ombres & élévation

Toujours subtiles. Pas de drop-shadow tape-à-l'œil. Combiner shadow + ring fin.

| Token | Valeur |
|---|---|
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.4)` |
| `shadow-sm` | `0 2px 6px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.3)` |
| `shadow-md` | `0 8px 24px rgba(0,0,0,0.45)` |
| `shadow-lg` | `0 16px 40px rgba(0,0,0,0.55)` |
| `shadow-accent` | `0 0 0 1px rgba(59,130,246,0.3), 0 8px 24px rgba(59,130,246,0.15)` (CTA primaire au repos discret) |

---

## 6. Motion

**Principe** : motion en service de la lisibilité, jamais de décoration. Durées courtes, easings naturels.

| Token | Durée | Easing | Usage |
|---|---|---|---|
| `motion-instant` | 80ms | `ease-out` | Press feedback |
| `motion-fast` | 160ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Hover, focus |
| `motion-base` | 240ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Apparition de carte, modal |
| `motion-slow` | 400ms | `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo) | Hero, découverte unlock |

**Spéciales** :
- **Unlock reveal** : 500ms scale 0.92 → 1 + opacity 0 → 1 + faible blur 6px → 0. Pas de bounce.
- **Tracking lost** : fade contenu vers 0.4 d'opacité, ne pas masquer brutalement.

**Respect `prefers-reduced-motion`** : remplacer toutes les transformations par de simples fades.

---

## 7. Composants clés

### Bouton primaire

```
bg-blue-500 text-white text-sm font-medium
h-11 px-5 rounded-lg
shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_8px_24px_rgba(59,130,246,0.15)]
hover:bg-blue-600 active:scale-[0.98]
focus-visible:ring-2 focus-visible:ring-blue-500/40
transition-[transform,background-color] duration-150
```

### Bouton secondaire (ghost)

```
bg-white/[0.04] text-zinc-100 text-sm font-medium
h-11 px-5 rounded-lg
border border-white/10
hover:bg-white/[0.08] hover:border-white/15
```

### Carte

```
bg-[#111114] border border-white/10 rounded-2xl p-6
hover:border-white/15 hover:bg-[#15151A]
transition-colors duration-150
```

### Input

```
bg-[#0E0E11] border border-white/10 rounded-lg
h-11 px-4 text-sm text-zinc-100 placeholder:text-zinc-500
focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20
```

### Badge / status pill

```
inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full
text-[11px] font-medium uppercase tracking-wide
bg-{accent}/10 text-{accent}-400 border border-{accent}/20
```

Status conventions :
- Draft → amber-400
- Published → emerald-400
- Archived → zinc-400

---

## 8. Concepts visuels spécifiques au produit

### Slots de quête

**Locked** : carré arrondi `radius-lg`, fond généré par **conic-gradient déterministe** depuis le hash de l'ID target. Saturation max 30%, opacité 0.6. Icône cadenas (12% d'opacité) au centre. Pas de label. La grille forme un motif visuel qui « danse » sans rien révéler.

**Unlocked (souvenir polaroid)** : carré arrondi avec léger inner shadow façon polaroid (1.5px white border interne à 8% opacity). Contient le **frame caméra capturé** au moment de la découverte. Léger vignettage radial + grain CSS (`mix-blend-mode: overlay` sur SVG noise). Label en bas, typo `caption`. Sur hover : zoom 1.02 + ring blue subtil.

### Viewfinder AR

4 coins en L, 24px de long, 2px d'épaisseur, blanc à 80% opacité. Pulse 2s alternant 0.6 → 1 opacity (pas de scale, pour ne pas désorienter pendant le tracking). Quand target trouvée : les 4 coins se contractent en 200ms et fade out.

### Badge tracking

Pill `radius-pill` en haut centre, fond `bg-elevated/80 backdrop-blur-md`, contenu : petit dot animé (vert = tracking actif, ambre = perdu) + texte.

### Compteur de progression

`X / Y` en `heading-md`, le `X` en `text-primary`, le `/ Y` en `text-muted`. Une fine barre de progression dessous (1.5px de haut, fond `border-default`, fill `accent` avec transition 400ms).

---

## 9. Densité & responsive

- **Mobile-first** : tout l'apprenant est conçu pour 360–430px de largeur. Tester à 360.
- **Tablet** : 768px, l'apprenant reste en colonne unique, juste plus aéré.
- **Desktop éditeur** : breakpoint utile à 1024px (sidebar visible). En dessous, sidebar bascule en drawer.
- Touch targets : 44×44px minimum partout sur l'apprenant.

---

## 10. Accessibilité (non négociable)

- Contraste texte ≥ 4.5:1, vérifier `text-secondary` sur `bg-surface` (actuel ratio ≈ 6.2:1 ✓).
- Focus visible **toujours** — anneau `ring-2 ring-blue-500/40`. Ne jamais retirer le focus pour des raisons esthétiques.
- Animations bypassées si `prefers-reduced-motion`.
- Boutons icône-seuls : `aria-label` obligatoire.
- Lecteurs d'écran : annoncer les unlocks via `aria-live="polite"`.
