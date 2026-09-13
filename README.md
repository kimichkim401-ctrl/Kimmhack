# KIM

KIM is a private digital identity web experience: cinematic public interface, permission-based browser intelligence, and a private owner vault.

It is not a fake hacking simulator. It does not bypass browser permissions, secretly activate camera or microphone, steal clipboard data, read contacts, inspect private files, or fabricate unavailable data.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Prisma ORM
- PostgreSQL
- Browser APIs: Geolocation, MediaDevices, MediaRecorder, Web Audio

## Core Flows

- `/` starts the KIM boot sequence and builds a client snapshot from real browser/request data.
- Public IP is captured on the backend through `/api/session`.
- Precise location uses `navigator.geolocation` only after the permission stage.
- Camera uses `navigator.mediaDevices.getUserMedia({ video: true })` only after the permission stage.
- Video recording uses `MediaRecorder` and remains local until the visitor selects `SEND TO KIM VAULT`.
- Microphone uses the real browser permission prompt and shows input level only after permission.
- `/owner` is the private owner archive. Owner APIs authorize on the backend.

## Environment

Create `.env` from `.env.example`.

Generate an owner password hash:

```bash
node -e "require('bcryptjs').hash('your-password', 12).then(console.log)"
```

Set:

```env
DATABASE_URL="postgresql://kim_owner:change-me@localhost:5432/kim_vault?schema=public"
AUTH_SECRET="generate-a-strong-random-secret-at-least-32-characters"
OWNER_EMAIL="owner@example.com"
OWNER_PASSWORD_HASH="bcrypt-hash"
MEDIA_STORAGE_PATH="./data/media"
```

## Development

```bash
npm install
npm run prisma:migrate
npm run dev
```

## Checks

```bash
npm run test
npm run lint
npm run build
```

## Security Boundaries

- No public media URLs.
- Uploaded media is written to private filesystem storage with randomized object keys.
- Uploads validate MIME type and size.
- Owner authentication uses environment secrets, bcrypt verification, JWT session cookies, HttpOnly cookies, SameSite cookies, and login rate limiting.
- Sensitive visitor operations create audit events.
- CSP, `frame-ancestors`, `X-Frame-Options`, `X-Content-Type-Options`, and referrer policy are configured in `next.config.mjs`.

## Production Notes

- Run behind HTTPS.
- Use managed PostgreSQL.
- Move `MEDIA_STORAGE_PATH` to protected object storage for larger deployments.
- Keep `AUTH_SECRET`, database credentials, and storage credentials out of frontend code.
- Configure an IP intelligence provider only if you want country/region/city/ASN enrichment, and label it as approximate network location.
