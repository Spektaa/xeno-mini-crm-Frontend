export async function getAuthHeaders() {
  try {
    const token = await window?.Clerk?.session?.getToken();
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {}
  return {};
}
