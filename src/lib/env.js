const trim = (value) => String(value ?? "").trim();

export const API_BASE_URL =
  trim(import.meta.env.VITE_API_BASE_URL) || "http://localhost:3000/api/v1";

export const TURNSTILE_SITE_KEY = trim(import.meta.env.VITE_TURNSTILE_SITE_KEY);
