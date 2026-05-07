import { Link } from "react-router-dom";
import { BrandName } from "./BrandName.jsx";

export function AppFooter() {
  return (
    <footer className="py-4 bg-slate-50 border-t border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
        <span className="font-semibold text-sm tracking-tight text-brand-900">
          <BrandName />
        </span>
        <div className="flex gap-5">
          <Link
            to="/privacy"
            className="text-xs text-slate-400 hover:text-slate-600 transition"
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            className="text-xs text-slate-400 hover:text-slate-600 transition"
          >
            Terms
          </Link>
        </div>
        <span className="text-xs text-slate-400">
          © {new Date().getFullYear()} KainWise. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
