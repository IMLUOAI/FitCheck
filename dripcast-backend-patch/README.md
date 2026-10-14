# DripCast social-layer backend patch (se_project_express)

Adds the API endpoints the DripCast app's social layer needs: **public profiles**, **fits** (saved outfits), and **fit battles** (A-vs-B voting). Follows the repo's existing conventions: CommonJS, celebrate/Joi validation, the error classes in `errors/`, bare arrays on GETs, `{ data }` on mutations, `auth` middleware setting `req.user._id`.

No database migration needed — Mongoose schemata are code-only; collections are created on first write. No new env vars, no new npm dependencies.

## Endpoint table

| Method | Path | Auth | Body / Query | Returns |
|---|---|---|---|---|
| GET | `/users/:id/public` | no | — | `{ _id, name, avatar }` (email/password can never leak — only those fields are selected) |
| GET | `/fits` | no | `?owner=<id>`, `?limit=` (default 20, cap 50), `?page=` (default 1) | bare array, newest first; `owner` and `items` populated (`_id name avatar` / `_id name imageUrl weather`) |
| POST | `/fits` | yes | `{ items: [<itemId>…] (1–10), weather: hot\|warm\|cold, note?: ≤140 chars }` | 201 `{ data: fit }`; every item must exist **and** belong to you |
| DELETE | `/fits/:id` | yes, owner only | — | `{ message, data }` |
| PUT | `/fits/:id/likes` | yes | — | `{ message, data: fit }` (idempotent `$addToSet`, mirrors item likes) |
| DELETE | `/fits/:id/likes` | yes | — | `{ message, data: fit }` |
| GET | `/battles` | no | `?status=open\|closed`, `?limit=`, `?page=` | bare array, newest first; `fitA`/`fitB` populated with their items, `createdBy` as public profile |
| POST | `/battles` | yes | `{ fitA: <id>, fitB: <id> }` (must exist, must differ) | 201 `{ data: battle }` |
| POST | `/battles/:id/vote` | yes | `{ pick: "A" \| "B" }` | `{ message, data: battle }`; rejected if already voted or battle closed — enforced by one atomic `findOneAndUpdate`, so double-votes are impossible even under concurrency |
| POST | `/battles/:id/close` | yes, creator only | — | `{ message, data: battle }` |

Notes:
- The app mounts routes at the root (see `app.js` — no `/api` prefix), so the paths above are the full paths, e.g. `https://<your-backend>/fits`.
- `GET /users/:id/public` is registered **before** the auth-guarded `/users` router in `routes/index.js` and carries no auth middleware — that's what keeps it public.
- Validation errors return 400 via celebrate; not-found → 404; wrong owner → 403.

## How to apply

```bash
cd /path/to/se_project_express
git apply /path/to/backend-social.patch
git status   # expect: 4 new files (models/fit.js, models/battle.js, controllers/fit.js, controllers/battle.js, routes/fit.js, routes/battle.js, utils/pagination.js) + edits to routes/index.js, controllers/user.js, middlewares/validation.js
npm start    # or: node app.js
```

The patch was verified with `node -c` on every touched file, plus a live `require()` of the route tree confirming all 10 routes register.

## Verify with curl (against localhost:3001)

```bash
BASE=http://localhost:3001

# 1. public profile (no token needed) — must NOT contain email/password
curl -s $BASE/users/<userId>/public

# 2. sign in for the authed calls
TOKEN=$(curl -s -X POST $BASE/signin -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"[SECURITY_DATA]"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['token'])")

# 3. create a fit from two of your item ids
curl -s -X POST $BASE/fits -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"items":["<itemId1>","<itemId2>"],"weather":"warm","note":"Friday look"}'

# 4. public feed
curl -s "$BASE/fits?limit=5" | head -c 400

# 5. battle: create, vote, close
BATTLE=$(curl -s -X POST $BASE/battles -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"fitA":"<fitId1>","fitB":"<fitId2>"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['_id'])")
curl -s -X POST $BASE/battles/$BATTLE/vote -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"pick":"A"}'
curl -s "$BASE/battles?status=open" | head -c 400
curl -s -X POST $BASE/battles/$BATTLE/close -H "Authorization: Bearer $TOKEN"
```

## Redeploy

After applying, redeploy the backend the way you normally do (Render). The DripCast mobile app reads `EXPO_PUBLIC_API_URL` — no app-side change needed since the base URL stays the same; the new paths just start working.
