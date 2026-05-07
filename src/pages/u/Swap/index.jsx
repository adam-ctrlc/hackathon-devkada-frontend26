import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Pill } from "../../../components/ui/Pill.jsx";
import {
  Sparkle,
  CheckCircle,
  SmileyWink,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { apiRequest } from "../../../lib/api.js";
import { runGeminiLiveJson } from "../../../lib/gemini-live.js";
import { buildSwapPrompt } from "../../../prompts/swap.js";
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
} from "../../../lib/auth-session.js";
import { SwapDetailModal } from "./components/SwapDetailModal.jsx";
import { SwapTable } from "./components/SwapTable.jsx";
import { PAGE_SIZE, mapStoredSwaps, statusLabel } from "../../../utils/swap.js";
import { SwapSkeleton } from "../components/RouteSkeletons.jsx";
import { usePageTitle } from "../../../hooks/usePageTitle.js";

export default function Swap() {
  usePageTitle("Food Swaps");
  const navigate = useNavigate();
  const [swaps, setSwaps] = useState([]);
  const [aiNote, setAiNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [scanContext, setScanContext] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [viewingSwap, setViewingSwap] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [mutatingIds, setMutatingIds] = useState(() => new Set());
  const session = getAuthSession();
  const [profile, setProfile] = useState(session?.profile ?? null);
  const profileId = profile?.id ?? session?.profile?.id;

  useEffect(() => {
    let cancelled = false;

    if (!profileId) {
      navigate("/", { replace: true });
      return;
    }

    const loadSwaps = async () => {
      setLoading(true);
      try {
        const [profileData, stored, scansData] = await Promise.all([
          apiRequest(`/profiles/${profileId}`),
          apiRequest(`/swaps/${profileId}`),
          apiRequest(`/scans/${profileId}`),
        ]);
        if (cancelled) return;

        const latestProfile =
          profileData.profile ?? getAuthSession()?.profile ?? null;
        const currentSession = getAuthSession();
        if (currentSession) {
          setAuthSession({
            ...currentSession,
            profile: {
              ...currentSession.profile,
              ...latestProfile,
            },
          });
        }
        setProfile(latestProfile);
        const scanContext = scansData?.scans ?? [];
        setScanContext(scanContext);
        const storedSwaps = mapStoredSwaps(stored?.swaps ?? []);
        setSwaps(storedSwaps);
        setAiNote(
          storedSwaps.length
            ? "Showing next-time swap suggestions saved from scanner results."
            : "Scan a low or medium support food to create a next-time plan here.",
        );
      } catch (err) {
        if (String(err.message).toLowerCase().includes("profile not found")) {
          clearAuthSession();
          navigate("/", { replace: true });
          return;
        }

        if (!cancelled) {
          setAiNote(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSwaps();

    return () => {
      cancelled = true;
    };
  }, [navigate, profileId]);

  const swappedNames = new Set(
    swaps.map((s) =>
      String(s.from ?? "")
        .trim()
        .toLowerCase(),
    ),
  );
  const unswappedScans = scanContext.filter((scan) => {
    const name = String(scan.productName ?? "")
      .trim()
      .toLowerCase();
    if (!name) return false;
    if (swappedNames.has(name)) return false;
    const support = String(scan.supportLevel ?? "").toLowerCase();
    return support === "low" || support === "medium";
  });
  const suggested = swaps.filter((s) => s.status === "suggested");
  const accepted = swaps.filter((s) => s.status === "accepted");
  const dismissed = swaps.filter((s) => s.status === "dismissed");
  const previousScanContext = scanContext.slice(0, 4);
  const filteredSwaps =
    statusFilter === "all"
      ? swaps
      : swaps.filter((swap) => swap.status === statusFilter);
  const totalPages = Math.max(1, Math.ceil(filteredSwaps.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedSwaps = filteredSwaps.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const statusCounts = {
    all: swaps.length,
    suggested: suggested.length,
    accepted: accepted.length,
    dismissed: dismissed.length,
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const selectStatusFilter = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  const setMutating = (id, flag) =>
    setMutatingIds((prev) => {
      const next = new Set(prev);
      flag ? next.add(id) : next.delete(id);
      return next;
    });

  const accept = (id) => {
    if (mutatingIds.has(id)) return;
    setMutating(id, true);
    setSwaps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "accepted" } : s)),
    );
    apiRequest(`/swaps/${id}`, {
      method: "PATCH",
      body: { status: "accepted" },
      timeoutMs: 10000,
    })
      .catch((err) => setAiNote(err.message))
      .finally(() => setMutating(id, false));
    showToast("Swap accepted — saved to your next-time plan");
  };

  const dismiss = (id) => {
    if (mutatingIds.has(id)) return;
    setMutating(id, true);
    setSwaps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "dismissed" } : s)),
    );
    apiRequest(`/swaps/${id}`, {
      method: "PATCH",
      body: { status: "dismissed" },
      timeoutMs: 10000,
    })
      .catch((err) => setAiNote(err.message))
      .finally(() => setMutating(id, false));
    showToast("Swap dismissed");
  };

  const generateSwapsForNewScans = async () => {
    if (!profileId || !unswappedScans.length || generating) return;
    setGenerating(true);
    try {
      const result = await runGeminiLiveJson({
        prompt: buildSwapPrompt({ profile, scans: unswappedScans }),
        temperature: 0.4,
        timeoutMs: 60000,
      });

      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.swaps)
          ? result.swaps
          : [];

      if (!list.length) {
        showToast("No swap suggestions returned");
        return;
      }

      await apiRequest("/swaps/from-scan", {
        method: "POST",
        body: {
          profileId,
          swaps: list.map((item) => ({
            from: item.from,
            to: item.to,
            reason: item.reason,
            delta: Array.isArray(item.delta) ? item.delta : [],
            groceries: Array.isArray(item.groceries) ? item.groceries : [],
            supportLevel: item.supportLevel ?? "Medium",
            status: "suggested",
          })),
        },
        timeoutMs: 15000,
      });

      const stored = await apiRequest(`/swaps/${profileId}`);
      setSwaps(mapStoredSwaps(stored?.swaps ?? []));
      showToast(`Added ${list.length} new swap${list.length === 1 ? "" : "s"}`);
    } catch (err) {
      showToast(err.message || "Couldn't generate swaps");
    } finally {
      setGenerating(false);
    }
  };

  const restore = (id) => {
    if (mutatingIds.has(id)) return;
    setMutating(id, true);
    setSwaps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "suggested" } : s)),
    );
    apiRequest(`/swaps/${id}`, {
      method: "PATCH",
      body: { status: "suggested" },
      timeoutMs: 10000,
    })
      .catch((err) => setAiNote(err.message))
      .finally(() => setMutating(id, false));
  };

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1180px] relative">
      {viewingSwap && (
        <SwapDetailModal
          swap={viewingSwap}
          onClose={() => setViewingSwap(null)}
          onAccept={accept}
          onDismiss={dismiss}
          onRestore={restore}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle size={14} className="text-emerald-400" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-brand-600 font-semibold mb-2">
            Scan & Swap
          </div>
          <h1 className="font-display text-[34px] leading-[1.05] tracking-tight text-slate-900">
            Better alternatives
          </h1>
          <p className="text-slate-600 mt-2 max-w-[560px]">
            Saved swaps created from scanner results, your active health status,
            budget, taste preferences, and recent logs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unswappedScans.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={generateSwapsForNewScans}
              disabled={generating}
            >
              <Sparkle
                size={13}
                className={generating ? "animate-pulse" : ""}
              />
              {generating
                ? "Generating…"
                : `Generate swaps for ${unswappedScans.length} new scan${unswappedScans.length === 1 ? "" : "s"}`}
            </Button>
          )}
          <Pill tone="brand" className="!normal-case !tracking-normal">
            {swaps.length} saved swap{swaps.length !== 1 ? "s" : ""}
          </Pill>
        </div>
      </div>

      {/* AI note */}
      <div className="mb-6 rounded-xl bg-brand-50 ring-1 ring-brand-100 p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-600 grid place-items-center text-white shrink-0">
          <Sparkle size={16} />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-brand-700 font-semibold mb-1">
            AI note
          </div>
          <p className="text-[13.5px] text-slate-700 leading-snug">
            {aiNote || "Loading saved swap suggestions from scanner results."}
          </p>
        </div>
      </div>

      {previousScanContext.length > 0 && (
        <Card className="p-5 mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Your previous scans
              </div>
              <h3 className="font-display text-[17px] mt-0.5 text-slate-900">
                Swap context uses saved scan history
              </h3>
            </div>
            <Pill tone="brand" className="!normal-case !tracking-normal">
              {scanContext.length} saved scan
              {scanContext.length === 1 ? "" : "s"}
            </Pill>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {previousScanContext.map((scan) => (
              <div
                key={scan.id}
                className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-slate-900 truncate">
                      {scan.productName}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {scan.foodType ?? "Food"}
                    </div>
                  </div>
                  <div className="font-mono text-[12px] text-slate-700 shrink-0">
                    {scan.score}
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-500">
                  {scan.supportLevel ?? "Medium"} support
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {loading && (
        <div className="mb-8">
          <SwapSkeleton />
        </div>
      )}

      {!loading && swaps.length > 0 && (
        <>
          <div className="mb-4 flex items-center gap-2 overflow-x-auto">
            {Object.entries(statusLabel).map(([status, label]) => (
              <button
                key={status}
                type="button"
                onClick={() => selectStatusFilter(status)}
                className={`h-9 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap transition ${
                  statusFilter === status
                    ? "bg-slate-900 text-white"
                    : "bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-brand-200"
                }`}
              >
                {label}
                <span className="ml-1 opacity-70 tabular-nums">
                  {statusCounts[status]}
                </span>
              </button>
            ))}
          </div>

          {pagedSwaps.length > 0 ? (
            <SwapTable
              rows={pagedSwaps}
              page={safePage}
              totalPages={totalPages}
              totalRows={filteredSwaps.length}
              onPageChange={setPage}
              onView={setViewingSwap}
              onAccept={accept}
              onDismiss={dismiss}
              onRestore={restore}
              mutatingIds={mutatingIds}
            />
          ) : (
            <div className="mb-8 rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-8 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white grid place-items-center ring-1 ring-slate-200">
                <SmileyWink size={24} className="text-slate-400" />
              </div>
              <div className="font-display text-[20px] text-slate-900">
                No {statusLabel[statusFilter].toLowerCase()} swaps
              </div>
              <p className="text-[14px] text-slate-600 max-w-[380px]">
                Switch filters or scan another lower-support food to create more
                saved suggestions.
              </p>
            </div>
          )}
        </>
      )}

      {!loading && swaps.length === 0 && (
        <div className="mb-8 rounded-2xl bg-brand-50 ring-1 ring-brand-100 p-8 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white grid place-items-center ring-1 ring-brand-100">
            <Sparkle size={24} className="text-brand-600" />
          </div>
          <div className="font-display text-[20px] text-slate-900">
            No swaps yet
          </div>
          <p className="text-[14px] text-slate-600 max-w-[380px]">
            Scan a lower-support food first. Scanner will show a swap you can
            accept or dismiss, then this page will list it.
          </p>
        </div>
      )}
    </div>
  );
}
