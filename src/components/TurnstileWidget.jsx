import { useEffect, useRef, useState } from "react";
import { TURNSTILE_SITE_KEY } from "../lib/env.js";

let scriptPromise;
let trustedTypesPolicy;

const getTrustedTypesPolicy = () => {
  if (typeof window === "undefined" || !window.trustedTypes) {
    return null;
  }

  if (!trustedTypesPolicy) {
    trustedTypesPolicy = window.trustedTypes.createPolicy("turnstile", {
      createScriptURL: (value) => value,
    });
  }

  return trustedTypesPolicy;
};

const loadTurnstileScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Turnstile requires a browser"));
  }

  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(
        'script[data-turnstile-script="true"]',
      );
      if (existing) {
        existing.addEventListener("load", () => resolve(window.turnstile));
        existing.addEventListener("error", () =>
          reject(new Error("Failed to load Turnstile")),
        );
        return;
      }

      const script = document.createElement("script");
      const scriptUrl =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.src =
        getTrustedTypesPolicy()?.createScriptURL(scriptUrl) ?? scriptUrl;
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = "true";
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => reject(new Error("Failed to load Turnstile"));
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
};

export function TurnstileWidget({ onToken, onExpire, className = "" }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const tokenRef = useRef(onToken);
  const expireRef = useRef(onExpire);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    tokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    expireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    let cancelled = false;

    const renderWidget = async () => {
      try {
        await loadTurnstileScript();
        if (cancelled || !containerRef.current || !window.turnstile) {
          return;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => {
            setStatus("solved");
            tokenRef.current?.(token);
          },
          "expired-callback": () => {
            setStatus("expired");
            expireRef.current?.();
          },
          "error-callback": () => {
            setStatus("error");
            expireRef.current?.();
          },
        });

        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    };

    renderWidget();

    return () => {
      cancelled = true;
      const widgetId = widgetIdRef.current;
      if (widgetId != null && window.turnstile?.remove) {
        window.turnstile.remove(widgetId);
      }
      widgetIdRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) {
    return (
      <div className={`text-[12px] text-red-600 ${className}`}>
        Turnstile site key is not configured.
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={containerRef} />
      {status === "error" && (
        <p className="mt-2 text-[12px] text-red-600">
          Turnstile could not load.
        </p>
      )}
    </div>
  );
}
