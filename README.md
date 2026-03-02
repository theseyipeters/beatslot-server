# Beatslot Server

TypeScript Express API for Beatslot waitlist, backed directly by MongoDB.

## Setup

1. Copy env file:
   - `cp .env.example .env`
2. Fill required variables in `.env`:
   - `MONGODB_URI`
   - `MONGODB_DB_NAME`
3. Install dependencies:
   - `npm install`
4. Run server:
   - `npm run dev`
5. Build production output:
   - `npm run build`

## Endpoints

- `GET /health`
- `POST /api/join-waitlist`

### `POST /api/join-waitlist` body

```json
{
  "artist_name": "Your artist name",
  "email": "you@example.com",
  "location": "City, Country"
}
```
