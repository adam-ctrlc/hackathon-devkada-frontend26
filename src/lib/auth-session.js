const AUTH_SESSION_KEY = "kainwise-auth-session";

const canUseStorage = () =>
  typeof window !== "undefined" && window.localStorage;

export const getAuthSession = () => {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setAuthSession = (session) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
};

export const clearAuthSession = () => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_KEY);
};
