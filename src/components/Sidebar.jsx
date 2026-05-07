import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  House,
  Barcode,
  ArrowsClockwise,
  BookOpen,
  CalendarBlank,
  Sparkle,
  User,
  Heart,
  Clock,
  MagnifyingGlass,
  Gear,
  ArrowRight,
  Barbell,
  Basket,
  SignOut,
  X,
} from "@phosphor-icons/react";
import { Modal } from "./ui/Modal.jsx";
import { Button } from "./ui/Button.jsx";
import { BrandName } from "./BrandName.jsx";
import { getAuthSession, clearAuthSession } from "../lib/auth-session.js";

const NAV = [
  {
    group: "Daily",
    items: [
      { id: "dashboard", label: "Dashboard", Icon: House },
      { id: "scanner", label: "Scanner", Icon: Barcode },
      {
        id: "swap",
        label: "Swap Plan",
        Icon: ArrowsClockwise,
        badge: null,
      },
      { id: "diary", label: "AI Diary", Icon: BookOpen },
      { id: "workout", label: "Wellness Log", Icon: Barbell },
      { id: "budget", label: "Budget", Icon: Basket },
    ],
  },
  {
    group: "Trends",
    items: [
      { id: "calendar", label: "Health Calendar", Icon: CalendarBlank },
      { id: "insights", label: "Weekly Insights", Icon: Sparkle },
      { id: "history", label: "Scan History", Icon: Clock },
    ],
  },
  {
    group: "You",
    items: [
      { id: "profile", label: "Health Profile", Icon: User },
      { id: "status", label: "Health Status", Icon: Heart },
    ],
  },
];

export function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const session = getAuthSession();
  const currentProfile = session?.profile ?? {};
  const currentHealthContext = currentProfile.healthContext ?? {};
  const firstName = String(currentProfile.firstName ?? "").trim();
  const lastName = String(currentProfile.lastName ?? "").trim();
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    currentProfile.username ||
    currentProfile.email ||
    "Your profile";
  const initials =
    `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() ||
    String(displayName).slice(0, 2).toUpperCase();
  const activeStatus = currentHealthContext.status || "No active condition";
  const statusNote =
    currentHealthContext.notes ||
    currentHealthContext.customRestriction ||
    currentProfile.healthGoal ||
    "Set your current health status for better guidance.";

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-[256px] bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="px-5 pt-5 pb-4 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl grid place-items-center">
          <img
            src="/logo.png"
            alt=""
            className="w-9 h-9 rounded-xl object-cover"
          />
        </div>
        <BrandName className="text-[17px] text-slate-900" />
        <button
          type="button"
          onClick={onClose}
          className="ml-auto w-8 h-8 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition grid place-items-center lg:hidden"
          aria-label="Close navigation"
        >
          <X size={15} />
        </button>
      </div>

      <div className="px-4 mb-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <MagnifyingGlass size={15} />
          </span>
          <input
            placeholder="Search…"
            className="w-full h-9 pl-9 pr-12 rounded-lg bg-slate-50 ring-1 ring-slate-200 outline-none text-[13px] placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:bg-white"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-500 bg-white ring-1 ring-slate-200 rounded px-1.5 py-0.5 flex items-center gap-0.5">
            <svg width="9" height="9" viewBox="0 0 256 256" fill="currentColor">
              <path d="M180,144H152V112h28a36,36,0,1,0-36-36V104H112V76a36,36,0,1,0-36,36H104v32H76a36,36,0,1,0,36,36V152h32v28a36,36,0,1,0,36-36ZM152,76a20,20,0,1,1,20,20H152ZM64,76A20,20,0,1,1,84,96H64ZM104,180a20,20,0,1,1-20-20h20Zm32-76h32v32H136Zm44,96a20,20,0,0,1-20-20V160h20a20,20,0,0,1,0,40Z" />
            </svg>
            K
          </kbd>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scroll-hide px-3">
        {NAV.map((group) => (
          <div key={group.group} className="mb-5">
            <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-[0.16em] uppercase text-slate-400">
              {group.group}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.id}>
                  <NavLink
                    to={`/u/${item.id}`}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `w-full flex items-center gap-3 h-9 px-3 rounded-lg text-[13.5px] transition group
                      ${isActive ? "bg-brand-50 text-brand-700 font-medium" : "text-slate-600 hover:bg-slate-50"}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={
                            isActive
                              ? "text-brand-600"
                              : "text-slate-400 group-hover:text-slate-600"
                          }
                        >
                          <item.Icon size={18} />
                        </span>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                            ${isActive ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700"}`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="rounded-xl bg-brand-50 ring-1 ring-brand-100 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-brand-700 font-semibold mb-1">
            <Heart size={12} /> Active mode
          </div>
          <div className="font-display text-[15px] text-slate-900 leading-tight mb-1">
            {activeStatus}
          </div>
          <div className="text-[12px] text-slate-600 mb-2 line-clamp-2">
            {statusNote}
          </div>
          <button
            onClick={() => navigate("/u/status")}
            className="text-[12px] text-brand-700 font-medium hover:underline inline-flex items-center gap-1"
          >
            Change status <ArrowRight size={12} />
          </button>
        </div>

        <div className="flex items-center gap-3 mt-4 px-1">
          <div className="w-9 h-9 rounded-full bg-brand-100 grid place-items-center font-semibold text-[13px] text-brand-700 shrink-0">
            {initials}
          </div>
          <div className="flex-1 leading-tight min-w-0">
            <div className="text-[13px] font-medium text-slate-900 truncate">
              {displayName}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {activeStatus === "No active condition"
                ? "Profile active"
                : activeStatus}
            </div>
          </div>
          <button
            onClick={() => navigate("/u/profile")}
            className="text-slate-400 hover:text-slate-700 transition"
          >
            <Gear size={16} />
          </button>
          <button
            onClick={() => setShowLogout(true)}
            className="text-slate-400 hover:text-red-500 transition"
          >
            <SignOut size={16} />
          </button>
        </div>

        {showLogout && (
          <Modal
            title="Log out"
            subtitle="You'll need to sign in again to access your account."
            width="max-w-[360px]"
            onClose={() => setShowLogout(false)}
            footer={
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogout(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setShowLogout(false);
                    clearAuthSession();
                    navigate("/");
                  }}
                  className="!bg-red-600 hover:!bg-red-700"
                >
                  <SignOut size={13} /> Log out
                </Button>
              </div>
            }
          >
            <p className="text-[14px] text-slate-600 leading-snug">
              Are you sure you want to log out of{" "}
              <span className="font-medium text-slate-900">KainWise</span>?
            </p>
          </Modal>
        )}
      </div>
    </aside>
  );
}
