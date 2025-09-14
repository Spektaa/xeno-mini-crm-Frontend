import { useEffect, useState } from "react";
import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { Plus, BarChart3, Users, Send, ChevronRight, UserPlus, ShoppingCart } from "lucide-react";
import { StatCard } from "../components/StatCard";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { Button } from "../components/button";
import { CampaignHistory } from "../components/CampaignHistory";

const nf = new Intl.NumberFormat("en-IN");
const fmt = (n) => (typeof n === "number" ? nf.format(n) : n ?? "—");

function RequireAuth({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <div className="min-h-screen grid place-items-center bg-zinc-950 text-zinc-100">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold">Please sign in to continue</h2>
            <p className="text-sm text-zinc-400">
              You need to be authenticated to view the dashboard.
            </p>
            <RedirectToSignIn />
          </div>
        </div>
      </SignedOut>
    </>
  );
}

function statusBadge(status) {
  const s = (status || "").toLowerCase();
  if (s === "running")
    return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30";
  if (s === "completed")
    return "bg-zinc-700/20 text-zinc-300 border border-zinc-700/40";
  return "bg-amber-500/10 text-amber-300 border border-amber-500/30";
}

function RecentCampaigns() {
  const { getToken, isSignedIn } = useAuth();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const ctrl = new AbortController();

    (async () => {
      try {
        if (!isSignedIn) return;
        const base = import.meta.env.VITE_API_URL;
        if (!base) throw new Error("VITE_API_URL is not set in your frontend .env");

        const token = await getToken();
        const url = `${base.replace(/\/$/, "")}/api/v1/campaigns?limit=3&sort=-createdAt`;

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          signal: ctrl.signal,
        });

        const ctype = res.headers.get("content-type") || "";
        if (!res.ok) {
          const body = ctype.includes("application/json") ? await res.json() : await res.text();
          throw new Error(
            typeof body === "string"
              ? `${res.status} ${res.statusText}: ${body.slice(0, 200)}`
              : `${res.status} ${res.statusText}: ${JSON.stringify(body).slice(0, 200)}`
          );
        }
        if (!ctype.includes("application/json")) {
          const html = await res.text();
          throw new Error(`Expected JSON but got HTML (${html.slice(0, 120)}...)`);
        }

        const json = await res.json();
        const data = Array.isArray(json?.data) ? json.data : [];
        if (mounted) setRows(data);
      } catch (e) {
        if (mounted && e.name !== "AbortError") setError(e.message || "Failed to load");
      }
    })();

    return () => {
      mounted = false;
      ctrl.abort();
    };
  }, [getToken, isSignedIn]);

  if (error) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-red-300">
        Couldn’t load campaigns: {error}
      </div>
    );
  }

  if (rows === null) {
    return (
      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <div className="animate-pulse h-40 bg-zinc-900/40" />
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
        No campaigns yet. Create your first one to see it here.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/50 text-zinc-400">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Name</th>
            {/* <th className="text-left px-4 py-3 font-medium">Segment</th> */}
            <th className="text-left px-4 py-3 font-medium">Status</th>
            {/* <th className="text-right px-4 py-3 font-medium">Sent</th>
            <th className="text-right px-4 py-3 font-medium">CTR</th> */}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {rows.map((c) => (
            <tr key={c._id} className="hover:bg-zinc-900/30">
              <td className="px-4 py-3">{c.name}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadge(c.status ?? "draft")}`}>
                  {c.status ?? "draft"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const [showAll, setShowAll] = useState(false);

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold">Dashboard</h1>
              <p className="mt-2 text-zinc-400">Overview of your audience and recent campaigns.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2">
                 <Link to="/ingest?tab=customers">
                   <Button className="h-11 px-4 bg-zinc-800 hover:bg-zinc-700 flex items-center gap-2">
                     <UserPlus className="h-4 w-4" />
                     Add Customers
                   </Button>
                 </Link>
                 <Link to="/ingest?tab=orders">
                   <Button className="h-11 px-4 bg-zinc-800 hover:bg-zinc-700 flex items-center gap-2">
                     <ShoppingCart className="h-4 w-4" />
                     Add Orders
                   </Button>
                 </Link>
               </div>
              <Link to="/campaigns">
                <Button className="h-11 px-5 bg-emerald-500 hover:bg-emerald-600 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create campaign
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <section className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={Users} label="Total Audience" value="12,432" sub="+184 this week" />
            <StatCard icon={Send} label="Messages Sent" value="3,109" sub="99.1% delivered" />
            <StatCard icon={BarChart3} label="Avg. CTR" value="4.7%" sub="+0.6% WoW" />
          </section>

          {/* Quick actions */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium">Ship your next campaign faster</h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Start a new campaign and personalize it with AI-assisted copy.
                </p>
              </div>
              <div className="flex gap-3">
                <Link to="/campaigns">
                  <Button className="h-10 px-4 bg-emerald-500 hover:bg-emerald-600 flex items-center gap-2">
                    New campaign
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <button
                  onClick={() => setShowAll(true)}
                  className="h-10 px-4 border-zinc-700 text-zinc-200 hover:text-white rounded-xl border"
                >
                  View all
                </button>
              </div>
            </div>
          </section>

          {/* Recent campaigns (live) */}
          <section className="space-y-4" id="recent-campaigns">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Recent campaigns</h2>
              {!showAll && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="text-sm text-emerald-400 hover:text-emerald-300"
                >
                  See All
                </button>
              )}
            </div>

            {!showAll && <RecentCampaigns />}
            {showAll && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAll(false)}
                    className="text-xs rounded-lg border border-zinc-700 px-2 py-1 text-zinc-300 hover:text-white"
                  >
                    Hide
                  </button>
                </div>
                <CampaignHistory />
              </div>
            )}
          </section>
        </main>
        <Footer />
      </div>
    </RequireAuth>
  );
}
