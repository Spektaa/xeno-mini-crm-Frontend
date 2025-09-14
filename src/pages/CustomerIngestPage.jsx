import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";


// ===== Theme: dark + emerald accents =====
const card = "rounded-2xl border border-zinc-800 bg-zinc-900/40";
const inputC =
  "mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900/60 p-2 " +
  "placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-600";
const btn =
  "rounded-xl px-4 py-2 transition disabled:opacity-50 disabled:cursor-not-allowed";
const btnPrimary = `${btn} bg-emerald-600 hover:bg-emerald-500`;
const btnGhost =
  "rounded-xl border border-zinc-700 px-3 py-2 hover:bg-zinc-800";

// ===== Config =====
const API_BASE = "https://xeno-mini-crm-backend-4vjf.onrender.com";

// Canonical CSV headers
const CUSTOMER_HEADERS = [
  "name",
  "email",
  "phone",
  "totalSpend",
  "visits",
  "lastActive",
  "city",
];
const ORDER_HEADERS = [
  "orderId",
  "customerEmail",
  "amount",
  "status",
  "createdAt",
  "channel",
];

// ===== Helpers =====
const emptyToUndef = (v) => (v === "" ? undefined : v);
const toCSV = (headers, rows) => {
  const head = headers.join(",");
  const body = rows
    .map((r) => headers.map((h) => r[h] ?? "").join(","))
    .join("\n");
  return `${head}\n${body}`;
};
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function IngestPage() {
  const { getToken } = useAuth();
  const [tab, setTab] = useState("customers");

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-5 py-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/40 bg-emerald-900/20 px-3 py-1 text-xs text-emerald-300">
              <span className="i-lucide-lock" />
              Secure by Clerk
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight">
              Ingest data <span className="text-emerald-400">in minutes</span>
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Upload CSVs or add records one by one. Auth by Clerk, data by
              MongoDB, APIs by Node/Express.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setTab("customers")}
            className={`px-3 py-2 rounded-xl border ${
              tab === "customers"
                ? "bg-zinc-800 border-zinc-700"
                : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
            }`}
          >
            Customers
          </button>
          <button
            onClick={() => setTab("orders")}
            className={`px-3 py-2 rounded-xl border ${
              tab === "orders"
                ? "bg-zinc-800 border-zinc-700"
                : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
            }`}
          >
            Orders
          </button>
        </div>

        {/* Panels */}
        <div className="mt-6">
          {tab === "customers" ? (
            <EntityPanel
              entity="customers"
              headers={CUSTOMER_HEADERS}
              templateRows={[
                {
                  name: "Aman Gupta",
                  email: "aman@example.com",
                  phone: "9876543210",
                  totalSpend: 1200.5,
                  visits: 7,
                  lastActive: "2025-08-21",
                  city: "delhi",
                },
                {
                  name: "Riya Malhotra",
                  email: "riya@example.com",
                  phone: "9998887777",
                  totalSpend: 0,
                  visits: 0,
                  lastActive: "2025-05-01T10:00:00Z",
                  city: "ludhiana",
                },
              ]}
              getToken={getToken}
              SingleForm={(props) => <CustomerForm {...props} />}
            />
          ) : (
            <EntityPanel
              entity="orders"
              headers={ORDER_HEADERS}
              templateRows={[
                {
                  orderId: "ORD-1001",
                  customerEmail: "aman@example.com",
                  amount: 499.0,
                  status: "paid",
                  createdAt: "2025-09-01T12:30:00Z",
                  channel: "web",
                },
                {
                  orderId: "ORD-1002",
                  customerEmail: "riya@example.com",
                  amount: 1299.99,
                  status: "created",
                  createdAt: "2025-09-02",
                  channel: "app",
                },
              ]}
              getToken={getToken}
              SingleForm={(props) => <OrderForm {...props} />}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Generic entity panel with Single + Bulk blocks */
function EntityPanel({ entity, headers, templateRows, getToken, SingleForm }) {
  const [dryRun, setDryRun] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [errors, setErrors] = useState([]);

  const templateCSV = useMemo(
    () => toCSV(headers, templateRows),
    [headers, templateRows]
  );

  const handleDownloadTemplate = () =>
    downloadBlob(
      new Blob([templateCSV], { type: "text/csv;charset=utf-8" }),
      `${entity}_template.csv`
    );

const handleBulkUpload = async () => {
  if (!file) return;
  setLoading(true);
  setSummary(null);
  setErrors([]);
  try {
    const fd = new FormData();
    fd.append("file", file);
    const token = await getToken().catch(() => null);
    const res = await fetch(
      `https://xeno-mini-crm-backend-4vjf.onrender.com/api/v1/customers/bulk${dryRun ? "?dryRun=1" : ""}`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Upload failed");

    setSummary(data.summary);

    // only keep problematic rows
    const problemRows = (data.rows || data.errors || []).filter(
      (r) => r.status !== "ok" && (r.issues?.length || r.message)
    );
    setErrors(problemRows);
  } catch (err) {
    setErrors([
      {
        row: "-",
        key: "-",
        issues: [{ path: "-", message: err.message }],
      },
    ]);
  } finally {
    setLoading(false);
  }
};

return (
  <div className="grid gap-6">
    {/* Single */}
    <div className={`${card} p-5`}>
      <h3 className="text-lg font-medium capitalize">{entity} – single entry</h3>
      <p className="text-sm text-zinc-400">
        Submit one record at a time. Required/optional fields depend on your
        server validator.
      </p>
      <div className="mt-4">
        <SingleForm />
      </div>
    </div>

    {/* Bulk */}
    <div className={`${card} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium capitalize">{entity} – bulk CSV upload</h3>
          <p className="text-sm text-zinc-400">
            Headers (case-insensitive): {headers.join(", ")}
          </p>
        </div>
        <button onClick={handleDownloadTemplate} className={btnGhost}>
          Download template
        </button>
      </div>

      <div className="mt-4 grid gap-4">
        <label className="block">
          <span className="text-sm text-zinc-300">CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full cursor-pointer rounded-xl border border-zinc-700 bg-zinc-900/60 p-2 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-200"
          />
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
          />
          Dry run (validate only; don’t write)
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={!file || loading}
            onClick={handleBulkUpload}
            className={btnPrimary}
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
          {summary && (
            <span className="text-sm text-zinc-300">
              Received: <b>{summary.received}</b> • Accepted:{" "}
              <b>{summary.accepted}</b> • Inserted: <b>{summary.inserted}</b> •
              Duplicates: <b>{summary.duplicates}</b> • Rejected:{" "}
              <b>{summary.rejected}</b>
            </span>
          )}
        </div>

        {errors.length > 0 && (
          <div className="mt-2 rounded-xl border border-rose-900/50 bg-rose-950/30 p-3">
            <p className="mb-2 text-rose-300 font-medium">Row errors</p>
            <ul className="space-y-2 text-sm">
              {errors.map((e, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-2"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-rose-400">Row {e.row}</span>
                    <span className="text-zinc-400">Key: {e.key || "—"}</span>
                    {e.status && (
                      <span className="text-zinc-500">({e.status})</span>
                    )}
                  </div>
                  <ul className="mt-1 list-disc pl-6 text-rose-200">
                    {e.issues?.length
                      ? e.issues.map((iss, j) => (
                          <li key={j}>
                            <span className="text-zinc-300">{iss.path}:</span>{" "}
                            {iss.message}
                          </li>
                        ))
                      : e.message
                      ? <li>{e.message}</li>
                      : null}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  </div>
);
}

/* ---------- Single Forms ---------- */

function CustomerForm() {
  const { getToken } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    totalSpend: "",
    visits: "",
    lastActive: "",
    city: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const token = await getToken().catch(() => null);
      const payload = {
        name: emptyToUndef(form.name),
        email: emptyToUndef(form.email),
        phone: emptyToUndef(form.phone),
        totalSpend:
          form.totalSpend === "" ? undefined : Number(form.totalSpend),
        visits: form.visits === "" ? undefined : Number(form.visits),
        lastActive: emptyToUndef(form.lastActive),
        city: emptyToUndef(form.city)?.toLowerCase(),
      };
      const res = await fetch(`${API_BASE}/api/v1/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed");
      setMsg({ type: "ok", text: "Customer saved." });
      setForm({
        name: "",
        email: "",
        phone: "",
        totalSpend: "",
        visits: "",
        lastActive: "",
        city: "",
      });
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Grid2>
        <Field label="Name" name="name" value={form.name} onChange={onChange} placeholder="Aman Gupta" />
        <Field label="Email" name="email" value={form.email} onChange={onChange} type="email" placeholder="aman@example.com" />
        <Field label="Phone" name="phone" value={form.phone} onChange={onChange} placeholder="9876543210" />
        <Field label="City" name="city" value={form.city} onChange={onChange} placeholder="delhi" />
        <Field label="Total Spend" name="totalSpend" value={form.totalSpend} onChange={onChange} type="number" step="0.01" placeholder="1200.50" />
        <Field label="Visits" name="visits" value={form.visits} onChange={onChange} type="number" placeholder="7" />
        <Field label="Last Active (ISO)" name="lastActive" value={form.lastActive} onChange={onChange} type="datetime-local" />
      </Grid2>
      <div className="flex items-center gap-3">
        <button className={btnPrimary} disabled={loading}>
          {loading ? "Saving..." : "Create"}
        </button>
        {msg && (
          <span
            className={msg.type === "ok" ? "text-emerald-400" : "text-rose-400"}
          >
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

function OrderForm() {
  const { getToken } = useAuth();

  const [form, setForm] = useState({
    customer: "",       // Mongo _id (hidden)
    itemName: "",
    itemQty: "1",
    itemPrice: "",
    orderDate: "",
  });

  // email query + selected customer
  const [emailQuery, setEmailQuery] = useState("");
  const debounced = useDebounced(emailQuery, 250);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    let aborted = false;
    (async () => {
      if (!debounced) { setSuggestions([]); return; }
      try {
        const token = await getToken().catch(() => null);
        const res = await fetch(`https://xeno-mini-crm-backend-4vjf.onrender.com/api/v1/customersearch/search?q=${encodeURIComponent(debounced)}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const data = await res.json();
        if (!aborted) setSuggestions(Array.isArray(data?.data) ? data.data : []);
        setOpen(true);
        setHighlight(0);
      } catch {
        if (!aborted) setSuggestions([]);
      }
    })();
    return () => { aborted = true; };
  }, [debounced, getToken]);

  const pick = (row) => {
    setForm(f => ({ ...f, customer: row._id }));
    setEmailQuery(row.email);     // lock the email text to the chosen one
    setSuggestions([]);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(h + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); pick(suggestions[highlight]); }
    if (e.key === "Escape")    { setOpen(false); }
  };

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const toISOFromDatetimeLocal = (v) => {
    if (!v) return undefined; // let backend default to now
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
    };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      if (!form.customer) throw new Error("Please select a customer from suggestions");
      if (!form.itemName.trim()) throw new Error("Item name is required");
      const qty = Number(form.itemQty);
      const price = Number(form.itemPrice);
      if (!Number.isInteger(qty) || qty <= 0) throw new Error("Quantity must be a positive integer");
      if (!Number.isFinite(price) || price < 0) throw new Error("Price must be non-negative");

      const token = await getToken().catch(() => null);
      const body = {
        customer: form.customer, // _id chosen from suggestions
        items: [{ name: form.itemName.trim(), quantity: qty, price }],
        orderDate: toISOFromDatetimeLocal(form.orderDate), // optional
      };

      const res = await fetch("https://xeno-mini-crm-backend-4vjf.onrender.com/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create order");

      setMsg({ type: "ok", text: "Order saved." });
      setForm({ customer: "", itemName: "", itemQty: "1", itemPrice: "", orderDate: "" });
      setEmailQuery("");
      setSuggestions([]);
      setOpen(false);
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-2">
        <label className="text-sm font-medium text-zinc-300">Customer (email)</label>
        <div className="relative">
          <input
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
            type="email"
            placeholder="start typing email or name…"
            value={emailQuery}
            onChange={(e) => { setEmailQuery(e.target.value); setOpen(true); }}
            onKeyDown={onKeyDown}
            onFocus={() => suggestions.length && setOpen(true)}
            autoComplete="off"
          />
          {open && suggestions.length > 0 && (
            <ul
              ref={listRef}
              className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl"
            >
              {suggestions.map((s, i) => (
                <li
                  key={s._id}
                  className={`px-3 py-2 cursor-pointer ${i === highlight ? "bg-zinc-800" : "hover:bg-zinc-800"}`}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => { e.preventDefault(); pick(s); }} // prevent blur-before-click
                >
                  <div className="text-zinc-100">{s.email}</div>
                  <div className="text-xs text-zinc-400">{s.name || "—"}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* show selection state */}
        {!!form.customer && (
          <div className="text-xs text-emerald-400">Selected customer id: {form.customer}</div>
        )}
      </div>

      <Grid2>
        <Field label="Item Name" name="itemName" value={form.itemName} onChange={onChange} placeholder="T-Shirt" required />
        <Field label="Quantity" name="itemQty" value={form.itemQty} onChange={onChange} type="number" min="1" step="1" required />
        <Field label="Price" name="itemPrice" value={form.itemPrice} onChange={onChange} type="number" min="0" step="0.01" required />
        <Field label="Order Date (Local)" name="orderDate" value={form.orderDate} onChange={onChange} type="datetime-local" />
      </Grid2>

      <div className="flex items-center gap-3">
        <button className={btnPrimary} disabled={loading}>{loading ? "Saving…" : "Create"}</button>
        {msg && <span className={msg.type === "ok" ? "text-emerald-400" : "text-rose-400"}>{msg.text}</span>}
      </div>
    </form>
  );
}

/* ---------- UI bits ---------- */
function Grid2({ children }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
  );
}
function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  step,
  placeholder,
}) {
  return (
    <label className="block">
      <span className="text-sm text-zinc-300">{label}</span>
      <input
        className={inputC}
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        step={step}
        placeholder={placeholder}
      />
    </label>
  );
}
