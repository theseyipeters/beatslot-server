# Beatslot Server

TypeScript Express API for Beatslot waitlist and admin dashboard data, backed by MongoDB.

## Setup

1. Copy env file:
   - `cp .env.example .env`
2. Fill required variables in `.env`:
   - `MONGODB_URI`
   - `MONGODB_DB_NAME`
   - `FRONTEND_ORIGIN` (comma-separated list for FE/Admin origins)
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `ADMIN_TOKEN_SECRET`
3. Install dependencies:
   - `yarn install`
4. Run server:
   - `yarn dev`
5. Build production output:
   - `yarn build`

## Endpoints

- `GET /health`
- `POST /api/join-waitlist`
- `POST /api/admin/login`
- `GET /api/admin/overview` (Bearer token required)
- `GET /api/admin/users` (Bearer token required)

### `POST /api/join-waitlist` body

```json
{
  "artist_name": "Your artist name",
  "email": "you@example.com",
  "location": "City, Country"
}
```

### `POST /api/admin/login` body

```json
{
  "email": "admin@beatslot.com",
  "password": "change-me"
}
```
