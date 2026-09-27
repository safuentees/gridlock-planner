import type { IncomingMessage, ServerResponse } from "node:http";
import { createRecommendationMiddleware } from "../server/pairRecommendation.js";

// Keys remain in Vercel's server environment, never in the Vite browser bundle.
const handler = createRecommendationMiddleware({
  apiKey: process.env.OPENAI_API_KEY ?? "",
  model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  allowedOrigins: [
    "https://gridlock-pink.vercel.app",
    ...[
      process.env.VERCEL_URL,
      process.env.VERCEL_BRANCH_URL,
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
    ]
      .filter(
        (host): host is string => Boolean(host) && /^[a-z0-9.-]+$/i.test(host!),
      )
      .map((host) => `https://${host}`),
  ],
});

export default function recommendation(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  return handler(req, res, () => {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Suggestion endpoint not found." }));
  });
}
