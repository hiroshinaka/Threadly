// Vite exposes env vars prefixed with VITE_. Default to empty string so relative '/api' paths
// (and vercel.json rewrites) work when VITE_API_URL is not set in the environment.
const BASE = import.meta.env.VITE_API_URL || '';

export async function getJSON(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include', // if you use sessions/cookies
    headers: { 'Accept': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
  } catch {
    throw new Error(`Expected JSON from ${path} but got: ${text.slice(0, 160)}`);
  }
}
