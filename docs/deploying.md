# Deploying

The site is static except for one thing: Scripture has to be fetched with a
credential, and the credential must not be in the bundle.

## Why there is a function at all

Vite compiles anything prefixed `VITE_` straight into the JavaScript it ships. A
key put there is readable by anyone who opens the dev tools on the deployed site.
So the env names here are **not** prefixed, the browser calls `/scripture/...` on
its own origin, and something server-side attaches the header on the way out.

In development that something is `vite.config.ts`. In production it is an edge
function. Same path, same contract, so no client code changes between the two.

A test fails if a `VITE_*KEY` reappears in client code, because this is the kind
of thing that gets undone by accident six weeks later.

## The core, and the three adapters

`functions-shared/scripture.ts` holds the whole proxy, written against `Request`
and `Response` rather than any host's helper types. The adapters are three lines
each:

| host | file | key comes from |
| --- | --- | --- |
| Netlify Edge | `netlify/edge-functions/scripture.ts` | `Netlify.env.get(...)` |
| Vercel Edge | `api/scripture/[...path].ts` | `process.env` |
| Cloudflare Pages | `functions/scripture/[[path]].ts` | `context.env` |

Pick one and delete the other two, or leave them; they cost nothing.

## Netlify

```
npm run build
```

Then in the site settings add an environment variable `YOUVERSION_APP_KEY`, and
`GLOO_API_KEY` if you have one. `netlify.toml` already sets the build command,
and the publish directory. The editor is `index.html`, so the front door is
already at the root and there is no redirect to get wrong.

## Vercel

`vercel.json` covers the build and the rewrite. Add `YOUVERSION_APP_KEY` under
Project Settings, Environment Variables. The function is picked up from `api/`
automatically.

## Cloudflare Pages

Build command `npm run build`, output directory `dist`. Add the key as a
plaintext environment variable, or as a secret if you prefer. Functions are
picked up from `functions/`.

## What the proxy refuses, and why

Proxying is trivial. Proxying without handing a stranger your quota is the part
worth writing carefully, so every segment of the incoming path is checked before
anything is forwarded.

| refusal | status | reason |
| --- | --- | --- |
| anything but `bibles/{id}/passages/{ref}` | 404 | otherwise it is an open relay onto the whole API |
| an edition not in the allow list | 400 | an unbounded id lets a caller walk the catalogue on your key |
| a reference that is not USFM | 400 | `../../` and injection attempts never reach the network |
| any method but GET | 405 | nothing here writes |
| no key configured | 503 | said plainly, because an empty 200 would read as a verse that does not exist |
| upstream 401 | 500 | that is our misconfiguration, not the caller's mistake |

The upstream body is never passed through on an error, because a platform error
message can quote the credential back at you.

Ten tests in `src/__tests__/scriptureProxy.test.ts` cover all of it, including a
check that nothing left the building on a refusal.

## Caching

A verse does not change. A served passage carries
`max-age=3600, s-maxage=86400, stale-while-revalidate=604800`, so a judge
clicking around the editor costs one upstream call per verse rather than one per
click. Refusals carry `no-store`.

## After deploying, check three things

1. `/scripture/bibles/93/passages/LUK.22.57` returns JSON with a `content` field.
2. `/scripture/bibles/1/passages/LUK.22.57` returns 400. If it returns a verse,
   the allow list is not being applied and the deployment is an open relay.
3. Open the deployed page, view source, and search the bundle for your key. It
   must not be there.

The third one is the only test that matters if the first two pass.
