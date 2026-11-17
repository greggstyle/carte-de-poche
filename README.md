# Carte de poche

Une carte de contact à montrer sur écran ou à imprimer, avec un QR code qui ajoute vraiment la fiche au répertoire du téléphone. Aperçu et réglages gratuits, open source, sans compte : tout se passe dans ton navigateur. Le téléchargement du fichier est payant sur le site officiel (voir [Tarif et paiement](#tarif-et-paiement)).

[English below](#pocket-card-english)

**Site : https://cartedepoche.fr** · **l'app : https://cartedepoche.fr/app** (aussi https://carte-de-poche.vercel.app)

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
- **PDF imprimeur** : carte de visite 55 × 85 mm, A6, ou le format écran à 300 dpi, avec 3 mm de fond perdu et traits de coupe, option « centrer sur une page A4 » pour imprimer chez soi. Généré dans le navigateur, sans bibliothèque. PDF image (pas de texte vectoriel), couleurs RVB.
- **Lien de pré-remplissage** pour les équipes : une entreprise crée un lien avec sa société, son site, sa couleur, et chaque personne ajoute son nom et le logo.
- **Thèmes par métier** : 10 raccourcis couleur + police (artisanat, santé, droit, tech, restauration, immobilier, création, tourisme, nature, beauté), tout reste réglable après.
- **Verso** : deuxième face pour l'impression recto-verso, logo seul ou slogan, aperçu Recto / Verso, PNG du verso et PDF imprimeur à 2 pages.
- **Police et taille du texte** : 6 paires de polices (éditorial, classique, moderne, élégant, brut, rond) et 5 tailles, sans toucher à la disposition.
- **FR / EN**, clair / sombre, mémorisation locale (textes, réglages, images).

## Pour une entreprise

1. Ouvre https://cartedepoche.fr/app, remplis société, site web, adresse, choisis la couleur.
2. Section « Partager » : copie le lien de pré-remplissage.
3. Envoie-le à l'équipe. Chacun ouvre le lien, tape son nom, charge le logo (fichier PNG ou SVG), clique « Mon écran », télécharge.

Paramètres d'URL acceptés : `name`, `role`, `company`, `phrase`, `phone`, `email`, `web`, `address`, `freetext`, `color` (hex sans `#`), `qr` (`vcard` `tel` `email` `web` `text`), `format` (`phone` `story` `square`), `preset` (voir ci-dessous), `w` et `h` (taille libre en pixels), `font` (`editorial` `classic` `modern` `elegant` `bold` `friendly`), `size` (`0.85` `0.92` `1` `1.1` `1.22`), `paper` (`card55` `a6` `screen`), `a4` (`1`), `theme` (`craft` `health` `law` `tech` `food` `estate` `creative` `tourism` `nature` `beauty`), `verso` (`none` `logo` `slogan`), `versotext`, `lang` (`fr` `en`).

Exemple :

```
https://cartedepoche.fr/app?company=Acme&web=acme.re&address=12+rue+Exemple&color=1b3a5c&lang=fr
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

## Tarif et paiement

Sur https://cartedepoche.fr, l'aperçu, les réglages et le QR sont gratuits. **Un paiement débloque 24 h de téléchargements** (PNG, PDF imprimeur, partage) : **1,99 € TTC pendant le prix de lancement (4,99 € barré), puis 4,99 € TTC**. Pas de compte : après paiement, un jeton signé valable 24 h est gardé dans le navigateur. Le paiement passe par Stripe Checkout ; aucune donnée de la carte n'est envoyée aux fonctions serveur (elles ne reçoivent que la langue et l'accord aux CGV).

Comment c'est fait, sans build ni dépendance :

```
api/pricing.js   prix en vigueur (lu depuis Stripe, 1,99 € avant LAUNCH_END, sinon 4,99 €)
api/checkout.js  crée la session Stripe Checkout (exige l'accord aux CGV)
api/unlock.js    au retour de Stripe, confirme "paid" et émet le jeton de 24 h
api/verify.js    revérifie le jeton avant chaque téléchargement
api/webhook.js   à chaque paiement, envoie l'email de confirmation (Resend)
lib/paywall.js   jeton HMAC, choix du prix ; lib/mail.js email ; lib/webhook.js signature Stripe
test/devserver.js  site + vrais gestionnaires contre un faux Stripe et un faux Resend
```

Variables d'environnement Vercel (voir `.env.example`) : `STRIPE_SECRET_KEY` (clé restreinte), `PRICE_STANDARD`, `UNLOCK_SECRET`, et pour l'offre de lancement `PRICE_LAUNCH` et `LAUNCH_END`. **Tant que les trois premières manquent, le site reste entièrement gratuit** : c'est le cas d'un fork ou d'un essai local. `PAYWALL=0` coupe le paiement sans rien supprimer.

Le blocage est volontairement « mou » : la carte étant dessinée dans le navigateur, on peut la capturer à l'écran ou forker le code (licence MIT). On vend la commodité et un fichier propre, pas un secret.

**Emails transactionnels** : après un paiement, Stripe envoie son reçu (à activer dans Stripe → Settings → Customer emails) et `api/webhook.js` envoie par Resend la **confirmation de contrat** (service, prix, heure de fin de l'accès, accord à l'accès immédiat et perte du droit de rétractation, lien CGV, identité du vendeur), en français ou en anglais selon la langue de l'achat. Le webhook vérifie la signature Stripe, ne conserve rien, et n'envoie qu'une fois par achat (clé d'idempotence). Variables : `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO`, et `VAT_RATE` (taux de TVA inclus dans les prix TTC, affiché dans l'email). Le libellé sur le relevé bancaire du client est forcé à « CARTE DE POCHE » (`STATEMENT_DESCRIPTOR`). Endpoint Stripe à créer : `https://www.cartedepoche.fr/api/webhook`, événement `checkout.session.completed`.

**Tester sans Stripe ni Resend** : `node test/devserver.js 8790` sert le site avec les vrais gestionnaires `/api/*` branchés sur un faux Stripe et un faux Resend (emails visibles sur `/__mock/emails`). Tests unitaires : `node --test test/*.test.js`. Avant la production : `node --test test/golive.test.js` (aucun champ « à compléter », clauses clés de la CGV, aucun lien vers la plateforme ODR fermée).

**À régulariser** : le site vend à des particuliers sans médiateur de la consommation désigné. C'est une décision assumée du lancement, mais le Code de la consommation impose d'en proposer un et de l'indiquer dans les CGV. À traiter dès que possible.

## Vie privée

Les textes, réglages et images sont mémorisés dans le `localStorage` de ton navigateur, sur ton appareil uniquement. « Tout effacer » vide cette mémoire. Le contenu de ta carte (nom, téléphone, email, logo) n'est jamais envoyé à un serveur.

Paiement : Stripe traite les données de paiement, nous ne recevons que la confirmation (voir `cgv.html` et `mentions-legales.html`).

Mesure d'audience : la démo utilise [Vercel Web Analytics](https://vercel.com/docs/analytics) (sans cookie) et Google Tag Manager (`GTM-T5V4L7X7`), qui pilote Google Analytics 4. GTM se charge, mais le consentement est refusé par défaut ([Consent Mode v2](https://support.google.com/tagmanager/answer/10718549)) : aucune balise Google ne dépose de cookie avant « Accepter » dans la bannière. Choix mémorisé 6 mois, modifiable via le lien « Cookies » en bas de page. Seuls des événements anonymes sont envoyés : page vue, téléchargement, partage, lien copié, mode QR, format, langue. Jamais le contenu de la carte. Sur un fork, enlève les deux blocs « Google Tag Manager » (head et body), la bannière `#consent` et les deux lignes `_vercel/insights` dans `index.html` pour ne rien mesurer.

## Lancer en local

Aucun build. Sers le dossier (l'app est sur `/app/`) :

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
index.html        page d'accueil (présentation, vidéo, bouton vers l'app)
landing.css       styles de la page d'accueil
app/index.html    l'application (servie sur /app)
app.js            logique : rendu canvas, QR, presets, persistance, lien, i18n, PDF
style.css         styles de l'app clair / sombre, responsive
media/            vidéo de démo et image d'attente
vendor/qrcode.js  qrcode-generator 1.4.4 (MIT, Kazuhiko Arase)
api/ lib/         paiement Stripe et jeton d'accès 24 h (fonctions Vercel)
cgv.html          conditions générales de vente
vercel.json       en-têtes de sécurité et de cache
```

## Contribuer

Le site (accueil, textes, images) peut être amélioré par d'autres personnes ; l'app et le paiement sont réservés au propriétaire du dépôt. Règles, zones et marche à suivre : [CONTRIBUTING.md](CONTRIBUTING.md).

## Crédits et licence

- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) par Kazuhiko Arase, MIT. « QR Code » est une marque déposée de DENSO WAVE.
- Polices via Google Fonts (OFL) : Fraunces, Archivo, IBM Plex Mono, Playfair Display, Source Sans 3, Inter, Cormorant Garamond, Montserrat, Space Grotesk, Nunito. La carte ne charge que la paire choisie ; les polices d'aperçu des boutons se chargent quand la section Typographie devient visible.
- Code sous licence [MIT](LICENSE). Forke, adapte, partage.

---

# Pocket card (English)

A contact card to show on screen or print, with a QR code that really adds you to the phone's address book. Free preview and settings, open source, no account: everything runs in your browser. Downloading the file is paid on the official site (see [Pricing and payment](#pricing-and-payment)).

**Site: https://cartedepoche.fr** · **the app: https://cartedepoche.fr/app** (also https://carte-de-poche.vercel.app)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/greggstyle/carte-de-poche)

## What it does

- **vCard QR**: scanning adds name, role, company, phone, email, website and address straight to contacts (vCard 3.0, UTF-8). Other modes: phone, email, website, free text.
- **Your logo, photo, background**: drag and drop, everything stays on your device.
- **Fits your phone**: a "My screen" button detects the device resolution, plus iPhone / Pixel / Galaxy presets, and Story and Square formats.
- **Download or Share**: exact-size PNG, or the native share sheet on mobile (save to Photos, send by message).
- **Print-ready PDF**: business card 55 × 85 mm, A6, or the screen format at 300 dpi, with 3 mm bleed and crop marks, plus a "centre on an A4 page" option for home printing. Generated in the browser, no library. Raster PDF (no vector text), RGB colours.
- **Pre-fill link** for teams: a company builds a link with its name, website and colour, and each person adds their own name and the logo.
- **Trade themes**: 10 colour + font shortcuts (crafts, health, law, tech, food, real estate, creative, tourism, nature, beauty), everything stays adjustable.
- **Back side**: second face for double-sided printing, logo only or tagline, Front / Back preview, back PNG and 2-page print PDF.
- **Font and text size**: 6 font pairs (editorial, classic, modern, elegant, bold, friendly) and 5 sizes, without touching the layout.
- **FR / EN**, light / dark, local memory (texts, settings, images).

## For a company

1. Open https://cartedepoche.fr/app, fill in company, website, address, pick the colour.
2. "Share" section: copy the pre-fill link.
3. Send it to the team. Everyone opens the link, types their name, loads the logo (PNG or SVG), taps "My screen", downloads.

Accepted URL parameters: `name`, `role`, `company`, `phrase`, `phone`, `email`, `web`, `address`, `freetext`, `color` (hex without `#`), `qr` (`vcard` `tel` `email` `web` `text`), `format` (`phone` `story` `square`), `preset` (see the table above), `w` and `h` (free size in pixels), `font` (`editorial` `classic` `modern` `elegant` `bold` `friendly`), `size` (`0.85` `0.92` `1` `1.1` `1.22`), `paper` (`card55` `a6` `screen`), `a4` (`1`), `theme` (`craft` `health` `law` `tech` `food` `estate` `creative` `tourism` `nature` `beauty`), `verso` (`none` `logo` `slogan`), `versotext`, `lang` (`fr` `en`).

The logo never travels through the URL: each person loads it by hand and it stays in their browser.

## Pricing and payment

On https://cartedepoche.fr, the preview, the settings and the QR are free. **One payment unlocks 24 h of downloads** (PNG, print PDF, sharing): **€1.99 incl. tax during the launch price (€4.99 struck through), then €4.99 incl. tax**. No account: after payment a signed 24 h token is kept in the browser. Payment goes through Stripe Checkout; no card content is sent to the server functions (they only receive the language and the agreement to the terms of sale).

How it works, with no build and no dependency: `api/pricing.js`, `api/checkout.js`, `api/unlock.js`, `api/verify.js`, `api/webhook.js` and `lib/` (HMAC token, price choice, confirmation email), tested with `node --test test/*.test.js`. After a payment, Stripe sends its receipt and the webhook sends, via Resend, the contract confirmation email (service, price, access end time, agreement to immediate access and loss of the withdrawal right, terms link, seller identity). Extra variables: `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO`. Try it without Stripe or Resend: `node test/devserver.js 8790`.

Vercel environment variables (see `.env.example`): `STRIPE_SECRET_KEY` (restricted key), `PRICE_STANDARD`, `UNLOCK_SECRET`, and for the launch offer `PRICE_LAUNCH` and `LAUNCH_END`. **While any of the first three is missing, the site stays entirely free**: that is the case for a fork or a local trial. `PAYWALL=0` switches payment off without deleting anything.

The gate is deliberately "soft": the card is drawn in the browser, so it can be screenshotted or the code forked (MIT licence). We sell convenience and a clean file, not a secret.

## Privacy

Texts, settings and images are kept in your browser's `localStorage`, on your device only. "Clear everything" empties it. Your card's content (name, phone, email, logo) is never sent to a server.

Payment: Stripe processes the payment data, we only receive the confirmation (see `cgv.html` and `mentions-legales.html`).

Audience measurement: the demo uses [Vercel Web Analytics](https://vercel.com/docs/analytics) (cookie-free) and Google Tag Manager (`GTM-T5V4L7X7`), which drives Google Analytics 4. GTM loads, but consent is denied by default ([Consent Mode v2](https://support.google.com/tagmanager/answer/10718549)): no Google tag stores a cookie before "Accept" in the banner. Choice remembered 6 months, changeable via the "Cookies" link in the footer. Only anonymous events are sent: page view, download, share, link copied, QR mode, format, language. Never the card's content. On a fork, remove both "Google Tag Manager" blocks (head and body), the `#consent` banner and the two `_vercel/insights` lines in `index.html` to measure nothing.

## Run locally

No build step. Serve the folder (the app lives at `/app/`) with `npx serve .` or `python3 -m http.server 8000`.

## Deploy

- **Vercel**: button above, or import the repo on vercel.com (framework "Other", no build command, output directory `.`). Every push to `main` redeploys.
- **Elsewhere**: any static host (GitHub Pages, Netlify, Cloudflare Pages, plain nginx).

## Credits and licence

- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase, MIT. "QR Code" is a registered trademark of DENSO WAVE.
- Fonts via Google Fonts (OFL): Fraunces, Archivo, IBM Plex Mono, Playfair Display, Source Sans 3, Inter, Cormorant Garamond, Montserrat, Space Grotesk, Nunito. The card loads only the chosen pair; the button preview fonts load when the Typography section becomes visible.
- Code under the [MIT](LICENSE) licence. Fork it, adapt it, share it.
