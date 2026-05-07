import { defineConfig, loadEnv } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

const parseHosts = (value) =>
  String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");

const buildCsp = (env) => {
  const extraConnect = parseHosts(env.VITE_CSP_CONNECT_EXTRA);
  const extraImg = parseHosts(env.VITE_CSP_IMG_EXTRA);

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    ["img-src 'self' data: blob: https://challenges.cloudflare.com", extraImg]
      .filter(Boolean)
      .join(" "),
    [
      "connect-src 'self' blob: data:",
      extraConnect,
      "https://challenges.cloudflare.com https://generativelanguage.googleapis.com wss://generativelanguage.googleapis.com https://world.openfoodfacts.org",
    ]
      .filter(Boolean)
      .join(" "),
    "frame-src 'self' https://challenges.cloudflare.com",
    "child-src 'self' https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const csp = buildCsp(env);

  return {
    plugins: [
      react(),
      tailwindcss(),
      babel({ presets: [reactCompilerPreset()] }),
      {
        name: "inject-csp",
        transformIndexHtml(html) {
          return html.replace("__CSP__", csp);
        },
      },
    ],

    server: {
      host: "0.0.0.0",
      port: 5173,
      allowedHosts: [
        "localhost",
        "10.97.119.212",
        ".trycloudflare.com",

        // Add your custom Cloudflare domain here if you have one:
        // "your-domain.com",
        // "www.your-domain.com",
        // "app.your-domain.com",
      ],
      headers: {
        "Content-Security-Policy": csp,
      },
    },

    preview: {
      host: "0.0.0.0",
      port: 4173,
      allowedHosts: [
        "localhost",
        "10.97.119.212",
        ".trycloudflare.com",

        // Add your custom Cloudflare domain here if you have one:
        // "your-domain.com",
        // "www.your-domain.com",
        // "app.your-domain.com",
      ],
      headers: {
        "Content-Security-Policy": csp,
      },
    },
  };
});
