
export function Footer() {
  return (
    <footer className="border-t border-zinc-800/60 py-10 text-sm text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>© {new Date().getFullYear()} Xeno Campaigns</div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-white">Privacy</a>
          <a href="#" className="hover:text-white">Terms</a>
          <a href="#" className="hover:text-white">Docs</a>
        </div>
      </div>
    </footer>
  );
}