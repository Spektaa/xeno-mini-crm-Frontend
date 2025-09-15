import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import { Sparkles} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60 border-b border-zinc-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-emerald-500/15 grid place-items-center">
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="font-semibold tracking-tight">Xeno Campaigns</span>
        </div>
        <div className="flex items-center gap-3">
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm" className="text-zinc-300">Sign in</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">Get started</Button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard">
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">Open dashboard</Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}