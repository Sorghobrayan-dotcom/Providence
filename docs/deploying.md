# Deploying

The site is static except for two things, and both are credentials that must not
reach the browser: Scripture is fetched with an App Key, and Gloo is reached with
a bearer token bought from a client id and secret.

## Why there are functions at all

Vite compiles anything prefixed `VITE_` straight into the JavaScript it ships. A
key put there is readable by anyone who opens the dev tools on the deployed site.
So the env names here are **not** prefixed, the browser calls `/scripture/...`
and `/gloo/...` on its own origin, and something server-side attaches the
credential on the way out.

In development that something is `vite.config.ts`. In production it is an edge
function. Same paths, same contract, so no client code changes between the two.

A test fails if a `VITE_*KEY` reappears in client code, because this is the kind
of thing that gets undone by accident six weeks later.

## Two cores, three adapters each

The proxies are written against `Request` and `Response` rather than any host's
helper types, so one file serves all three. The adapters are a handful of lines.

| | Netlify Edge | Vercel Edge | Cloudflare Pages |
| --- | --- | --- | --- |
| Scripture | `netlify/edge-functions/scripture.ts` | `api/scripture/[...path].ts` | `functions/scripture/[[path]].ts` |
| Gloo | `netlify/edge-functions/gloo.ts` | `api/gloo/[...path].ts` | `functions/gloo/[[path]].ts` |
| credentials from | `Netlify.env.get(...)` | `process.env` | `context.env` |

Pick one column and delete the other two, or leave them; they cost nothing.

`functions-shared/scripture.ts` and `functions-shared/gloo.ts` hold the whole of
it. The Gloo one is a middleware rather than a rewrite, because Gloo is not a
static key: the id and secret buy a token that expires, so it has to await one
before it can forward anything. It reuses `GlooTokenSource`, the same class the
dev proxy uses and the tests cover, and holds it at module scope — an edge
isolate is reused between requests, and that is the difference between one token
exchange and one per line of dialogue.

## What to deploy

**The repository, not the `dist` folder.** Dragging `dist` into Netlify produces
a site that loads, renders, and has no functions: every character goes silent and
the console shows verses failing to resolve. It looks like a broken demo and it
is a missing deploy.

Connect the git repository, or from the repository root:

```
netlify deploy --build --prod
```

`netlify.toml` already sets the build command and the publish directory, and
Netlify picks the functions up from `netlify/edge-functions/`. The editor is
`index.html`, so the front door is at the root and there is no redirect to get
wrong.

## The environment

Three variables, in the site settings and never in the repository:

```
YOUVERSION_APP_KEY      platform.youversion.com
GLOO_CLIENT_ID          Gloo AI Studio -> API Credentials
GLOO_CLIENT_SECRET      the same page
```

The site works with only the first: characters resolve their passages and speak
in Scripture rather than in their own words. It works with neither, and then it
is silent, which is the designed behaviour and not a failure. Nothing is ever
invented to fill the gap.

Vercel takes the same three under Project Settings, Environment Variables.
Cloudflare Pages takes them as plaintext variables or secrets; build command
`npm run build`, output directory `dist`.

## What the proxies refuse, and why

Proxying is trivial. Proxying without handing a stranger your quota is the part
worth writing carefully. Scripture checks every segment of the path before
anything is forwarded; Gloo rebuilds the request from the fields it is willing to
send, so a caller cannot reach for a tool, a longer answer or a different model
by adding a key nobody looked at.

| refusal | status | reason |
| --- | --- | --- |
| anything but `bibles/{id}/passages/{ref}` | 404 | otherwise it is an open relay onto the whole API |
| an edition not in the allow list | 400 | an unbounded id lets a caller walk the catalogue on your key |
| a reference that is not USFM | 400 | `../../` and injection attempts never reach the network |
| any method but GET, on Scripture | 405 | nothing there writes |
| anything but `/ai/v2/chat/completions` | 404 | one endpoint is all the editor uses |
| any method but POST, on Gloo | 405 | |
| more than four messages, or a body over 8 kB | 400, 413 | a bark is twenty words; anything near the limit is not one |
| a message that is not from `system` or `user` | 400 | |
| `max_tokens` above 200, `temperature` outside 0–1.5 | clamped | the caller is the internet |
| `model`, `tools`, anything else | dropped | the body is rebuilt, never passed through |
| no credentials configured | 503 | `GlooVoice` reads 503 as *unconfigured* and anything else as *silent*, and telling them apart is an afternoon saved |
| upstream 401 | 500 or 502 | that is our misconfiguration, not the caller's mistake |

Neither proxy passes an upstream error body through, because a platform error
message can quote the credential back at you.

Twenty three tests cover both, in `src/__tests__/scriptureProxy.test.ts` and
`src/__tests__/glooProxy.test.ts`, including that nothing left the building on a
refusal.

## Caching

A verse does not change. A served passage carries
`max-age=3600, s-maxage=86400, stale-while-revalidate=604800`, so a judge
clicking around the editor costs one upstream call per verse rather than one per
click. Generated dialogue and every refusal carry `no-store`: the same character
in the same state should not be served yesterday's line from a CDN.

## After deploying, check four things

1. `/scripture/bibles/93/passages/LUK.22.57` returns JSON with a `content` field.
2. `/scripture/bibles/1/passages/LUK.22.57` returns 400. If it returns a verse,
   the allow list is not being applied and the deployment is an open relay.
3. Load the page, walk up to a character and press <kbd>E</kbd>. If he speaks a
   line that is not a verse, Gloo is wired. If he narrates instead, `/gloo/...`
   is not being served — almost always because `dist` was deployed rather than
   the repository.
4. View source and search the bundle for your key. It must not be there.

The fourth is the only one that matters if the first three pass.
