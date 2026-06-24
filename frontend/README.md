# RentEase — Frontend

React + TypeScript + Vite frontend for the RentEase property rental management platform.

## Stack

- **React 19** + **TypeScript**
- **TanStack Router** — file-based routing with code splitting
- **TanStack Query** — server state management
- **Framer Motion** — animations
- **Tailwind CSS v4** — styling
- **Zustand** — auth state
- **Vite** — build tool

## Getting started

```bash
npm install
npm run dev        # starts on http://localhost:5173
```

Backend must be running on port `8000` — Vite proxies `/api` requests automatically.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

## Environment

Copy `.env.example` to `.env` and adjust if needed:

```
VITE_API_BASE_URL=/api/v1
VITE_APP_NAME=RentEase
```

## Deployment

Deployed on **Vercel**. The `vercel.json` proxies `/api/*` requests to the Render backend.
