import { getAuthHeaders } from "./getauthheaders";

const API_BASE = "https://xeno-mini-crm-backend-4vjf.onrender.com/api/v1";

export async function apiFetch(path, { method = "GET", body } = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(await getAuthHeaders()),
  };
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return res.json();
}