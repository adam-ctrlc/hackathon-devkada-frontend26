import { API_BASE_URL } from "./env.js";
import { getAuthSession } from "./auth-session.js";

const normalizePath = (path) =>
  String(path ?? "").startsWith("/")
    ? String(path)
    : `/${String(path ?? "").trim()}`;

const buildUrl = (path) =>
  `${API_BASE_URL.replace(/\/$/, "")}${normalizePath(path)}`;

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
let csrfState = null;

const parseResponse = async (response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const buildApiError = (data, fallback = "Request failed") => {
  const error = new Error(data?.error ?? data?.message ?? fallback);
  error.status = data?.status ?? null;
  error.code = data?.code ?? null;
  error.retryAfterSeconds = data?.retryAfterSeconds ?? null;
  error.details = data?.details ?? null;
  error.fieldErrors = data?.details?.fieldErrors ?? null;
  error.formErrors = data?.details?.formErrors ?? null;
  error.data = data;
  return error;
};

export const getApiFieldError = (error, field) => {
  const value = error?.fieldErrors?.[field];
  return Array.isArray(value) ? value[0] : value;
};

export const isRateLimitError = (error) =>
  Number(error?.status) === 429 || error?.code === "RATE_LIMITED";

export const formatApiError = (error, fallback = "Request failed") => {
  const fieldErrors = error?.fieldErrors ?? {};
  const messages = Object.entries(fieldErrors)
    .flatMap(([field, values]) =>
      (Array.isArray(values) ? values : [values])
        .filter(Boolean)
        .map((message) => `${field}: ${message}`),
    )
    .slice(0, 3);

  if (messages.length) {
    return messages.join("; ");
  }

  return error?.message || fallback;
};

const getCsrfState = async () => {
  if (csrfState?.csrfToken && csrfState?.headerName) {
    return csrfState;
  }

  const response = await fetch(buildUrl("/security/csrf"), {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(data?.error ?? data?.message ?? "CSRF request failed");
  }

  csrfState = {
    csrfToken: data?.csrfToken,
    headerName: data?.headerName ?? "x-csrf-token",
  };

  return csrfState;
};

const attachAuthHeaders = (requestHeaders, auth) => {
  if (!auth) {
    return;
  }

  const session = getAuthSession();
  const accessToken = session?.tokens?.accessToken;
  if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }
};

const attachCsrfHeaders = async (requestHeaders, method, auth) => {
  if (!auth || !unsafeMethods.has(String(method).toUpperCase())) {
    return;
  }

  const csrf = await getCsrfState();
  if (csrf.csrfToken) {
    requestHeaders[csrf.headerName] = csrf.csrfToken;
  }
};

export const apiRequest = async (
  path,
  { method = "GET", body, headers = {}, auth = true, timeoutMs = 30000 } = {},
) => {
  const requestHeaders = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  attachAuthHeaders(requestHeaders, auth);
  await attachCsrfHeaders(requestHeaders, method, auth);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: requestHeaders,
      credentials: "include",
      signal: controller.signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Request timed out", { cause: error });
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await parseResponse(response);
  if (
    response.status === 403 &&
    auth &&
    unsafeMethods.has(String(method).toUpperCase()) &&
    String(data?.error ?? "")
      .toLowerCase()
      .includes("csrf")
  ) {
    csrfState = null;
    return apiRequest(path, { method, body, headers, auth, timeoutMs });
  }

  if (!response.ok) {
    const error = buildApiError(data);
    error.status = response.status;
    throw error;
  }

  return data;
};

export const apiFormRequest = async (
  path,
  {
    method = "POST",
    formData,
    headers = {},
    auth = true,
    timeoutMs = 30000,
  } = {},
) => {
  const requestHeaders = {
    Accept: "application/json",
    ...headers,
  };

  attachAuthHeaders(requestHeaders, auth);
  await attachCsrfHeaders(requestHeaders, method, auth);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: requestHeaders,
      credentials: "include",
      signal: controller.signal,
      body: formData,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Request timed out", { cause: error });
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await parseResponse(response);
  if (
    response.status === 403 &&
    auth &&
    unsafeMethods.has(String(method).toUpperCase()) &&
    String(data?.error ?? "")
      .toLowerCase()
      .includes("csrf")
  ) {
    csrfState = null;
    return apiFormRequest(path, { method, formData, headers, auth, timeoutMs });
  }

  if (!response.ok) {
    const error = buildApiError(data);
    error.status = response.status;
    throw error;
  }

  return data;
};
