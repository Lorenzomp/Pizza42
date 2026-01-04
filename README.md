# Pizza42

Application web de démonstration pour Pizza42 (React + TypeScript + Vite) avec authentification via Auth0.

## Quickstart (local)

- `npm install`
- Renomme `.env.sample` `.env` et adapte la valeur de chacune des variables.
- `npm run dev`
- Ouvre `http://localhost:3000`

## Commandes clés

- **Dev (frontend + backend, hot reload)** : `npm run dev` (par défaut `http://localhost:3000`)
- **Build** : `npm run build` (génère `dist/`)
- **Preview du build (sert uniquement `dist/`)** : `npm run preview`
- **Lint** : `npm run lint`

## Build et exécution du build en local

- `npm run build`
- `npm run preview` (sert `dist/` via Vite, sans l’API Express)

## Contexte / architecture

Ce repo est un “monolithe” Node.js : il contient à la fois le frontend (SPA React buildée par Vite) et le backend (API Express), dans le même projet.

- En **dev**, un seul process écoute sur `PORT` (par défaut `3000`) : Express sert l’API et embarque Vite en middleware pour servir le frontend (HMR) sur le **même port**.
- En **prod**, l’app est servie par `server/index.js` : l’API Express + les fichiers statiques générés dans `dist/`.
- Le “base path” de l’API est dérivé de `AUTH0_AUDIENCE` (ex: `/api/v1/users`) et est utilisé côté frontend (`src/api/basePath.ts`) et côté backend (`server/config.js`).
