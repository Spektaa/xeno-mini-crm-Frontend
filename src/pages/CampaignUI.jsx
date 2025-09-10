import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";

/**
 * Xeno Mini-CRM – Campaign UI (React + Tailwind)
 *
 * Features:
 *  - Dynamic rule builder (AND across rows) for segmentRules
 *  - Audience preview (POST /api/v1/campaign/preview)
 *  - Campaign creation (POST /api/v1/campaign)
 *  - Campaign history (GET /api/v1/campaign), status (PATCH), delete (DELETE)
 */

/****************************
 * Config / helpers
 ****************************/
const API_BASE = "http://localhost:8000/api/v1"; // adjust if needed

const ALLOWED_FIELDS = [
  { id: "totalSpend", label: "Total Spend" },
  { id: "visits", label: "Visits" },
  { id: "lastActive", label: "Last Active (ISO date)" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "name", label: "Name" },
];

const ALLOWED_OPS = [
  { id: "$eq", label: "= (equal)" },
  { id: "$ne", label: "≠ (not equal)" },
  { id: "$gt", label: "> (greater)" },
  { id: "$gte", label: "≥ (greater/equal)" },
  { id: "$lt", label: "< (less)" },
  { id: "$lte", label: "≤ (less/equal)" },
  { id: "$in", label: "in [a,b,c]" },
  { id: "$nin", label: "not in [a,b,c]" },
  { id: "$regex", label: "matches regex" },
];

async function getAuthHeaders() {
  try {
    const token = await window?.Clerk?.session?.getToken();
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {}
  return {};
}

async function apiFetch(path, { method = "GET", body } = {}) {
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

/****************************
 * Safe printers for JSX
 ****************************/
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
};

const toDateText = (v) => {
  try {
    return new Date(v).toLocaleString();
  } catch {
    return toText(v);
  }
};

/****************************
 * Rule Builder
 ****************************/
function emptyRow() {
  return { id: crypto.randomUUID(), field: "totalSpend", op: "$gte", value: "" };
}

function parseValue(op, raw) {
  if (op === "$in" || op === "$nin") {
    return String(raw)
      .split(",")
      .map((s) => s.trim())
      .map((v) =>
        v === "true" ? true : v === "false" ? false : isFinite(+v) && v !== "" ? +v : v
      )
      .filter((v) => v !== "");
  }
  if (typeof raw === "string" && /T\d{2}:\d{2}:\d{2}/.test(raw)) return raw; // ISO date
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw !== "" && !isNaN(Number(raw))) return Number(raw);
  return raw;
}

function buildSegmentRules(rows) {
  const out = {};
  for (const r of rows) {
    const val = parseValue(r.op, r.value);
    if (!out[r.field]) out[r.field] = {};
    if (r.op === "$eq") {
      out[r.field] = val; // primitive equality
    } else if (typeof out[r.field] === "object" && !Array.isArray(out[r.field])) {
      out[r.field][r.op] = val;
    } else {
      // convert existing primitive equality into $eq then append more ops
      const prev = out[r.field];
      out[r.field] = { $eq: prev, [r.op]: val };
    }
  }
  return out;
}

function RuleRow({ row, onChange, onRemove }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-zinc-900/40 border border-zinc-800 rounded-2xl p-3">
      <select
        className="md:col-span-3 w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2"
        value={row.field}
        onChange={(e) => onChange({ ...row, field: e.target.value })}
      >
        {ALLOWED_FIELDS.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        className="md:col-span-3 w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2"
        value={row.op}
        onChange={(e) => onChange({ ...row, op: e.target.value })}
      >
        {ALLOWED_OPS.map((op) => (
          <option key={op.id} value={op.id}>
            {op.label}
          </option>
        ))}
      </select>

      <input
        className="md:col-span-5 w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2"
        placeholder={row.field === "lastActive" ? "e.g. 2025-01-01T00:00:00.000Z" : "Enter value"}
        value={row.value}
        onChange={(e) => onChange({ ...row, value: e.target.value })}
      />

      <button
        type="button"
        onClick={() => onRemove(row.id)}
        className="md:col-span-1 w-full md:w-auto rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2"
      >
        Remove
      </button>
    </div>
  );
}

function RuleBuilder({ rows, setRows }) {
  const addRow = () => setRows((r) => [...r, emptyRow()]);
  const updateRow = (nr) => setRows((rs) => rs.map((r) => (r.id === nr.id ? nr : r)));
  const removeRow = (id) => setRows((rs) => rs.filter((r) => r.id !== id));

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <RuleRow key={row.id} row={row} onChange={updateRow} onRemove={removeRow} />
      ))}
      <div>
        <button
          type="button"
          onClick={addRow}
          className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2"
        >
          + Add Rule
        </button>
      </div>
    </div>
  );
}

/****************************
 * Create Campaign
 ****************************/
