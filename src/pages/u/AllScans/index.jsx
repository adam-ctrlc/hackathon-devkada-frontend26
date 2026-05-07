import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Support } from "../../../components/ui/Pill.jsx";
import {
  ArrowLeft,
  Orange,
  Trash,
  CheckCircle,
  Barcode,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { apiRequest } from "../../../lib/api.js";
import { clearAuthSession, getAuthSession } from "../../../lib/auth-session.js";
import { AllScansSkeleton } from "../components/RouteSkeletons.jsx";

const formatDate = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.round((now - d) / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.round(diffMin / 60)}h ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatFullDateTime = (iso) => {
  if (!iso) return "No time saved";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "No time saved";
  return date.toLocaleString(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const mealPeriodLabel = (value) => {
  const text = String(value ?? "").trim();
  return text ? text[0].toUpperCase() + text.slice(1) : "Meal time";
};

export default function AllScans() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const profileId = session?.profile?.id;

  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [deletingIds, setDeletingIds] = useState(() => new Set());

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (!profileId) {
      navigate("/", { replace: true });
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiRequest(`/scans/${profileId}`);
        if (!cancelled) setScans(data.scans ?? []);
      } catch (err) {
        if (String(err.message).toLowerCase().includes("profile not found")) {
          clearAuthSession();
          navigate("/", { replace: true });
          return;
        }
        if (!cancelled) showToast(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [navigate, profileId]);

  const handleDelete = async (event, scan) => {
    event.preventDefault();
    event.stopPropagation();

    setDeletingIds((prev) => new Set(prev).add(scan.id));
    setScans((prev) => prev.filter((s) => s.id !== scan.id));

    try {
      await apiRequest(`/scans/${scan.id}`, { method: "DELETE" });
      showToast(`Deleted: ${scan.productName}`);
    } catch (err) {
      if (
        String(err.message ?? "")
          .toLowerCase()
          .includes("not found")
      ) {
        showToast(`Deleted: ${scan.productName}`);
        return;
      }

      setScans((prev) =>
        prev.some((item) => item.id === scan.id) ? prev : [scan, ...prev],
      );
      showToast(err.message);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(scan.id);
        return next;
      });
    }
  };

  const filtered = scans.filter((s) =>
    search.trim()
      ? s.productName?.toLowerCase().includes(search.trim().toLowerCase()) ||
        s.barcode?.includes(search.trim())
      : true,
  );

  const scoreTone = (s) =>
    s >= 70 ? "text-emerald-600" : s >= 50 ? "text-amber-600" : "text-red-600";

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1240px] relative">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle size={14} className="text-emerald-400" /> {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-brand-600 font-semibold mb-2">
            Scanner · History
          </div>
          <h1 className="font-display text-[34px] leading-[1.05] tracking-tight text-slate-900">
            All scans
          </h1>
          <p className="text-slate-600 mt-2 max-w-[600px]">
            Every product you've scanned. Click a row to revisit it, or delete
            entries you no longer need.
          </p>
        </div>
        <Button variant="line" size="sm" onClick={() => navigate("/u/scanner")}>
          <ArrowLeft size={14} /> Back to scanner
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-[360px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <MagnifyingGlass size={14} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product or barcode"
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>
          <span className="text-[12px] text-slate-500 tabular-nums sm:ml-auto">
            {filtered.length} {filtered.length === 1 ? "scan" : "scans"}
          </span>
        </div>

        {loading ? (
          <div className="p-5">
            <AllScansSkeleton />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <Barcode size={24} weight="duotone" />
            </div>
            <div className="font-display text-[18px] text-slate-900">
              {search ? "No matching scans" : "No scans yet"}
            </div>
            <p className="mx-auto mt-1 max-w-[260px] text-[13px] text-slate-600">
              {search
                ? "Try a different product name or barcode."
                : "Head back to the scanner to add your first scan."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((scan) => (
              <li key={scan.id}>
                <div className="group flex flex-col gap-3 px-5 py-3.5 hover:bg-slate-50 transition sm:flex-row sm:items-center sm:gap-4">
                  <div className="w-10 h-10 rounded-lg ring-1 ring-brand-100 bg-brand-50 grid place-items-center shrink-0 text-brand-600">
                    <Orange size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-slate-900 truncate">
                      {scan.productName}
                    </div>
                    <div className="text-[11.5px] text-slate-500 mt-0.5">
                      {scan.foodType ?? "Food"} ·{" "}
                      {scan.barcode ? `${scan.barcode} · ` : ""}
                      {formatDate(scan.createdAt)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                        {mealPeriodLabel(scan.mealPeriod)}
                      </span>
                      <span>
                        Ate at{" "}
                        {formatFullDateTime(scan.eatenAt ?? scan.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="self-start sm:self-auto">
                    <Support level={scan.supportLevel} />
                  </div>
                  <span
                    className={`font-mono text-[14px] tabular-nums font-semibold sm:w-10 sm:text-right ${scoreTone(scan.score)}`}
                  >
                    {scan.score}
                  </span>
                  <button
                    type="button"
                    disabled={deletingIds.has(scan.id)}
                    onClick={(event) => handleDelete(event, scan)}
                    title="Delete scan"
                    className="self-start rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-40 disabled:cursor-wait sm:ml-2 sm:self-auto sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Trash size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
