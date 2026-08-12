import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number.parseInt(env.PORT ?? "", 10);

  return {
    plugins: [react(), tailwindcss()],
    server: Number.isFinite(port) ? { port } : undefined,
  };
});
