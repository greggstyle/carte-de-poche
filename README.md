# Carte de poche

Une carte de contact à montrer sur écran ou à imprimer, avec un QR code qui ajoute vraiment la fiche au répertoire du téléphone. Gratuit, open source, sans compte : tout se passe dans ton navigateur.

[English below](#pocket-card-english)

**Démo : https://cartedepoche.fr** (aussi https://carte-de-poche.vercel.app)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/greggstyle/carte-de-poche)

```
  ┌──────────────┐
  │    [logo]    │
  │  Ton nom     │
  │  ton rôle    │
  │  ┌────────┐  │   scan → la fiche s'ajoute
  │  │ QR     │  │   au répertoire
  │  └────────┘  │
  │  tél · mail  │
  └──────────────┘
```

## Ce que ça fait

- **QR vCard** : au scan, nom, rôle, société, téléphone, email, site et adresse arrivent directement dans les contacts (vCard 3.0, UTF-8, accents OK). Autres modes : téléphone, email, site web, texte libre.
- **Ton logo, ta photo, ton fond** : glisse-dépose, tout reste sur ton appareil.
- **Adapté à ton téléphone** : bouton « Mon écran » qui détecte la résolution de l'appareil, plus des presets iPhone / Pixel / Galaxy, et les formats Story et Carré.
- **Télécharger ou Partager** : PNG à la taille exacte, ou feuille de partage native sur mobile (enregistrer dans Photos, envoyer par message).
- **Lien de pré-remplissage** pour les équipes : une entreprise crée un lien avec sa société, son site, sa couleur, et chaque personne ajoute son nom et le logo.
- **Police et taille du texte** : 6 paires de polices (éditorial, classique, moderne, élégant, brut, rond) et 5 tailles, sans toucher à la disposition.
- **FR / EN**, clair / sombre, mémorisation locale (textes, réglages, images).

## Pour une entreprise

1. Ouvre l'app, remplis société, site web, adresse, choisis la couleur.
2. Section « Partager » : copie le lien de pré-remplissage.
3. Envoie-le à l'équipe. Chacun ouvre le lien, tape son nom, charge le logo (fichier PNG ou SVG), clique « Mon écran », télécharge.

Paramètres d'URL acceptés : `name`, `role`, `company`, `phrase`, `phone`, `email`, `web`, `address`, `freetext`, `color` (hex sans `#`), `qr` (`vcard` `tel` `email` `web` `text`), `format` (`phone` `story` `square`), `preset` (voir ci-dessous), `w` et `h` (taille libre en pixels), `font` (`editorial` `classic` `modern` `elegant` `bold` `friendly`), `size` (`0.85` `0.92` `1` `1.1` `1.22`), `lang` (`fr` `en`).

Exemple :

```
https://cartedepoche.fr/?company=Acme&web=acme.re&address=12+rue+Exemple&color=1b3a5c&lang=fr
```

Le logo ne passe jamais par l'URL : il est chargé à la main par chaque personne et reste dans son navigateur.

## Formats téléphone

| preset | appareil | pixels |
|---|---|---|
| `iphone-duo` | iPhone Duo, écran extérieur (fermé) | 1398 × 2034 |
| `iphone-duo-open` | iPhone Duo, écran intérieur (déplié) | 1878 × 2670 |
| `iphone-16-pro-max` | iPhone 16 Pro Max | 1320 × 2868 |
| `iphone-16-pro` | iPhone 16 Pro (défaut) | 1206 × 2622 |
| `iphone-16` | iPhone 16 / 15 | 1179 × 2556 |
| `iphone-se` | iPhone SE | 750 × 1334 |
| `pixel-9` | Pixel 9 | 1080 × 2424 |
| `galaxy-s24` | Galaxy S24 | 1080 × 2340 |
| `android` | Android générique | 1080 × 2400 |

Sources : fiches techniques Apple (support.apple.com/fr-fr/specs, apple.com/iphone-duo/specs), Google (store.google.com, Pixel 9 tech specs), Samsung (samsung.com, Galaxy S24 specs). Consultées le 2 octobre 2026. Si ton modèle n'y est pas, « Mon écran » fait le travail.

## Vie privée

Les textes, réglages et images sont mémorisés dans le `localStorage` de ton navigateur, sur ton appareil uniquement. « Tout effacer » vide cette mémoire. Le contenu de ta carte (nom, téléphone, email, logo) n'est jamais envoyé à un serveur.

Mesure d'audience : la démo utilise [Vercel Web Analytics](https://vercel.com/docs/analytics) (sans cookie) et Google Tag Manager (`GTM-T5V4L7X7`), qui pilote Google Analytics 4. GTM se charge, mais le consentement est refusé par défaut ([Consent Mode v2](https://support.google.com/tagmanager/answer/10718549)) : aucune balise Google ne dépose de cookie avant « Accepter » dans la bannière. Choix mémorisé 6 mois, modifiable via le lien « Cookies » en bas de page. Seuls des événements anonymes sont envoyés : page vue, téléchargement, partage, lien copié, mode QR, format, langue. Jamais le contenu de la carte. Sur un fork, enlève les deux blocs « Google Tag Manager » (head et body), la bannière `#consent` et les deux lignes `_vercel/insights` dans `index.html` pour ne rien mesurer.

## Lancer en local

Aucun build. Ouvre `index.html`, ou sers le dossier :

```
npx serve .
# ou
python3 -m http.server 8000
```

## Déployer

- **Vercel** : bouton ci-dessus, ou importe le repo dans vercel.com (framework « Other », pas de commande de build, dossier de sortie `.`). Chaque push sur `main` redéploie.
- **Ailleurs** : n'importe quel hébergeur statique (GitHub Pages, Netlify, Cloudflare Pages, un simple nginx).

## Fichiers

```
index.html        page
app.js            logique : rendu canvas, QR, presets, persistance, lien, i18n
style.css         styles clair / sombre, responsive
vendor/qrcode.js  qrcode-generator 1.4.4 (MIT, Kazuhiko Arase)
vercel.json       en-têtes de sécurité et de cache
```

## Crédits et licence

- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) par Kazuhiko Arase, MIT. « QR Code » est une marque déposée de DENSO WAVE.
- Polices via Google Fonts (OFL) : Fraunces, Archivo, IBM Plex Mono, Playfair Display, Source Sans 3, Inter, Cormorant Garamond, Montserrat, Space Grotesk, Nunito. La carte ne charge que la paire choisie ; les polices d'aperçu des boutons se chargent quand la section Typographie devient visible.
- Code sous licence [MIT](LICENSE). Forke, adapte, partage.

