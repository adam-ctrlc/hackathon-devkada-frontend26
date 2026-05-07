import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Input, Field } from "../../../components/ui/Input.jsx";
import { Select } from "../../../components/Select.jsx";
import { Basket, CheckCircle, Plus, Trash } from "@phosphor-icons/react";
import { apiRequest } from "../../../lib/api.js";
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
} from "../../../lib/auth-session.js";
import { BudgetSkeleton } from "../components/RouteSkeletons.jsx";

const todayInput = () => new Date().toISOString().slice(0, 10);

export default function Budget() {
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

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1180px] relative">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle size={14} className="text-emerald-400" /> {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-brand-600 font-semibold mb-2">
            Food Budget
          </div>
          <h1 className="font-display text-[34px] leading-[1.05] tracking-tight text-slate-900">
            Plan what to buy
          </h1>
          <p className="text-slate-600 mt-2 max-w-[600px]">
            Log grocery plans or actual spending. Calendar and insights use this
            alongside your scans.
          </p>
        </div>
        <Button
          variant="line"
          size="sm"
          onClick={() => navigate("/u/calendar")}
        >
          View calendar
        </Button>
      </div>

      <div className="space-y-5 mb-5">
        <Card className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            <div className="lg:col-span-4 rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  Profile budget
                </div>
                <div className="mt-1 flex items-end gap-2">
                  <span className="pb-1 text-[13px] font-semibold text-brand-700">
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
                    placeholder="9000"
                    className="min-w-0 flex-1 bg-transparent font-display text-[24px] leading-none text-slate-900 outline-none placeholder:text-slate-300"
                  />
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Select
                    value={budgetForm.currency}
                    onChange={(event) => {
                      setBudgetError("");
                      setBudgetForm((current) => ({
                        ...current,
                        currency: event.target.value,
                      }));
                    }}
                    className="!bg-slate-50 !ring-slate-200"
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
                      setBudgetForm((current) => ({
                        ...current,
                        frequency: event.target.value,
                      }));
                    }}
                    className="!bg-slate-50 !ring-slate-200"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </Select>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-[12px] text-slate-500">
                    Alerts and insights.
                  </span>
                  <Button
                    variant="line"
                    size="sm"
                    onClick={saveProfileBudget}
                    disabled={savingBudget}
                    className="shrink-0"
                  >
                    {savingBudget ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
              {budgetError && (
                <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700 ring-1 ring-red-100">
                  {budgetError}
                </div>
              )}
            </div>
            <div className="lg:col-span-4 rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Spent
              </div>
              <div className="mt-1 flex items-end gap-2">
                <span className="pb-1 text-[13px] font-semibold text-slate-500">
                  {currency}
                </span>
                <span className="font-display text-[24px] text-slate-900 leading-none">
                  {Number(summary?.totalSpent ?? 0).toFixed(0)}
                </span>
              </div>
              <div className="mt-3 text-[12px] text-slate-500">
                Logged spending
              </div>
            </div>
            <div
              className={`lg:col-span-4 rounded-xl ring-1 p-4 ${
                overBudget
                  ? "bg-red-50 ring-red-100"
                  : "bg-brand-50 ring-brand-100"
              }`}
            >
              <div
                className={`text-[10px] uppercase tracking-wider font-semibold ${
                  overBudget ? "text-red-700" : "text-brand-700"
                }`}
              >
                Remaining
              </div>
              <div className="mt-1 flex items-end gap-2">
                {remaining == null ? (
                  <span className="font-display text-[24px] text-slate-900 leading-none">
                    --
                  </span>
                ) : (
                  <>
                    <span
                      className={`pb-1 text-[13px] font-semibold ${
                        overBudget ? "text-red-700" : "text-brand-700"
                      }`}
                    >
                      {currency}
                    </span>
                    <span className="font-display text-[24px] text-slate-900 leading-none">
                      {remaining.toFixed(0)}
                    </span>
                  </>
                )}
              </div>
              {overBudget && (
                <div className="text-[12px] text-red-700 mt-3">
                  Over budget. You can still log this.
                </div>
              )}
              {!overBudget && (
                <div className="mt-3 text-[12px] text-slate-500">
                  Available balance
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-5">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Add budget log
            </div>
            <h2 className="font-display text-[22px] text-slate-900 mt-1">
              What are you planning or spending today?
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <Field label="Title" className="lg:col-span-5">
              <Input
                value={form.title}
                onChange={(event) => {
                  setLogError("");
                  setForm((f) => ({ ...f, title: event.target.value }));
                }}
                placeholder="e.g. Today groceries"
              />
            </Field>
            <Field label="Type" className="lg:col-span-3">
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
            <Field label="Date" className="lg:col-span-4">
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
          <div className="mt-5 rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
            <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Items to buy
                </div>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  One food per row. Item amounts become the log total.
                </p>
              </div>
              <Button variant="line" size="sm" onClick={addItem}>
                <Plus size={13} /> Add item
              </Button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_132px_40px] sm:items-center"
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
                    title="Delete item"
                    className="h-10 w-10 rounded-lg bg-white ring-1 ring-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:ring-red-100 transition inline-flex items-center justify-center"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[12px] text-slate-600">
              Item total:{" "}
              <span className="font-mono text-slate-900">
                {currency} {itemTotal.toFixed(0)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mt-3">
            <Field label="Note" className="lg:col-span-12">
              <Input
                value={form.note}
                onChange={(event) =>
                  setForm((f) => ({ ...f, note: event.target.value }))
                }
                placeholder="Optional"
              />
            </Field>
          </div>
          {logError && (
            <div className="mt-3 rounded-xl bg-red-50 ring-1 ring-red-100 px-3 py-2 text-[12.5px] text-red-700">
              {logError}
            </div>
          )}
          <div className="mt-4">
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
              <Plus size={14} /> {saving ? "Saving..." : "Save budget log"}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Budget activity
            </div>
            <h3 className="font-display text-[18px] text-slate-900 mt-0.5">
              Plans and spending
            </h3>
          </div>
          <Basket size={22} className="text-brand-500" />
        </div>
        {loading ? (
          <div className="p-8 text-[14px] text-slate-500">
            Loading budget logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-[14px] text-slate-500">
            No budget logs yet.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {logs.map((log) => (
              <li
                key={log.id}
                className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[14px] text-slate-900">
                    {log.title}
                  </div>
                  <div className="text-[12px] text-slate-500 mt-0.5 break-words">
                    {log.entryType} ·{" "}
                    {new Date(
                      log.spentAt ?? log.plannedFor ?? log.createdAt,
                    ).toLocaleDateString()}
                    {Array.isArray(log.items) && log.items.length
                      ? ` · ${log.items
                          .map((item) =>
                            typeof item === "object"
                              ? `${item.name}${item.amount != null ? ` (${log.currency} ${Number(item.amount).toFixed(0)})` : ""}`
                              : String(item),
                          )
                          .join(", ")}`
                      : ""}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="font-mono text-[13px] text-slate-900">
                    {log.currency} {Number(log.amount).toFixed(0)}
                  </div>
                  <button
                    onClick={() => deleteLog(log.id)}
                    disabled={deletingId === log.id}
                    title={deletingId === log.id ? "Deleting..." : "Delete log"}
                    aria-label={
                      deletingId === log.id ? "Deleting log" : "Delete log"
                    }
                    className="w-8 h-8 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 grid place-items-center transition"
                  >
                    {deletingId === log.id ? (
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 border-t-red-500 animate-spin" />
                    ) : (
                      <Trash size={14} />
                    )}
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
