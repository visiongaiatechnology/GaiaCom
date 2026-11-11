/* VGT GLASS 2100 — API CLIENT
   Single source of BASE_URL, fetch/apiFetch, auth headers, session token state,
   session rotation and response handling. Domain modules import from here only
   (no circular imports). */

const DESKTOP_API_ORIGIN = 'https://beta.gaiacom.de';

function configuredApiOrigin() {
	const configured = import.meta.env.VITE_API_URL;
  if (!configured) {
    return '';
  }
  try {
    const url = new URL(configured);
	const allowsInsecureDevEndpoint = import.meta.env.DEV && url.protocol === 'http:';
    if ((url.protocol !== 'https:' && !allowsInsecureDevEndpoint) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      return '';
    }
    return url.origin;
  } catch (_) {
    return '';
  }
}

const getBaseUrl = () => {
  const configuredOrigin = configuredApiOrigin();
  if (typeof window !== 'undefined') {
    if (isDesktopRuntime()) {
      return DESKTOP_API_ORIGIN;
    }
    return configuredOrigin;
  }
  return configuredOrigin;
};

export const BASE_URL = {
  toString() {
    return getBaseUrl();
  }
};

let authToken = '';
let refreshToken = '';
let refreshPromise = null;

/**
 * SEC-FE FE-07 / FIND-032 — explicit session-invalid signal.
 *
 * When a protected request fails after a rejected refresh, the app must not keep
 * rendering an authenticated UI. The client records the invalidation and emits a
 * single event so the auth hook can clear user/key state, show the reason and
 * route back to the auth screen. No auth protocol or token storage key changes.
 */
export class SessionInvalidError extends Error {
  constructor(message = 'Sitzung abgelaufen — bitte erneut anmelden.') {
    super(message);
    this.name = 'SessionInvalidError';
    this.code = 'SESSION_INVALID';
  }
}

const sessionInvalidListeners = new Set();
let sessionInvalidated = false;

export function isSessionInvalidated() {
  return sessionInvalidated;
}

export function onSessionInvalid(listener) {
  if (typeof listener !== 'function') return () => {};
  sessionInvalidListeners.add(listener);
  return () => {
    sessionInvalidListeners.delete(listener);
  };
}

function markSessionInvalid(message) {
  authToken = '';
  refreshToken = '';
  if (sessionInvalidated) return;
  sessionInvalidated = true;
  const detail = {
    reason: 'session_expired',
    message: message || 'Sitzung abgelaufen — bitte erneut anmelden.'
  };
  for (const listener of Array.from(sessionInvalidListeners)) {
    try {
      listener(detail);
    } catch (_) {}
  }
}

try {
  localStorage.removeItem('gaia_auth_token');
  localStorage.removeItem('gaia_api_url');
} catch (_) {}

export function setAuthToken(token) {
  authToken = token || '';
  if (!authToken) refreshToken = '';
  else sessionInvalidated = false;
  try {
    localStorage.removeItem('gaia_auth_token');
  } catch (_) {}
}

export function getAuthToken() {
  return authToken;
}

export function getHeaders(extraHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...extraHeaders
  };
}

async function rotateSession() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(refreshToken ? { refreshToken } : {})
    });
    if (!res.ok) {
      // Only a server-side rejection means the session is invalid; timeouts and
      // 5xx stay transient so offline/local-first flows are not mislabelled.
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new SessionInvalidError('Sitzung abgelaufen — bitte erneut anmelden.');
      }
      throw new Error('Session refresh failed');
    }
    const data = await res.json();
    if (isDesktopRuntime()) {
      if (typeof data?.access_token !== 'string' || typeof data?.refresh_token !== 'string') throw new Error('Desktop refresh response incomplete');
      authToken = data.access_token;
      refreshToken = data.refresh_token;
    }
    sessionInvalidated = false;
    return data;
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export async function apiFetch(url, options = {}, retry = true) {
  let res = await fetch(url, {
    credentials: 'include',
    ...options
  });
  const authEndpoint = String(url).includes('/api/v1/auth/login') || String(url).includes('/api/v1/auth/register') || String(url).includes('/api/v1/auth/refresh') || String(url).includes('/api/v1/auth/status');
  if (res.status === 401 && retry && !authEndpoint) {
    try {
      await rotateSession();
      const headers = { ...(options.headers || {}) };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      res = await apiFetch(url, { ...options, headers }, false);
      if (res.status === 401) {
        markSessionInvalid();
      }
    } catch (error) {
      authToken = '';
      refreshToken = '';
      if (error instanceof SessionInvalidError) {
        markSessionInvalid(error.message);
      }
    }
  }
  return res;
}

export async function handleResponse(response) {
  if (!response.ok) {
    let errMsg = 'Ein API-Fehler ist aufgetreten';
    try {
      const data = await response.json();
      errMsg = data.message || data.error || errMsg;
    } catch (_) {
      try {
        errMsg = await response.text() || errMsg;
      } catch (_) {}
    }
    throw new Error(errMsg);
  }
  
  if (response.status === 204) {
    return null;
  }
  
  return response.json();
}

export function setSessionTokens(accessToken, refreshTokenValue) {
  authToken = accessToken || '';
  refreshToken = refreshTokenValue || '';
  // Called on successful login/refresh; a new session clears the invalid marker.
  sessionInvalidated = false;
}

export function isTrustedDesktopLocation(location) {
  if (!location) return false;
  return location.protocol === 'tauri:' ||
    location.protocol === 'file:' ||
    (location.protocol === 'http:' && location.hostname === 'tauri.localhost') ||
    (location.protocol === 'https:' && location.hostname === 'tauri.localhost');
}

export function isDesktopRuntime() {
  if (typeof window === 'undefined') return false;
  return !!window.__TAURI__ ||
    !!window.__TAURI_INTERNALS__ ||
    !!window.__TAURI_METADATA__ ||
    isTrustedDesktopLocation(window.location);
}
