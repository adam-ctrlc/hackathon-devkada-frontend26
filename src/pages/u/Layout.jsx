import { useState } from "react";
import { Outlet, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Sidebar } from "../../components/Sidebar.jsx";
import { Barcode, List } from "@phosphor-icons/react";
import { getAuthSession } from "../../lib/auth-session.js";

const LABELS = {
  dashboard: "Dashboard",
  scanner: "Scanner",
  all: "All Scans",
  swap: "Scan & Swap",
  diary: "AI Diary",
  workout: "Wellness Log",
  budget: "Budget",
  calendar: "Health Calendar",
  insights: "Weekly Insights",
  history: "Scan History",
  profile: "Health Profile",
  status: "Health Status",
};

export default function UserLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const session = getAuthSession();
  if (!session?.tokens?.accessToken) return <Navigate to="/" replace />;
  const segment = location.pathname.split("/").pop();
  const label = LABELS[segment] ?? "KainWise";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <main className="flex-1 min-w-0">
        <header className="h-14 px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-2 min-w-0 text-[13px] text-slate-500">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="mr-1 w-9 h-9 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-slate-600 grid place-items-center lg:hidden"
              aria-label="Open navigation"
            >
              <List size={18} />
            </button>
            <span>KainWise</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium truncate">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/u/scanner")}
              className="h-9 px-3 sm:px-3.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Barcode size={14} />
              <span className="hidden sm:inline">Quick scan</span>
            </button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