function CreateCampaign() {
  const [rows, setRows] = useState([emptyRow()]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("Hi {{name}}, here’s 10% off on your next order!");
  const [createdBy, setCreatedBy] = useState("");

  const {userId} = useAuth();
  const [preview, setPreview] = useState({ total: 0, customers: [], loading: false, err: "" });
  const [saving, setSaving] = useState(false);
  const segmentRules = useMemo(() => buildSegmentRules(rows), [rows]);

  useEffect(() => {
    (async () => {
      console.log("userere", userId);
      if (userId) setCreatedBy(userId);
    })();
  }, [userId]);

  const doPreview = async () => {
    setPreview((p) => ({ ...p, loading: true, err: "" }));
    try {
      const res = await apiFetch("/campaigns/preview", {
        method: "POST",
        body: { segmentRules, limit: 20 },
      });
      setPreview({
        total: res?.data?.total || 0,
        customers: res?.data?.customers || [],
        loading: false,
        err: "",
      });
    } catch (e) {
      setPreview({ total: 0, customers: [], loading: false, err: e.message || "Error" });
    }
  };

  const doCreate = async () => {
    if (!name.trim()) return alert("Campaign name is required");
    if (!message.trim()) return alert("Message cannot be empty");

    setSaving(true);
    try {
      await apiFetch("/campaigns", {
        method: "POST",
        body: { createdBy, name, message, segmentRules },
      });
      setSaving(false);
      alert("Campaign created. Redirecting to history...");
      window.dispatchEvent(new CustomEvent("xeno:goto-history"));
    } catch (e) {
      setSaving(false);
      alert(e.message || "Failed to create campaign");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm text-zinc-300">Created By (auto if using Clerk)</label>
          <input
            className="w-full rounded-2xl bg-zinc-900 border border-zinc-700 px-4 py-3"
            placeholder="user_abc123"
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-zinc-300">Campaign Name</label>
          <input
            className="w-full rounded-2xl bg-zinc-900 border border-zinc-700 px-4 py-3"
            placeholder="Win-back: High spenders inactive"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-zinc-300">Message (supports {'{{name}}'})</label>
        <textarea
          rows={3}
          className="w-full rounded-2xl bg-zinc-900 border border-zinc-700 px-4 py-3"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Audience Rules</h3>
          <button
            type="button"
            onClick={doPreview}
            className="rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2"
          >
            {preview.loading ? "Previewing…" : "Preview Audience"}
          </button>
        </div>
        <RuleBuilder rows={rows} setRows={setRows} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <h4 className="font-semibold mb-2">Segment JSON (sent to backend)</h4>
          <pre className="text-xs bg-zinc-950/60 p-3 rounded-xl overflow-auto max-h-64">
            {JSON.stringify(segmentRules, null, 2)}
          </pre>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">Preview</h4>
            <span className="text-sm text-zinc-400">Total: {preview.total}</span>
          </div>
          {preview.err && <div className="text-red-400 text-sm mb-2">{preview.err}</div>}
          <div className="space-y-2 max-h-64 overflow-auto">
            {preview.customers.map((c) => (
              <div
                key={c._id || `${c.email}-${c.phone}-${Math.random()}`}
                className="text-sm bg-zinc-950/50 border border-zinc-800 rounded-xl p-3"
              >
                <div className="font-medium">{toText(c.name) || "Unnamed"}</div>
                {!!c.email && <div className="text-zinc-400">{toText(c.email)}</div>}
                <div className="text-zinc-400">
                  Spend: {toText(c.totalSpend)} • Visits: {toText(c.visits)}
                </div>
                {c.lastActive && (
                  <div className="text-zinc-500">Last Active: {toDateText(c.lastActive)}</div>
                )}
              </div>
            ))}
            {!preview.customers.length && !preview.loading && (
              <div className="text-sm text-zinc-500">No preview yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={doCreate}
          className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3"
          disabled={saving}
        >
          {saving ? "Creating…" : "Create Campaign"}
        </button>
      </div>
    </div>
  );
}

/****************************
 * Campaign History
 ****************************/
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

function CampaignHistory() {
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
  }, [page]);
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("xeno:refresh-history", handler);
    return () => window.removeEventListener("xeno:refresh-history", handler);
  }, []);

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

/****************************
 * Shell + Routing
 ****************************/
function Tabs({ tab, setTab }) {
  return (
    <div className="inline-flex rounded-2xl bg-zinc-900 border border-zinc-800 p-1">
      {[
        { id: "create", label: "Create Campaign" },
        { id: "history", label: "History" },
      ].map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={`px-4 py-2 rounded-xl text-sm ${
            tab === t.id ? "bg-zinc-800" : "hover:bg-zinc-800/60"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function CampaignUI() {
  const [tab, setTab] = useState("create");

  useEffect(() => {
    const goto = () => setTab("history");
    window.addEventListener("xeno:goto-history", goto);
    return () => window.removeEventListener("xeno:goto-history", goto);
  }, []);

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Xeno Mini-CRM – Campaigns</h1>
            <p className="text-sm text-zinc-400">
              Define audience, preview size, create & track campaigns.
            </p>
          </div>
          <Tabs tab={tab} setTab={setTab} />
        </header>

        {tab === "create" ? <CreateCampaign /> : <CampaignHistory />}
      </div>
    </div>
  );
}
