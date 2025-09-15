import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { apiFetch } from "../utils/apifetch";
import { CampaignHistory } from "../components/CampaignHistory";

/****************************
 * Config / helpers
 ****************************/

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

/****************************
 * NL → Rules: helper to convert rules JSON → builder rows
 ****************************/
function rulesToRows(rulesObj = {}) {
  const rows = [];
  for (const [field, spec] of Object.entries(rulesObj)) {
    if (typeof spec !== "object" || Array.isArray(spec)) {
      rows.push({ id: crypto.randomUUID(), field, op: "$eq", value: spec });
      continue;
    }
    for (const [op, value] of Object.entries(spec)) {
      rows.push({ id: crypto.randomUUID(), field, op, value });
    }
  }
  return rows;
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
 * parseNL rules
 ****************************/

// In CampaignUI.jsx (or wherever you build campaigns)

function NaturalLanguageRules({ onParsed }) {
  const [text, setText] = useState("");
  const [useLLM, setuseLLM] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const parseNL = async () => {
    setErr("");
    setLoading(true);
    try {
      const token = window.Clerk?.session ? await window.Clerk.session.getToken() : null;
      const res = await fetch("https://xeno-mini-crm-backend-4vjf.onrender.com/api/v1/nl/segment-rules/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ text, useLLM })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Failed to parse");
      onParsed?.(json.rules);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl p-4 border shadow-sm bg-white/5">
      <div className="text-sm font-medium mb-2">Describe your audience</div>
      <textarea
        className="w-full rounded-lg border p-3 bg-transparent"
        rows={3}
        placeholder={`e.g. People who haven’t shopped in 6 months and spent over ₹5K`}
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <div className="flex items-center gap-3 mt-3">
        {/* <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useLLM} onChange={e => setUseLLM(e.target.checked)} />
          Use AI fallback (better coverage)
        </label> */}
        <button
          onClick={parseNL}
          disabled={loading || !text.trim()}
          className="ml-auto px-3 py-2 rounded-xl border hover:shadow"
        >
          {loading ? "Parsing..." : "Parse to rules"}
        </button>
      </div>
      {err && <div className="text-red-500 text-sm mt-2">{err}</div>}
    </div>
  );
}

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
  const [message, setMessage] = useState("Hi, here’s 10% off on your next order!");
  const [createdBy, setCreatedBy] = useState("");

  // === AI Suggestion State ===
  const [objective, setObjective] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiVariants, setAiVariants] = useState([]); // [{headline, channel, copy}]

  const { userId } = useAuth();
  const [preview, setPreview] = useState({ total: 0, customers: [], loading: false, err: "" });
  const [saving, setSaving] = useState(false);
  const segmentRules = useMemo(() => buildSegmentRules(rows), [rows]);

  useEffect(() => {
    if (userId) setCreatedBy(userId);
  }, [userId]);

  // Fetch AI ideas from backend
  const fetchAiIdeas = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const res = await apiFetch("/ai/message-ideas", {
        method: "POST",
        body: {
          objective: objective?.trim() || "Bring back inactive users",
          audience: "users matching current segment rules",
          brand: "Xeno Mini-CRM",
          tone: "friendly, concise, action-oriented",
        },
      });
      const list = Array.isArray(res?.variants) ? res.variants : [];
      const top3 = list.slice(0, 3);
      setAiVariants(top3);
      return top3;
    } catch (e) {
      setAiError(e.message || "Failed to get suggestions");
      setAiVariants([]);
      return [];
    } finally {
      setAiLoading(false);
    }
  };

  // One-click: fetch + auto-pick the top suggestion
  const autoSuggestAndFill = async () => {
    const ideas = await fetchAiIdeas();
    if (ideas.length > 0 && ideas[0]?.copy) {
      setMessage(ideas[0].copy);
    }
  };

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

      {/* === Message + AI Suggestions === */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-zinc-300">Message</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={autoSuggestAndFill}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-sm"
              disabled={aiLoading}
              title="Fetch suggestions and auto-pick the top one"
            >
              {aiLoading ? "Suggesting…" : "Auto-Suggest"}
            </button>
          </div>
        </div>

        <textarea
          rows={3}
          className="w-full rounded-2xl bg-zinc-900 border border-zinc-700 px-4 py-3"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        

        {/* AI Objective + Variants Panel */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <label className="text-sm text-zinc-300">AI Objective</label>
              <input
                className="mt-1 w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2"
                placeholder='e.g. "Bring back inactive users with a 10% offer"'
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={fetchAiIdeas}
              className="mt-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 whitespace-nowrap"
              disabled={aiLoading}
            >
              {aiLoading ? "Generating…" : "Generate Ideas"}
            </button>
          </div>

          {!!aiError && <div className="text-sm text-red-400">{aiError}</div>}

          {aiVariants.length > 0 && (
            <div className="grid gap-2">
              {aiVariants.map((v, i) => (
                <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <div className="text-xs uppercase text-zinc-400">{v.channel || "message"}</div>
                  <div className="font-semibold">{v.headline || "Suggested copy"}</div>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{v.copy}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMessage(v.copy)}
                      className="rounded-lg border border-zinc-700 px-2 py-1 text-sm"
                    >
                      Use this
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessage((m) => (m ? m + "\n\n" + v.copy : v.copy))}
                      className="rounded-lg border border-zinc-700 px-2 py-1 text-sm"
                    >
                      Append
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

       <NaturalLanguageRules
        onParsed={(rules) => {
          const newRows = rulesToRows(rules);
          // MERGE with existing rows (or replace by using: setRows(newRows))
          setRows((prev) => [...prev, ...newRows]);
        }}
      />
      {/* Optional: show the live JSON that will be sent to backend */}
      {/* <pre className="mt-2 text-xs bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 overflow-auto">
        {JSON.stringify(segmentRules, null, 2)}
      </pre> */}

      {/* Audience Rules + Preview */}
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

      {/* Preview panel */}
      <div className="grid grid-cols-1 gap-6">
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
