import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://challenges.cloudflare.com",
  "connect-src 'self' blob: data: http://localhost:3000 ws://localhost:5173 https://challenges.cloudflare.com https://generativelanguage.googleapis.com wss://generativelanguage.googleapis.com https://world.openfoodfacts.org",
  "frame-src 'self' https://challenges.cloudflare.com",
  "child-src 'self' https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  server: {
    headers: {
      "Content-Security-Policy": csp,
    },
  },
  preview: {
    headers: {
      "Content-Security-Policy": csp,
    },
  },
});
