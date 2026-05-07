import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Input, Field } from "../../../components/ui/Input.jsx";
import { Select } from "../../../components/Select.jsx";
import {
  Basket,
  CheckCircle,
  Plus,
  Trash,
  CurrencyCircleDollar,
  Warning,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { apiRequest } from "../../../lib/api.js";
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
} from "../../../lib/auth-session.js";
import { BudgetSkeleton } from "../components/RouteSkeletons.jsx";
import { usePageTitle } from "../../../hooks/usePageTitle.js";

const todayInput = () => new Date().toISOString().slice(0, 10);

export default function Budget() {
  usePageTitle("Budget");
  const navigate = useNavigate();
  const session = getAuthSession();
  const profileId = session?.profile?.id;
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [logError, setLogError] = useState("");
  const [budgetForm, setBudgetForm] = useState({
    amount: session?.profile?.budgetAmount ?? "",
    currency: session?.profile?.budgetCurrency ?? "PHP",
    frequency: session?.profile?.budgetFrequency ?? "monthly",
  });
  const [form, setForm] = useState({
    title: "",
    entryType: "planned",
    category: "groceries",
    date: todayInput(),
    items: [{ name: "", amount: "" }],
    note: "",
  });

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  };

  const loadBudget = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/budget-logs/${profileId}`);
      setLogs(data.logs ?? []);
      setSummary(data.summary ?? null);
      const latestProfile = getAuthSession()?.profile;
      setBudgetForm({
        amount: data.summary?.budgetAmount ?? latestProfile?.budgetAmount ?? "",
        currency:
          data.summary?.budgetCurrency ??
          latestProfile?.budgetCurrency ??
          "PHP",
        frequency:
          data.summary?.budgetFrequency ??
          latestProfile?.budgetFrequency ??
          "monthly",
      });
    } catch (err) {
      if (String(err.message).toLowerCase().includes("profile not found")) {
        clearAuthSession();
        navigate("/", { replace: true });
        return;
      }
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!profileId) {
      navigate("/", { replace: true });
      return;
    }

    const loadInitialBudget = async () => {
      try {
        const data = await apiRequest(`/budget-logs/${profileId}`);
        if (cancelled) return;
        setLogs(data.logs ?? []);
        setSummary(data.summary ?? null);
        const latestProfile = getAuthSession()?.profile;
        setBudgetForm({
          amount:
            data.summary?.budgetAmount ?? latestProfile?.budgetAmount ?? "",
          currency:
            data.summary?.budgetCurrency ??
            latestProfile?.budgetCurrency ??
            "PHP",
          frequency:
            data.summary?.budgetFrequency ??
            latestProfile?.budgetFrequency ??
            "monthly",
        });
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

    loadInitialBudget();

    return () => {
      cancelled = true;
    };
  }, [navigate, profileId]);

  const itemTotal = form.items.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );
  const resolvedLogAmount = itemTotal;

  const updateItem = (index, key, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const addItem = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, { name: "", amount: "" }],
    }));
  };

  const deleteItem = (index) => {
    setForm((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? [{ name: "", amount: "" }]
          : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const saveProfileBudget = async () => {
    setBudgetError("");
    const nextAmount = Number(budgetForm.amount);
    const currentAmount = Number(summary?.budgetAmount ?? 0);
    const currentCurrency = summary?.budgetCurrency ?? "PHP";
    const currentFrequency = summary?.budgetFrequency ?? "monthly";

    if (
      budgetForm.amount === "" ||
      !Number.isFinite(nextAmount) ||
      nextAmount <= 0
    ) {
      setBudgetError("Enter a budget amount greater than 0.");
      return;
    }

    if (
      nextAmount === currentAmount &&
      budgetForm.currency === currentCurrency &&
      budgetForm.frequency === currentFrequency
    ) {
      setBudgetError("No budget changes to save.");
      return;
    }

    setSavingBudget(true);
    try {
      const data = await apiRequest(`/profiles/${profileId}`, {
        method: "PATCH",
        body: {
          budgetAmount: nextAmount,
          budgetCurrency: budgetForm.currency,
          budgetFrequency: budgetForm.frequency,
        },
      });
      const currentSession = getAuthSession();
      if (currentSession) {
        setAuthSession({
          ...currentSession,
          profile: { ...currentSession.profile, ...data.profile },
        });
      }
      await loadBudget();
      showToast("Profile budget updated");
    } catch (err) {
      showToast(err.message);
    } finally {
      setSavingBudget(false);
    }
  };

  const saveLog = async () => {
    setLogError("");
    const normalizedItems = form.items
      .map((item) => ({
        name: item.name.trim(),
        amount: item.amount === "" ? null : Number(item.amount),
      }))
      .filter((item) => item.name || item.amount != null);
    const hasHalfFilledItem = normalizedItems.some(
      (item) =>
        (item.name && (item.amount == null || !Number.isFinite(item.amount))) ||
        (!item.name && item.amount != null),
    );

    if (!form.title.trim()) {
      setLogError("Add a title before saving.");
      return;
    }

    if (!form.date) {
      setLogError("Choose a date before saving.");
      return;
    }

    if (hasHalfFilledItem) {
      setLogError("Each item row needs both a food name and an amount.");
      return;
    }

    if (!Number.isFinite(resolvedLogAmount) || resolvedLogAmount <= 0) {
      setLogError("Add item amounts greater than 0.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest("/budget-logs", {
        method: "POST",
        body: {
          profileId,
          ...form,
          amount: resolvedLogAmount,
          items: normalizedItems,
          currency: budgetForm.currency,
        },
      });
      setForm({
        title: "",
        entryType: "planned",
        category: "groceries",
        date: todayInput(),
        items: [{ name: "", amount: "" }],
        note: "",
      });
      await loadBudget();
      showToast("Budget log saved");
    } catch (err) {
      setLogError(err.message);
      showToast(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteLog = async (id) => {
    setDeletingId(id);
    try {
      await apiRequest(`/budget-logs/${id}`, { method: "DELETE" });
      await loadBudget();
      showToast("Budget log deleted");
    } catch (err) {
      showToast(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const currency = budgetForm.currency;
  const remaining = summary?.remaining;
  const overBudget =
    summary?.overBudget || (remaining != null && remaining < 0);

  if (loading && logs.length === 0 && !summary) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1180px]">
        <BudgetSkeleton />
      </div>
    );
  }

  const spentPct =
    budgetForm.amount && summary?.totalSpent != null
      ? Math.min(100, (summary.totalSpent / Number(budgetForm.amount)) * 100)
      : null;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1180px] relative">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle size={14} className="text-emerald-400" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-brand-600 font-semibold mb-2">
            Food Budget
          </div>
          <h1 className="font-display text-[34px] leading-[1.05] tracking-tight text-slate-900">
            Plan what to buy
          </h1>
          <p className="text-slate-600 mt-2 max-w-[560px]">
            Log grocery plans or actual spending. Calendar and insights use this
            alongside your scans.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/u/calendar")}
        >
          View calendar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left sidebar */}
        <div className="lg:col-span-4 space-y-4">
          {/* Budget settings */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-brand-50 grid place-items-center">
                <CurrencyCircleDollar size={14} className="text-brand-600" />
              </div>
              <span className="font-semibold text-[13px] text-slate-800">
                Budget limit
              </span>
            </div>

            <div className="bg-slate-50 ring-1 ring-slate-100 rounded-xl p-4 mb-3">
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                {budgetForm.frequency} limit
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-[14px] font-semibold text-brand-600 pb-0.5">
                  {budgetForm.currency}
                </span>
                <input
                  type="number"
                  min="0"
                  value={budgetForm.amount}
                  onChange={(event) => {
                    setBudgetError("");
                    setBudgetForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }));
                  }}
                  placeholder="0"
                  className="flex-1 min-w-0 bg-transparent font-display text-[30px] leading-none text-slate-900 outline-none placeholder:text-slate-300 w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <Select
                value={budgetForm.currency}
                onChange={(event) => {
                  setBudgetError("");
                  setBudgetForm((c) => ({
                    ...c,
                    currency: event.target.value,
                  }));
                }}
              >
                <option value="PHP">PHP</option>
                <option value="USD">USD</option>
                <option value="SGD">SGD</option>
                <option value="EUR">EUR</option>
              </Select>
              <Select
                value={budgetForm.frequency}
                onChange={(event) => {
                  setBudgetError("");
                  setBudgetForm((c) => ({
                    ...c,
                    frequency: event.target.value,
                  }));
                }}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </div>

            {budgetError && (
              <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700 ring-1 ring-red-100">
                {budgetError}
              </div>
            )}

            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={saveProfileBudget}
              disabled={savingBudget}
            >
              {savingBudget ? (
                <>
                  <ArrowsClockwise size={13} className="animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <CheckCircle size={13} /> Save budget
                </>
              )}
            </Button>
          </Card>

          {/* Spent + Remaining */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 p-4">
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                Spent
              </div>
              <div className="font-display text-[22px] leading-none text-slate-900">
                {Number(summary?.totalSpent ?? 0).toFixed(0)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1.5">
                {currency} this period
              </div>
            </div>
            <div
              className={`rounded-xl ring-1 p-4 ${
                overBudget
                  ? "bg-red-50 ring-red-100"
                  : "bg-brand-50 ring-brand-100"
              }`}
            >
              <div
                className={`text-[9px] uppercase tracking-wider font-semibold mb-1 ${
                  overBudget ? "text-red-600" : "text-brand-600"
                }`}
              >
                {overBudget ? "Over" : "Left"}
              </div>
              <div className="font-display text-[22px] leading-none text-slate-900">
                {remaining == null ? "—" : Math.abs(remaining).toFixed(0)}
              </div>
              <div
                className={`text-[10px] mt-1.5 ${
                  overBudget ? "text-red-500" : "text-slate-400"
                }`}
              >
                {overBudget
                  ? `${currency} over budget`
                  : `${currency} available`}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {spentPct != null && (
            <div className="px-1">
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${overBudget ? "bg-red-400" : "bg-brand-500"}`}
                  style={{ width: `${spentPct}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-slate-400">
                <span>0</span>
                <span className={overBudget ? "text-red-500 font-medium" : ""}>
                  {Math.round(spentPct)}% used
                </span>
                <span>
                  {currency} {Number(budgetForm.amount).toFixed(0)}
                </span>
              </div>
            </div>
          )}

          {overBudget && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 ring-1 ring-red-100 px-3 py-2.5">
              <Warning size={13} className="text-red-500 shrink-0" />
              <span className="text-[12px] text-red-700">
                Over budget — you can still log.
              </span>
            </div>
          )}
        </div>

        {/* Right main */}
        <div className="lg:col-span-8 space-y-4">
          {/* Add log form */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 grid place-items-center">
                <Plus size={14} className="text-emerald-600" />
              </div>
              <span className="font-semibold text-[13px] text-slate-800">
                New log
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_150px] gap-3 mb-4">
              <Field label="Title">
                <Input
                  value={form.title}
                  onChange={(event) => {
                    setLogError("");
                    setForm((f) => ({ ...f, title: event.target.value }));
                  }}
                  placeholder="e.g. Weekly groceries"
                />
              </Field>
              <Field label="Type">
                <Select
                  value={form.entryType}
                  onChange={(event) => {
                    setLogError("");
                    setForm((f) => ({ ...f, entryType: event.target.value }));
                  }}
                >
                  <option value="planned">Planned</option>
                  <option value="spent">Spent</option>
                </Select>
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  value={form.date}
                  onChange={(event) => {
                    setLogError("");
                    setForm((f) => ({ ...f, date: event.target.value }));
                  }}
                />
              </Field>
            </div>

            {/* Items */}
            <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                    Items
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    One item per row — amounts sum to total.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={addItem}>
                  <Plus size={12} /> Add row
                </Button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_130px_36px] sm:items-center"
                  >
                    <Input
                      value={item.name}
                      onChange={(event) => {
                        setLogError("");
                        updateItem(index, "name", event.target.value);
                      }}
                      placeholder="Food item"
                      className="bg-white"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={item.amount}
                      onChange={(event) => {
                        setLogError("");
                        updateItem(index, "amount", event.target.value);
                      }}
                      placeholder="Amount"
                      className="bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => deleteItem(index)}
                      aria-label="Delete item"
                      className="h-9 w-9 rounded-lg bg-white ring-1 ring-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:ring-red-100 transition inline-flex items-center justify-center"
                    >
                      <Trash size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Total</span>
                <span className="font-mono text-[13px] font-semibold text-slate-900">
                  {currency} {itemTotal.toFixed(0)}
                </span>
              </div>
            </div>

            <Field label="Note (optional)" className="mb-4">
              <Input
                value={form.note}
                onChange={(event) =>
                  setForm((f) => ({ ...f, note: event.target.value }))
                }
                placeholder="Any context…"
              />
            </Field>

            {logError && (
              <div className="mb-3 rounded-xl bg-red-50 ring-1 ring-red-100 px-3 py-2 text-[12px] text-red-700">
                {logError}
              </div>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={saveLog}
              disabled={
                saving ||
                !form.title.trim() ||
                !Number.isFinite(resolvedLogAmount) ||
                resolvedLogAmount <= 0
              }
            >
              {saving ? (
                <>
                  <ArrowsClockwise size={13} className="animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Plus size={14} /> Save log
                </>
              )}
            </Button>
          </Card>

          {/* Activity list */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Activity
                </div>
                <h3 className="font-display text-[17px] text-slate-900 mt-0.5">
                  Plans &amp; spending
                </h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-brand-50 grid place-items-center">
                <Basket size={15} className="text-brand-600" />
              </div>
            </div>

            {loading ? (
              <div className="p-8 flex items-center gap-2 text-[13px] text-slate-400">
                <ArrowsClockwise size={14} className="animate-spin" /> Loading…
              </div>
            ) : logs.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 ring-1 ring-brand-100 grid place-items-center mx-auto mb-3">
                  <Basket size={18} className="text-brand-500" />
                </div>
                <div className="font-display text-[16px] text-slate-800 mb-1">
                  No logs yet
                </div>
                <p className="text-[12px] text-slate-400">
                  Add your first grocery plan or spending above.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className="group px-5 py-3.5 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-xl bg-brand-50 ring-1 ring-brand-100 grid place-items-center shrink-0">
                      <Basket size={14} className="text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-slate-900 truncate">
                        {log.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {new Date(
                          log.spentAt ?? log.plannedFor ?? log.createdAt,
                        ).toLocaleDateString()}
                        {Array.isArray(log.items) && log.items.length > 0
                          ? " · " +
                            log.items
                              .slice(0, 3)
                              .map((item) =>
                                typeof item === "object"
                                  ? item.name
                                  : String(item),
                              )
                              .join(", ") +
                            (log.items.length > 3
                              ? ` +${log.items.length - 3}`
                              : "")
                          : ""}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ${
                          log.entryType === "spent"
                            ? "bg-amber-50 text-amber-700 ring-amber-100"
                            : "bg-slate-100 text-slate-500 ring-slate-200"
                        }`}
                      >
                        {log.entryType}
                      </span>
                      <span className="font-mono text-[13px] font-semibold text-slate-900 min-w-[60px] text-right">
                        {log.currency} {Number(log.amount).toFixed(0)}
                      </span>
                      <button
                        onClick={() => deleteLog(log.id)}
                        disabled={deletingId === log.id}
                        title="Delete"
                        className="w-7 h-7 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 grid place-items-center transition sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        {deletingId === log.id ? (
                          <span className="h-3 w-3 rounded-full border-2 border-slate-200 border-t-red-400 animate-spin" />
                        ) : (
                          <Trash size={13} />
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
