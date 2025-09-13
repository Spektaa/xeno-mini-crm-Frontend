import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import { ArrowRight, Sparkles, ShieldCheck, Bot, BarChart3 } from "lucide-react";
import { Button } from "../components/button";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <Navbar />
      <Hero />
      <Logos />
      <Features />
      <CTA />
      <Footer />
    </div>
  );
}

function Hero() {
  return (

    <section className="relative">
      <div className="absolute inset-0 [mask-image:radial-gradient(60%_60%_at_50%_20%,black,transparent)]">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure by Clerk
          </div>
          <h1 className="mt-4 text-4xl sm:text-5xl md:text-6xl font-semibold leading-tight tracking-tight">
            Launch AI-powered campaigns
            <span className="block text-emerald-400">in minutes, not weeks.</span>
          </h1>
          <p className="mt-5 text-zinc-300 text-lg max-w-xl">
            Build segments, craft messages, and trigger sends. Auth is handled by Clerk, data by MongoDB, logic by Express/Node, and copy by OpenAI.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <SignedOut>
              <SignUpButton mode="modal">
                <Button className="h-11 px-6 bg-emerald-500 hover:bg-emerald-600">Create your account</Button>
              </SignUpButton>
              <SignInButton mode="modal">
                <Button variant="outline" className="h-11 px-6 border-zinc-700 text-zinc-200 hover:text-white">I already have an account</Button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <Link to="/dashboard">
                <Button className="h-11 px-6 bg-emerald-500 hover:bg-emerald-600 flex items-center gap-2">
                  Go to dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </SignedIn>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400">
            <li>OAuth via Google, GitHub, Email</li>
            <li>Role-ready JWTs</li>
            <li>Secure sessions & SSO</li>
          </ul>
        </div>

        <div className="relative">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 shadow-2xl p-4 md:p-6">
            <MockDashboardCard />
          </div>
          <div className="absolute -bottom-6 -left-6 hidden md:block rotate-2">
            <Badge text="MERN + Clerk + OpenAI" />
          </div>
        </div>
      </div>
    </section>
  );
}

function MockDashboardCard() {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Your Campaigns</h3>
        <div className="text-xs text-zinc-400">anmol@tiet • admin</div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <StatCard icon={BarChart3} label="Audience" value="12.4k" />
        <StatCard icon={Bot} label="AI drafts" value="37" />
        <StatCard icon={ShieldCheck} label="Deliverability" value="99.1%" />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-sm text-zinc-400">Next up</div>
        <div className="mt-1 font-medium">Welcome Back Flow</div>
        <div className="mt-2 text-xs text-zinc-400">Segment: last_seen 30d • Message: AI-personalized email</div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600">Review draft</Button>
          <Button size="sm" variant="outline" className="border-zinc-800 text-zinc-200">Preview</Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-zinc-400 text-xs">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-400" />
        <div className="text-xl font-semibold">{value}</div>
      </div>
    </div>
  );
}

function Badge({ text }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 shadow-lg">
      <Sparkles className="h-3.5 w-3.5" /> {text}
    </div>
  );
}

function Logos() {
  return (
    <section className="py-8 border-y border-zinc-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-zinc-400">Built on dependable building blocks</p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-6 opacity-70">
          {[
            "Clerk",
            "MongoDB",
            "Express",
            "React",
            "Node.js",
          ].map((logo) => (
            <div key={logo} className="h-10 rounded-xl border border-zinc-800 grid place-items-center text-xs">
              {logo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      icon: ShieldCheck,
      title: "Auth that just works",
      desc: "Clerk handles sign‑in, sessions, MFA, and user management so you don’t have to.",
    },
    {
      icon: Bot,
      title: "AI‑assisted content",
      desc: "Generate on‑brand subject lines and copy with the OpenAI API.",
    },
    {
      icon: BarChart3,
      title: "Segment & personalize",
      desc: "Store rules in MongoDB and run Node jobs to target the right users.",
    },
  ];

  return (
    <section id="features" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-6">
          {items.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <Icon className="h-5 w-5 text-emerald-400" />
              <h3 className="mt-3 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="pricing" className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-semibold">Ready to ship your first campaign?</h2>
        <p className="mt-3 text-zinc-300">Start free. Upgrade when you grow. Your login and user data stay safe with Clerk.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <SignedOut>
            <SignUpButton mode="modal">
              <Button className="h-11 px-6 bg-emerald-500 hover:bg-emerald-600">Create account</Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button variant="outline" className="h-11 px-6 border-zinc-700 text-zinc-200 hover:text-white">Sign in</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard">
              <Button className="h-11 px-6 bg-emerald-500 hover:bg-emerald-600">Go to dashboard</Button>
            </Link>
          </SignedIn>
        </div>
      </div>
    </section>
  );
}


