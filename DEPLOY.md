# Deploying to EC2

The Node server serves both the API (`/api/*`) and the built React client (everything else) from a
single process, so a deploy is: get the code on the box → run migrations → build → restart.

## Database migrations run automatically

`server/src/server.ts` runs `prisma migrate deploy` on startup, before the app accepts traffic —
so **any** launch method self-migrates: `npm start`, `pm2 start npm -- start`,
`pm2 start dist/server.js`, systemd, a plain `node dist/server.js`.

It runs when `NODE_ENV=production` (or force it anywhere with `MIGRATE_ON_BOOT=true` in
`server/.env`; `MIGRATE_ON_BOOT=false` disables it).

`prisma migrate deploy` only applies migration folders under `server/prisma/migrations/` that
haven't run yet on that database, and does nothing if there are none. It never generates new
migrations and never prompts — safe on every restart. If a migration fails, the process exits
non-zero and the app does **not** start (PM2 will show it errored) — fix the DB and restart.

`scripts/deploy.sh` also runs `prisma migrate deploy` explicitly (step 3) so a bad migration fails
the deploy *before* the build and restart, not after.

## One-time setup on a fresh EC2 box

```bash
# prerequisites: Node 20+, MySQL 8 (local or RDS), git, and PM2 (npm i -g pm2)

git clone <repo> /var/www/mlmlottery
cd /var/www/mlmlottery/server
cp .env.example .env
nano .env            # set DATABASE_URL, NODE_ENV=production, JWT secrets, APP_BASE_URL

# create the database + user in MySQL first, e.g.:
#   CREATE DATABASE mlmlottery CHARACTER SET utf8mb4;
#   CREATE USER 'mlmlottery'@'%' IDENTIFIED BY 'S@rbajit8';
#   GRANT ALL PRIVILEGES ON mlmlottery.* TO 'mlmlottery'@'%';
#   FLUSH PRIVILEGES;

npm ci
npx prisma migrate deploy    # builds the schema
npm run seed                 # creates the first admin (uses SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)

bash scripts/deploy.sh       # builds server + client, starts under PM2
pm2 startup                  # so PM2 comes back after a reboot (run the line it prints)
pm2 save
```

### ⚠️ `DATABASE_URL` password encoding

The URL parser treats `@ : / ? #` as delimiters. If the DB password contains any of them,
percent-encode it:

| char | use |
|---|---|
| `@` | `%40` |
| `:` | `%3A` |
| `/` | `%2F` |

Example — password `S@rbajit8`:

```
DATABASE_URL="mysql://mlmlottery:S%40rbajit8@localhost:3306/mlmlottery"
```

An un-encoded `@` is why you'd see `P1001: Can't reach database server` even with the right password.

## Every deploy after that

Get the new code onto the box (`git pull`, rsync, CI artifact…), then:

```bash
cd /var/www/mlmlottery/server
bash scripts/deploy.sh
```

That script: `npm ci` → `prisma generate` → **`prisma migrate deploy`** → build server → build
client → `pm2 reload` (and the app migrates again on boot — a no-op if step 3 already applied
everything).

## Reverse proxy (optional)

`server/.env` `APP_BASE_URL` should be the public URL. Point nginx/ALB at the Node port (`PORT`,
default 5000). The server already sets `trust proxy`, so `X-Forwarded-*` headers are honoured.