---

# Pocket card (English)

A contact card to show on screen or print, with a QR code that really adds you to the phone's address book. Free, open source, no account: everything runs in your browser.

**Demo: https://cartedepoche.fr** (also https://carte-de-poche.vercel.app)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/greggstyle/carte-de-poche)

## What it does

- **vCard QR**: scanning adds name, role, company, phone, email, website and address straight to contacts (vCard 3.0, UTF-8). Other modes: phone, email, website, free text.
- **Your logo, photo, background**: drag and drop, everything stays on your device.
- **Fits your phone**: a "My screen" button detects the device resolution, plus iPhone / Pixel / Galaxy presets, and Story and Square formats.
- **Download or Share**: exact-size PNG, or the native share sheet on mobile (save to Photos, send by message).
- **Pre-fill link** for teams: a company builds a link with its name, website and colour, and each person adds their own name and the logo.
- **Font and text size**: 6 font pairs (editorial, classic, modern, elegant, bold, friendly) and 5 sizes, without touching the layout.
- **FR / EN**, light / dark, local memory (texts, settings, images).

## For a company

1. Open the app, fill in company, website, address, pick the colour.
2. "Share" section: copy the pre-fill link.
3. Send it to the team. Everyone opens the link, types their name, loads the logo (PNG or SVG), taps "My screen", downloads.

Accepted URL parameters: `name`, `role`, `company`, `phrase`, `phone`, `email`, `web`, `address`, `freetext`, `color` (hex without `#`), `qr` (`vcard` `tel` `email` `web` `text`), `format` (`phone` `story` `square`), `preset` (see the table above), `w` and `h` (free size in pixels), `font` (`editorial` `classic` `modern` `elegant` `bold` `friendly`), `size` (`0.85` `0.92` `1` `1.1` `1.22`), `lang` (`fr` `en`).

The logo never travels through the URL: each person loads it by hand and it stays in their browser.

## Privacy

Texts, settings and images are kept in your browser's `localStorage`, on your device only. "Clear everything" empties it. Your card's content (name, phone, email, logo) is never sent to a server.

Audience measurement: the demo uses [Vercel Web Analytics](https://vercel.com/docs/analytics) (cookie-free) and Google Tag Manager (`GTM-T5V4L7X7`), which drives Google Analytics 4. GTM loads, but consent is denied by default ([Consent Mode v2](https://support.google.com/tagmanager/answer/10718549)): no Google tag stores a cookie before "Accept" in the banner. Choice remembered 6 months, changeable via the "Cookies" link in the footer. Only anonymous events are sent: page view, download, share, link copied, QR mode, format, language. Never the card's content. On a fork, remove both "Google Tag Manager" blocks (head and body), the `#consent` banner and the two `_vercel/insights` lines in `index.html` to measure nothing.

## Run locally

No build step. Open `index.html`, or serve the folder with `npx serve .` or `python3 -m http.server 8000`.

## Deploy

- **Vercel**: button above, or import the repo on vercel.com (framework "Other", no build command, output directory `.`). Every push to `main` redeploys.
- **Elsewhere**: any static host (GitHub Pages, Netlify, Cloudflare Pages, plain nginx).

## Credits and licence

- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase, MIT. "QR Code" is a registered trademark of DENSO WAVE.
- Fonts via Google Fonts (OFL): Fraunces, Archivo, IBM Plex Mono, Playfair Display, Source Sans 3, Inter, Cormorant Garamond, Montserrat, Space Grotesk, Nunito. The card loads only the chosen pair; the button preview fonts load when the Typography section becomes visible.
- Code under the [MIT](LICENSE) licence. Fork it, adapt it, share it.
