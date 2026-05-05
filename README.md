# Supply Chain Planning Web App

React + Vite + Tailwind application for supply chain planning workflows, including dashboards, imports, analytics, and ML data preparation.

## Requirements

- Node.js 20+ (recommended)
- npm 10+ (comes with Node.js)
- Git

## Clone On New Machine

```bash
git clone https://github.com/AphiwitSuksin/Aphiwit.git
cd Aphiwit
```

## Install Dependencies

```bash
npm install
```

## Environment Variables

Copy `.env.example` to `.env` and adjust values as needed.

```bash
cp .env.example .env
```

Common variables:

- `VITE_API_BASE_URL`: backend API base URL (if not set, app uses fallback/mock behavior where implemented)
- `VITE_THAI_OIL_API_URL`: optional override for live Thai fuel price source
- `VITE_OPEN_METEO_API_URL`: optional override for live weather source

## Run Development Server

```bash
npm run dev
```

Default Vite URL is typically:

- `http://localhost:5173`

## Build For Production

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

## Generate OpenAPI Docs

```bash
npm run generate:openapi
```

This updates:

- `docs/openapi.json`

## Notes

- Do not commit `.env` files.
- `node_modules` and `dist` are ignored by git.
- If port is busy, Vite will automatically select another port.
