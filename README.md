# FERRA

Landing site for [ferra.es](https://ferra.es).

A static Cloudflare Pages project serving a "coming soon" page with an email-subscription form (Cloudflare Turnstile + KV-backed list), plus `/privacy` and `/terms` legal pages in English and Spanish.

## Structure

```
index.html                  # Landing page with subscription form
privacy.html                # Privacy policy (EN + ES, side-by-side)
terms.html                  # Terms of service (EN + ES, side-by-side)
functions/api/subscribe.js  # Pages Function: validates Turnstile, writes to KV
_headers                    # Static security headers for all pages
wrangler.jsonc              # Cloudflare Pages config (KV binding)
```

## Environment

Set the following as a Cloudflare Pages secret (not in this repo):

- `TURNSTILE_SECRET` — Cloudflare Turnstile secret key (server-side)

The Turnstile **site key** is hardcoded in `index.html` — site keys are public by design and safe to expose.

The KV namespace `SUBSCRIBERS` is bound via `wrangler.jsonc`. To swap it for a different namespace, update the `id` field.

## Local development

```sh
npm i -g wrangler
wrangler pages dev .
```

## Deploy

Push to `main`. Cloudflare Pages builds and deploys automatically.

## Data

Subscribers are stored at key `sub:<email>` in the `SUBSCRIBERS` KV namespace. A running counter is at `meta:count`.
