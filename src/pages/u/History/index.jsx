import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Support } from "../../../components/ui/Pill.jsx";
import {
  FunnelSimple,
  MagnifyingGlass,
  Orange,
  CaretLeft,
  CaretRight,
  X,
  DownloadSimple,
} from "@phosphor-icons/react";
import { apiRequest } from "../../../lib/api.js";
import { clearAuthSession, getAuthSession } from "../../../lib/auth-session.js";
import { FilterModal } from "./components/FilterModal.jsx";
import { ScanDetail } from "./components/ScanDetail.jsx";
import { PAGE_SIZE, buildTargets, formatDate } from "../../../utils/history.js";
import { HistorySkeleton } from "../components/RouteSkeletons.jsx";
import { usePageTitle } from "../../../hooks/usePageTitle.js";

export default function History() {
  usePageTitle("History");
  const navigate = useNavigate();
  const session = getAuthSession();
  const profileId = session?.profile?.id;
  const [items, setItems] = useState([]);
  const [targets] = useState(() => buildTargets(session?.profile ?? {}));
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    support: "All",
    minScore: "",
    maxScore: "",
  });

  useEffect(() => {
    let cancelled = false;

    if (!profileId) {
      navigate("/", { replace: true });
      return;
    }

    const loadHistory = async () => {
      setLoading(true);
      try {
        const data = await apiRequest(`/scans/${profileId}`);
        if (!cancelled) setItems(data.scans ?? []);
      } catch (err) {
        if (String(err.message).toLowerCase().includes("profile not found")) {
          clearAuthSession();
          navigate("/", { replace: true });
          return;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [navigate, profileId]);

  const allItems = useMemo(
    () =>
      [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [items],
  );
  const cats = useMemo(
    () => [
      "All",
      ...Array.from(new Set(allItems.map((i) => i.foodType).filter(Boolean))),
    ],
    [allItems],
  );

  const filtered = useMemo(() => {
    return allItems.filter((s) => {
      if (activeCat !== "All" && s.foodType !== activeCat) return false;
      if (
        search &&
        !s.productName.toLowerCase().includes(search.toLowerCase()) &&
        !s.brand?.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (filters.support !== "All" && s.supportLevel !== filters.support)
        return false;
      if (filters.minScore && s.score < parseInt(filters.minScore))
        return false;
      if (filters.maxScore && s.score > parseInt(filters.maxScore))
        return false;
      return true;
    });
  }, [activeCat, allItems, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const changePage = (p) => setPage(Math.max(1, Math.min(p, totalPages)));

  const handleCat = (c) => {
    setActiveCat(c);
    setPage(1);
  };
  const handleSearch = (v) => {
    setSearch(v);
    setPage(1);
  };
  const handleFilters = (f) => {
    setFilters(f);
    setPage(1);
  };

  const hasFilters =
    filters.support !== "All" || filters.minScore || filters.maxScore;

  const exportCSV = () => {
    const header = "Product,Brand,Category,Score,Support,Date\n";
    const rows = filtered
      .map(
        (s) =>
          `"${s.productName}","${s.brand ?? ""}","${s.foodType}",${s.score},${s.supportLevel},"${formatDate(s.createdAt)}"`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scan-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const pageNums = () => {
    const pages = [];
    for (
      let i = Math.max(1, safePage - 1);
      i <= Math.min(totalPages, safePage + 1);
      i++
    )
      pages.push(i);
    return pages;
  };

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1180px]">
      {selected && (
        <ScanDetail
          scan={selected}
          targets={targets}
          onClose={() => setSelected(null)}
        />
      )}
      {showFilter && (
        <FilterModal
          filters={filters}
          onChange={handleFilters}
          onClose={() => setShowFilter(false)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-brand-600 font-semibold mb-2">
            Scan History
          </div>
          <h1 className="font-display text-[34px] leading-[1.05] tracking-tight text-slate-900">
            Everything you've scanned
          </h1>
          <p className="text-slate-600 mt-2 max-w-[560px]">
            {loading
              ? "Loading scan records..."
              : `${allItems.length} backend scan records.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="line" size="sm" onClick={() => setShowFilter(true)}>
            <FunnelSimple size={14} />
            Filter
            {hasFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 ml-0.5" />
            )}
          </Button>
          <Button variant="line" size="sm" onClick={exportCSV}>
            <DownloadSimple size={14} /> Export CSV
          </Button>
        </div>
      </div>

      {/* Category pills + search */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => handleCat(c)}
            className={`h-9 px-4 rounded-full text-[13px] font-medium transition
              ${activeCat === c ? "bg-slate-900 text-white" : "bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-slate-700"}`}
          >
            {c}
          </button>
        ))}
        <div className="relative w-full sm:ml-auto sm:w-64">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <MagnifyingGlass size={14} />
          </span>
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search products"
            className="h-9 w-full rounded-full bg-white pl-9 pr-9 text-[13px] ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-500"
          />
          {search && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold bg-slate-50 border-b border-slate-200">
          <div className="lg:col-span-3">When</div>
          <div className="lg:col-span-4">Product</div>
          <div className="lg:col-span-2">Category</div>
          <div className="lg:col-span-1 text-left sm:text-right">Score</div>
          <div className="lg:col-span-2 text-left sm:text-right">Support</div>
        </div>

        {loading ? (
          <div className="p-5">
            <HistorySkeleton />
          </div>
        ) : pageItems.length === 0 ? (
          <div className="px-6 py-12 text-center text-[14px] text-slate-400">
            No backend scans match your filters.
          </div>
        ) : (
          <ul>
            {pageItems.map((s, i) => (
              <li key={s.id}>
                <button
                  onClick={() => setSelected(s)}
                  className={`w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-center px-6 py-3.5 text-left hover:bg-slate-50 transition
                    ${i < pageItems.length - 1 ? "border-b border-slate-200" : ""}`}
                >
                  <div className="lg:col-span-3 font-mono text-[12px] text-slate-500 tabular-nums">
                    {formatDate(s.createdAt)}
                  </div>
                  <div className="lg:col-span-4 flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 ring-1 ring-brand-100 grid place-items-center text-brand-500 shrink-0">
                      <Orange size={14} />
                    </div>
                    <div className="leading-tight min-w-0">
                      <div className="text-[13.5px] text-slate-900 font-medium truncate">
                        {s.productName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {s.brand}
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-2 text-[12px] text-slate-600">
                    {s.foodType}
                  </div>
                  <div className="lg:col-span-1 text-left sm:text-right font-mono text-[13px] tabular-nums text-slate-900">
                    {s.score}
                  </div>
                  <div className="lg:col-span-2 flex justify-start sm:justify-end">
                    <Support level={s.supportLevel} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[12px] text-slate-500">
          <span>
            Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}
            –{Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex gap-1 items-center">
            <button
              onClick={() => changePage(safePage - 1)}
              disabled={safePage === 1}
              className="h-7 w-7 rounded-md ring-1 ring-slate-200 hover:bg-white text-slate-700 grid place-items-center disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <CaretLeft size={12} />
            </button>
            {pageNums().map((p) => (
              <button
                key={p}
                onClick={() => changePage(p)}
                className={`h-7 w-7 rounded-md text-[12px] font-medium transition
                  ${p === safePage ? "bg-brand-600 text-white" : "ring-1 ring-slate-200 hover:bg-white text-slate-700"}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => changePage(safePage + 1)}
              disabled={safePage === totalPages}
              className="h-7 w-7 rounded-md ring-1 ring-slate-200 hover:bg-white text-slate-700 grid place-items-center disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <CaretRight size={12} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
