import { useEffect, useState } from "react";
import {apiFetch} from "../utils/apifetch.js"

const toText = (v) => {
  if (v === null || v === undefined) return "";
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return String(v);
  if (t === "object") {
    const first = v.first || v.givenName || v.given || v.fname;
    const last = v.last || v.familyName || v.surname || v.lname;
    if (first || last) return [first, last].filter(Boolean).join(" ");
  }
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function HistoryRow({ c, onStatus, onDelete }) {
  const createdAt = c.createdAt ? new Date(c.createdAt).toLocaleString() : "";
  const canRun = c.status === "draft";
  const canComplete = c.status === "running";

  return (
    <tr className="border-b border-zinc-800">
      <td className="px-4 py-3">{toText(c.name)}</td>
      <td className="px-4 py-3 text-zinc-300">{c.status}</td>
      <td className="px-4 py-3">{c.audienceSize}</td>
      <td className="px-4 py-3">{createdAt}</td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          {canRun && (
            <button
              onClick={() => onStatus(c._id, "running")}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-1 text-sm"
            >
              Start
            </button>
          )}
          {canComplete && (
            <button
              onClick={() => onStatus(c._id, "completed")}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-sm"
            >
              Complete
            </button>
          )}
          <button
            onClick={() => onDelete(c._id)}
            className="rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3 py-1 text-sm"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export function CampaignHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/campaigns?page=${page}&limit=${limit}`);
      setRows(res?.data || []);
      setLoading(false);
    } catch (e) {
      setError(e.message || "Failed to load");
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("xeno:refresh-history", handler);
    return () => window.removeEventListener("xeno:refresh-history", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changeStatus = async (id, status) => {
    try {
      await apiFetch(`/campaigns/${id}/status`, { method: "PATCH", body: { status } });
      window.dispatchEvent(new CustomEvent("xeno:refresh-history"));
    } catch (e) {
      alert(e.message || "Failed to update status");
    }
  };

  const del = async (id) => {
    if (!confirm("Delete this campaign?")) return;
    try {
      await apiFetch(`/campaigns/${id}`, { method: "DELETE" });
      window.dispatchEvent(new CustomEvent("xeno:refresh-history"));
    } catch (e) {
      alert(e.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Campaign History</h3>
        <div className="flex gap-2">
          <button
            className="rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3 py-2"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <button
            className="rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3 py-2"
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Audience</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading && (
              <tr>
                <td className="px-4 py-6" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td className="px-4 py-6 text-red-400" colSpan={5}>
                  {error}
                </td>
              </tr>
            )}
            {!loading && !rows.length && !error && (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={5}>
                  No campaigns yet.
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <HistoryRow key={c._id} c={c} onStatus={changeStatus} onDelete={del} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
