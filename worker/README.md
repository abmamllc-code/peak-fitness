# PEAK sync (Cloudflare Worker + D1)

The GitHub Pages site keeps working with sync turned off. `sync.json` in the site root ships as:

```json
{ "enabled": false, "workerUrl": "" }
```

Turn sync on only after this Worker is deployed.

Adnan, Adam and Ismail sign in with a username and a PIN. The PIN is hashed in D1 (PBKDF2). Each athlete has one JSON record: meals, workouts, weights, XP and streaks. Ismail can read a short summary of both athletes and cannot change their data. The phone keeps working offline and pushes when it is back online. If both phones changed the same account, the newer save wins.

## What you need from Cloudflare

Create an API token at https://dash.cloudflare.com/profile/api-tokens (Create Custom Token).

Permissions:

- Account / Workers Scripts / Edit
- Account / D1 / Edit
- Account / Account Settings / Read

Account resources: include the account that should own the Worker.

Also copy the Account ID from the Workers overview (or any domain overview) in the dashboard.

You do not need a zone or a paid plan. Workers and D1 free tiers are enough for three people.

## Deploy

From this `worker` folder:

```bash
npx wrangler login
# or, if you use a token instead of the browser:
# export CLOUDFLARE_API_TOKEN=...
# export CLOUDFLARE_ACCOUNT_ID=...

npx wrangler d1 create peak-fitness
```

Copy the printed `database_id` into `wrangler.toml`, replacing `00000000-0000-4000-8000-000000000001`.

Set the Pages origin if it is not `https://abmamllc-code.github.io` (origin only, no path). Custom domain? Add it, comma-separated, in `ALLOWED_ORIGINS`.

```bash
npx wrangler d1 migrations apply peak-fitness --remote
npx wrangler secret put ADNAN_PIN
npx wrangler secret put ADAM_PIN
npx wrangler secret put ISMAIL_PIN
npx wrangler deploy
```

Each PIN is 4 to 12 digits. The secret is only used to create the account the first time someone signs in. It is not stored as the PIN.

Then in the site repo, edit `sync.json`:

```json
{
  "enabled": true,
  "workerUrl": "https://peak-fitness-sync.<your-subdomain>.workers.dev"
}
```

Commit and push so GitHub Pages publishes it. Phones pick the file up on next load (it is not kept in the app cache).

## Reset a PIN

```bash
npx wrangler d1 execute peak-fitness --remote --command "DELETE FROM users WHERE id = 'adnan'"
npx wrangler secret put ADNAN_PIN
```

The next sign-in creates the account again with the new PIN. Their saved meals and workouts stay in `athlete_state`.

## Local check

```bash
cp .dev.vars.example .dev.vars
npx wrangler d1 migrations apply peak-fitness --local
npx wrangler dev
```

`.dev.vars` is gitignored. The sample PINs are for your machine only.
