# Hosted AI suggestions

Vercel project `gridlock` serves `https://gridlock-pink.vercel.app` from `safuentees/gridlock-planner`, production branch `main`. This deployment repository differs from the older local checkout’s remote; use the Vercel-linked repository for updates.

The Vite browser build cannot serve an API. `api/pair-recommendation.ts` adds a Node function, reusing the local middleware’s validation, evidence prompt, output checks and provider call. It handles both pre-parsed Vercel bodies and raw request streams. The function reads `OPENAI_API_KEY` and optional `OPENAI_MODEL` at runtime; set these under Vercel Project → Settings → Environment Variables for Production, then redeploy. Preview environments require their own key configuration. Never use a `VITE_` key, commit secrets or send the OpenAI key from the browser.

## Public access and bounds

The user chose public demo suggestions with limits on September 27, 2026. HTTPS requests must have a matching Origin and Host from the production alias or trusted Vercel deployment environment URLs. These browser origin checks are not user authentication; non-browser clients can imitate them. No CORS wildcard is supplied.

Configure a Vercel Firewall fixed-window rule for the suggestion path, 12 requests per 60 seconds keyed by IP, returning 429. Use the optional trailing-slash path form too. This limits requests across function instances; Vercel documents counters as per-region. Shared networks share an IP allowance, and multiple IPs/regions can exceed that allowance. It is not a global spending cap. Vercel’s Hobby plan includes one rate-limit rule and a request allowance; no plan upgrade is required for this configuration.

The function also retains two concurrent requests and twelve requests per minute per instance, a 20 KB input limit, 20-second upstream timeout and 180 output-token limit. Vercel’s function deadline is 30 seconds. The per-instance limiter is a fallback, not a distributed quota. The browser understands non-JSON firewall 429 responses and reports service errors without misleading local-server instructions.

## Verification

Run notices, formatting, unit tests and production build. Tests cover the hosted origin allowlist, remote clients, parsed/raw bodies, oversized data, missing configuration and request caps, while retaining local-only behavior. Check Vercel’s build includes `api/pair-recommendation` and reports Ready. Verify the active firewall rule through the control-plane API. A live suggestion through the UI is separate from mocked provider tests and build success.

References: [Vercel Node functions](https://vercel.com/docs/functions/runtimes/node-js), [WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting), [OpenAI production guidance](https://developers.openai.com/api/docs/guides/production-best-practices).
