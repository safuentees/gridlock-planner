import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createRecommendationMiddleware } from "./server/pairRecommendation";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "OPENAI_");
  const config = {
    apiKey: env.OPENAI_API_KEY ?? "",
    model: env.OPENAI_MODEL || "gpt-4.1-mini",
  };
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "gridlock-local-recommendation",
        configureServer(server) {
          server.middlewares.use(createRecommendationMiddleware(config));
        },
        configurePreviewServer(server) {
          server.middlewares.use(createRecommendationMiddleware(config));
        },
      },
    ],
  };
});
