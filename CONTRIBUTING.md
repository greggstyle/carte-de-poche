# Contribuer à Carte de poche

Ce guide est pour Justine et toute personne qui veut améliorer **le site** (la page d'accueil et les pages d'information). **L'application (`/app`) et le paiement sont réservés à Greg.**

> `main` = la production : tout ce qui est fusionné dans `main` est en ligne sur https://www.cartedepoche.fr en quelques minutes, avec le paiement Stripe actif. On ne travaille donc jamais directement dans `main`.

## Qui peut toucher quoi

| zone | fichiers | règle |
|---|---|---|
| **Site (libre)** | `index.html` (accueil), `landing.css` (son style), `media/` (vidéo et image) | tu modifies, tu proposes via une demande de fusion |
| **Site, pages juridiques** | `cgv.html`, `mentions-legales.html`, `charte-ia.html` | la mise en page est libre ; le **fond** (prix, vendeur, rétractation, TVA, médiation, données) est validé par Greg |
| **App (réservé Greg)** | `app/`, `app.js`, `style.css`, `vendor/`, `api/`, `lib/`, `test/`, `vercel.json`, `.env.example` | **ne pas modifier** : génération de la carte, PDF, paiement, emails |

`.github/CODEOWNERS` demande automatiquement la validation de Greg dès qu'une demande de fusion touche une zone réservée ou une page juridique.

## À ne pas casser dans `index.html`

La page d'accueil lit le prix en vigueur sur le serveur et suit les clics. Tu peux changer les textes, les couleurs, les images et la mise en page, mais garde :

- les `id` suivis par le script en bas de page : `launch`, `price-big`, `price-sub`, `faq-price`, `consent`, `consent-yes`, `consent-no`, `consent-open`. Si un `id` disparaît, le prix ou la bannière de cookies s'arrête de marcher ;
- les attributs `data-cta="top"`, `data-cta="hero"`, `data-cta="bottom"` sur les boutons vers `/app` (ils servent au suivi des clics) ;
- les liens des boutons principaux vers `/app` ;
- les blocs Google Tag Manager et Vercel Analytics, ainsi que la bannière de consentement (obligation légale) ;
- **aucun prix écrit en dur** : il vient de `/api/pricing`. Pour changer un tarif, demande à Greg.

## Comment proposer un changement

1. **Crée une branche** à partir de `main`, nommée `site/ce-que-tu-changes` (par exemple `site/nouveau-titre`). Jamais de commit direct sur `main`.
2. **Modifie** uniquement les fichiers de la zone « site ».
3. **Teste en local** (voir plus bas) : ordinateur et téléphone.
4. **Pousse** ta branche et ouvre une **demande de fusion** (pull request) vers `main`. Explique en une phrase ce qui change et joins une capture avant/après.
5. **Aperçu automatique** : Vercel publie un lien d'aperçu sous ta demande de fusion. Vérifie-le sur ton téléphone.
6. **Validation** : Greg relit et fusionne. La fusion met en ligne.

## Tester en local

Il n'y a rien à installer pour le site : ce sont des fichiers statiques.

```
npx http-server . -p 8765
# puis ouvre http://localhost:8765/
```

En local, le prix reste affiché par défaut (l'API de paiement n'existe qu'en ligne) : c'est normal. Vérifie avant de demander la fusion :

- [ ] aucune erreur rouge dans la console du navigateur (F12) ;
- [ ] la page est correcte sur téléphone (largeur 375 px) et sur ordinateur ;
- [ ] les boutons « créer ma carte » mènent bien vers `/app` ;
- [ ] la bannière de consentement s'affiche toujours ;
- [ ] les images ont un texte alternatif et les textes restent lisibles (contraste).

Si tu as touché une page juridique ou `index.html`, lance aussi les tests (Node 18 ou plus) :

```
node --test test/*.test.js
```

## Règles de sécurité

- **Jamais** de clé API, de mot de passe ou de secret dans le dépôt (même dans un commentaire). Les clés Stripe, Resend et le secret d'accès vivent uniquement dans les variables d'environnement Vercel, gérées par Greg.
- Ne modifie pas `.env.example`, `vercel.json`, ni les variables d'environnement.
- N'ajoute pas de script externe (nouveau traceur, widget, police en ligne) sans en parler à Greg : cela peut obliger à revoir la bannière de consentement et la politique de confidentialité.
- Le dépôt est public : n'y mets aucune donnée personnelle de client.

## Des questions ?

Écris à Greg, ou ouvre une demande de fusion en brouillon (« Draft ») pour en discuter avant de finir.
