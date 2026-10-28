# Instay Frontend

Frontend web application for the Instay platform, built with **Next.js 16**, **React 19**, **TypeScript**, **Tailwind CSS 4**, **Ant Design**, and **TanStack Query**.

## Table of Contents

- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Docker](#docker)
- [CI/CD Workflows](#cicd-workflows)

## Requirements

- Node.js `24.x`
- pnpm `10.28.2` (pinned in `package.json`)

## Quick Start

1. Install dependencies:

```bash
corepack enable
pnpm install --frozen-lockfile
```

2. Create `.env.local` at the project root and add the variables listed in [Environment Variables](#environment-variables).

3. Start development server:

```bash
pnpm dev
```

4. Open:

- <http://localhost:3000>

## Environment Variables

Create `.env.local` in the project root.

Required for core app:

```bash
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

Optional:

```bash
NEXT_PUBLIC_WEBSOCKET_URL=
NEXT_PUBLIC_SSE_URL=
NEXT_PUBLIC_SSE_ENABLED=true
NEXT_PUBLIC_GCS_PUBLIC_PREFIX=
```

Optional for Grafana Faro frontend monitoring:

```bash
NEXT_PUBLIC_FARO_ENABLED=true
NEXT_PUBLIC_FARO_URL=
NEXT_PUBLIC_FARO_API_KEY=
NEXT_PUBLIC_FARO_APP_NAME=instay-fe
NEXT_PUBLIC_FARO_APP_VERSION=
NEXT_PUBLIC_FARO_RELEASE=
NEXT_PUBLIC_FARO_ENVIRONMENT=production
NEXT_PUBLIC_FARO_CAPTURE_CONSOLE=true
```

Notes:

- `NEXT_PUBLIC_FARO_URL` is the collector endpoint, for example a Grafana Alloy or Grafana Cloud Faro collect URL.
- The app reports browser errors, console warnings/errors/info, web vitals, and route navigation events.

Use `pnpm add` / `pnpm add -D` to change dependencies and commit `pnpm-lock.yaml` with `package.json`. Local, CI and Docker use the same pinned pnpm version. Existing dependency overrides are defined in `package.json` under `pnpm.overrides`; approved dependency build scripts are listed under `pnpm.onlyBuiltDependencies`.

## Available Scripts

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `pnpm dev`        | Run app in development mode                |
| `pnpm build`      | Build production bundle                    |
| `pnpm start`      | Start production server                    |
| `pnpm lint`       | Run ESLint                                 |
| `pnpm type-check` | Run TypeScript type check (`tsc --noEmit`) |
| `pnpm test`       | Run unit tests with coverage               |

## Project Structure

```text
src/
  app/          Next.js App Router pages/layouts
  apis/         API clients
  components/   Shared + domain UI components
  config/       Runtime configuration (axios, firebase, websocket, sse)
  constants/    App constants
  hooks/        Custom hooks
  i18n/         i18n routing/messages setup
  providers/    Global providers (React Query, auth bootstrap, etc.)
  stores/       Zustand stores
  types/        Request/response/data TypeScript types
  utils/        Utility helpers
```

## Docker

Build image:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
  --build-arg NEXT_PUBLIC_FIREBASE_VAPID_KEY=$NEXT_PUBLIC_FIREBASE_VAPID_KEY \
  --build-arg NEXT_PUBLIC_FARO_ENABLED=$NEXT_PUBLIC_FARO_ENABLED \
  --build-arg NEXT_PUBLIC_FARO_URL=$NEXT_PUBLIC_FARO_URL \
  --build-arg NEXT_PUBLIC_FARO_API_KEY=$NEXT_PUBLIC_FARO_API_KEY \
  --build-arg NEXT_PUBLIC_FARO_APP_NAME=$NEXT_PUBLIC_FARO_APP_NAME \
  --build-arg NEXT_PUBLIC_FARO_APP_VERSION=$NEXT_PUBLIC_FARO_APP_VERSION \
  --build-arg NEXT_PUBLIC_FARO_RELEASE=$NEXT_PUBLIC_FARO_RELEASE \
  --build-arg NEXT_PUBLIC_FARO_ENVIRONMENT=$NEXT_PUBLIC_FARO_ENVIRONMENT \
  --build-arg NEXT_PUBLIC_FARO_CAPTURE_CONSOLE=$NEXT_PUBLIC_FARO_CAPTURE_CONSOLE \
  -t instay-fe:local .
```

Run container:

```bash
docker run --rm -p 3000:3000 instay-fe:local
```

## CI/CD Workflows

Workflow: `.github/workflows/ci.yml`, using GitHub-hosted `ubuntu-24.04` runners.

Pushes to `main`, pull requests targeting `main` and manual runs execute the checks. Container scan and publish run only on a push to `main`.

1. `pre-checks`: gitleaks, ESLint, TypeScript type check.
2. `sast` and `sca` run in parallel: Semgrep and Snyk.
3. `build-test`: unit tests, the existing coverage gate, then Next.js build.
4. `container-scan`: Docker build → SPDX SBOM generation → Trivy SBOM scan.
5. `publish`: push `ghcr.io/<owner>/<repo>:<commit-sha>`, sign the image and attach the SBOM.

Image and SBOM are passed between jobs as workflow artifacts. Keep `SNYK_TOKEN` and the existing `NEXT_PUBLIC_*` repository variables configured. Only the commit SHA image tag is published; deployment selects the desired SHA. `make github CM="message"` requires the current branch to be `main` and pushes it via `git push origin main`.
