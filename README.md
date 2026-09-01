# Bible Terminal

A terminal-styled reader for the **Ethiopian Orthodox Tewahedo Bible** — all 81 books —
that shows a shared verse edition every hour with an AI interpretation, and lets you
ask questions answered from scripture.

## One shared edition per hour

The home page is generated from a UTC hour key. `/api/hourly` deterministically selects
the verse, passage, and Ethiopian-canon slot, so different browsers, regions, reloads,
and server restarts all resolve to the same references. The refresh button only reloads
the current edition; it never redraws it.

The selector is shared by the server and browser. If the serverless content route is
missing, slow, or temporarily unhealthy, the browser runs that same deterministic
selection against the public scripture sources. This keeps the verses visible without
creating a different edition. Sections render as soon as each one is ready rather than
waiting for all three requests to finish.

Interpretations use the same immutable `hour + slot` address. A successful response is
cached by Vercel's CDN for two hours and by the browser for that edition, so the normal
cost is three completed interpretations per hour for the whole site rather than three
new model calls per visitor or refresh. Failed model responses are not cached. The
generic static reflection was removed: the UI reports a temporary failure honestly and
offers a retry instead of showing repeated filler as though it were an interpretation.

AI runs on [NVIDIA's free OpenAI-compatible endpoint](https://build.nvidia.com).

## Setup

```bash
npm install
cp .env.example .env.local     # then paste your key
npm run dev
```

Get a key at [build.nvidia.com/settings/api-keys](https://build.nvidia.com/settings/api-keys)
(free, no card). It goes in `.env.local` as:

```
NVIDIA_API_KEY=nvapi-...
```

The variable is deliberately **not** prefixed with `VITE_`, so Vite cannot inline it into
the client bundle. It is read only by the dev proxy and the serverless function.

## Why there's a proxy

`integrate.api.nvidia.com` sends no `Access-Control-Allow-Origin` header, so the browser
cannot call it directly — a CORS preflight from `localhost` returns `200` with no CORS
headers and the request is blocked. Everything therefore goes through a same-origin proxy
at `/api/nvidia/chat/completions`:

| Environment | Handled by |
| --- | --- |
| `npm run dev` | `server.proxy` in `vite.config.ts` |
| Production | `api/nvidia/chat/completions.ts` (Vercel Edge Function) |

That also keeps the API key server-side in both environments. The proxy allowlists the
model, clamps `max_tokens`, and rate-limits per IP and globally, because a deployed
unauthenticated proxy is otherwise an open relay for anyone who finds the URL.

## The model chain

`src/services/models.ts` holds an ordered chain. The first healthy model
answers; one that reports itself unavailable is put in a ten-minute cooldown and
the next is tried immediately.

| Order | Model | Role |
| --- | --- | --- |
| 1 | `moonshotai/kimi-k3` | Preferred. Fast, and strong on Ge'ez. |
| 2 | `nvidia/nemotron-3-ultra-550b-a55b` | Deepest answers, but one to three minutes each. |
| 3 | `nvidia/nemotron-3-nano-30b-a3b` | Last resort. Fast, fine in English, weak on Ge'ez. |

The chain heals on its own: when a degraded model comes back, the first request
after its cooldown expires picks it up again — no redeploy, no config change.
The UI names the model that answered, so "is this actually reaching NVIDIA?" is
answerable at a glance; genuine offline filler is labelled `offline fallback
text` instead.

Adding a model means adding it to `MODEL_CHAIN` **and** to `ALLOWED_MODELS` in
`api/nvidia/chat/completions.ts`. Reasoning models each suppress their thinking
differently — kimi-k3 takes a `reasoning_effort` parameter, Nemotron needs the
literal phrase `detailed thinking off` at the top of the system prompt.

### Failure modes worth knowing

- NVIDIA reports a withdrawn model as **`400 DEGRADED function cannot be invoked`**.
  On a streaming request the SDK surfaces only `400 status code (no body)`, so the
  reason cannot be read — a 400 is therefore treated as "this model is not serving"
  and the chain falls through.
- The endpoint can answer **HTTP 200 and then emit `Service temporarily overloaded`
  inside the SSE stream**. That error carries no HTTP status, so it is matched on
  message text; otherwise a retryable overload looks like a hard failure.

## Verifying a model before trusting it with scripture

```bash
npm run bench:translation                          # the whole chain
node scripts/bench-translation.mjs moonshotai/kimi-k3
```

1 Enoch survives complete only in Ge'ez, and the dataset carries R.H. Charles's
1917 English beside it. The benchmark asks a model to translate the Ge'ez cold
and measures how much of Charles's vocabulary it independently recovers. A model
genuinely reading the Ge'ez scores around 55–60%; one that is guessing scores in
the single digits. Run this before pointing the translation script at any model.

## Rate limiting

NVIDIA's free tier allows roughly 40 requests/minute. The app limits traffic in several ways:

- The three hourly interpretations are generated server-side and shared through the CDN.
- Interactive passage questions still use `src/services/rateLimit.ts` for client pacing.
- Retries on 429 with exponential backoff plus jitter, honouring `Retry-After`, spanning a
  full minute window before giving up.
- Failed hourly generations are never cached, and the UI offers an explicit retry instead
  of substituting generic text.

`moonshotai/kimi-k3` is a **reasoning** model: its thinking tokens come out of the same
`max_tokens` budget as the answer. With too small a ceiling the reasoning eats everything
and `content` returns empty. The app uses `reasoning_effort: 'low'` with a generous
ceiling. NVIDIA accepts `low`, `high`, and `max` for this model — not `medium`.

## Deploy (Vercel)

```bash
vercel
```

Set `NVIDIA_API_KEY` in the project's environment variables. No `vercel.json` is needed —
the function is found by its filesystem path. Use `vercel dev` to exercise the real edge
function locally, including its rate limiting.

## The canon

`src/data/ethiopianCanon.ts` is the single source of truth: 46 Old Testament and 35 New
Testament books, numbered as the Church numbers them. Two things it models explicitly:

- **Bundled books.** "I and II Samuel" is one book here, so a canon entry maps to one or
  more underlying texts. A chapter number runs across the whole book — Jeremiah 55 lands
  in Lamentations 3, because the Ethiopian Jeremiah is a cycle.
- **Meqabyan is not Maccabees.** The Ethiopian Meqabyan books are unrelated compositions
  that merely share an English name with the Greek books of Maccabees. Both are present
  and kept distinct.

Text comes from two places, chosen per book by `src/services/canonRouter.ts`:

| Source | Covers |
| --- | --- |
| bible-api.com | The 66 protocanonical books, plus the deuterocanon — Tobit, Judith, Sirach, Wisdom, Baruch, 1–2 Maccabees, 1–2 Esdras, Manasseh, Susanna, Bel, Azariah. (These resolve even though bible-api's own book listing omits them.) |
| `LPettay/ethiopian-bible` via jsDelivr | The uniquely Ethiopian books — Enoch, Jubilees, Meqabyan, 4 Baruch, Kebra Nagast, Sinodos — in Ge'ez with word-level transliteration. |

**Known gap:** 2 Meqabyan has no digital text in any open dataset we could find. It is
listed in the canon browser and marked unavailable rather than quietly omitted.

## AI translation of the Ge'ez-only books

225 chapters (1 & 3 Meqabyan, Sinodos, Testament of Our Lord, Ethiopic Clement and a few
related works) survive in Ge'ez with no public-domain English translation.

```bash
node scripts/translate-geez.mjs --dry-run    # show the plan
node scripts/translate-geez.mjs --book 3Meq  # one book
node scripts/translate-geez.mjs              # everything still missing
node scripts/translate-geez.mjs --model moonshotai/kimi-k3   # override the model
```

### Choosing the model

The default is `nvidia/nemotron-3-ultra-550b-a55b`, picked by benchmark rather
than reputation. The dataset carries R.H. Charles's independent 1917 translation
of 1 Enoch, which makes a usable ground truth: models were asked to translate
1 Enoch from the Ge'ez alone and scored on word overlap with Charles.

| Model | Verses returned | Overlap with Charles |
| --- | --- | --- |
| `nvidia/nemotron-3-ultra-550b-a55b` | 9/9 and 3/3 | **56%** on both chapters |
| `openai/gpt-oss-120b` | 1/9 | 2% — fabricated the rest |
| `nvidia/nemotron-3.5-lightning-30b-a3b` | — | leaked reasoning, no JSON |
| `nvidia/nemotron-3-nano-30b-a3b` | — | leaked reasoning, no JSON |
| `nvidia/riva-translate-4b-instruct-*` | — | 8192 total context; modern languages only |

Add a model by giving it an entry in `MODEL_PROFILES`. Reasoning models each
suppress their thinking differently — kimi-k3 takes a `reasoning_effort`
parameter, while Nemotron needs the literal phrase `detailed thinking off` at
the top of the system prompt or it returns prose instead of JSON.

Output records which model produced each chapter, so a mixed run stays honest:
the reader's banner names the model for the chapter being read. Chapters written
before a model switch are left alone unless you pass `--force`.

Output lands in `src/data/geez-en/{book}/{chapter}.json` and is **committed**. Translating
offline rather than per page view keeps the wording stable between reloads, keeps every
rendered translation reviewable in git, and costs readers nothing. The script is resumable
— it skips chapters already written unless you pass `--force` — throttles itself, and
refuses to write a chapter where the model dropped a verse.

It also retries 429s, 5xx, and NVIDIA's `400 DEGRADED function cannot be invoked` (which
is transient despite the 4xx), re-asks up to three times when a model returns unparseable
output, and **aborts the whole run after five consecutive failures**. That last one
matters: when NVIDIA takes a model out of service it answers every request identically,
and without the circuit breaker a single outage burns through every remaining chapter in
seconds and reports them all as failures.

These translations render behind a red, non-dismissible banner naming the model and
stating that they are not authoritative and not approved by any church body. That labelling
is load-bearing; please don't soften it.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with the NVIDIA proxy |
| `npm run build` | Typecheck, then production build |
| `npm run typecheck` | `tsc --noEmit` across app, vite config, and `api/` |
| `npm run lint` | ESLint |
| `npm run translate:geez` | Translate the untranslated Ge'ez chapters |
| `npm run bench:translation` | Score models on Ge'ez against a human translation |

## Attribution

- **Ge'ez text** — [Beta Masaheft](https://betamasaheft.eu/), Universität Hamburg. **CC BY-SA 4.0.**
- **Septuagint English** — Sir Lancelot Brenton (1851). Public domain.
- **Masoretic English** — King James Version (1611/1769). Public domain.
- **1 Enoch and Jubilees** — R.H. Charles (1917 / 1902). Public domain.
- **Protocanonical and deuterocanonical text** — [bible-api.com](https://bible-api.com). Public domain.
- Ge'ez dataset compiled by [LPettay/ethiopian-bible](https://github.com/LPettay/ethiopian-bible).

The Ge'ez text is share-alike; keep the attribution if you redistribute it.
