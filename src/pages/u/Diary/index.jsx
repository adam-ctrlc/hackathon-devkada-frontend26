import { useState, useEffect, useRef, useCallback } from "react";
import { apiRequest } from "../../../lib/api.js";
import { runGeminiLiveJson } from "../../../lib/gemini-live.js";
import { buildDiaryReflectionPrompt } from "../../../prompts/diary.js";
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
} from "../../../lib/auth-session.js";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Microphone,
  Plus,
  Sparkle,
  Trash,
  Lightning,
  Drop,
  Pulse,
  NotePencil,
  Clock,
  Smiley,
  MagnifyingGlass,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import {
  createDraftEntry,
  deriveMoodKey,
  fmtDate,
  fmtTime,
  labelizeMood,
  mapDiaryEntry,
  moodBg,
  moodLevels,
  moods,
} from "../../../utils/diary.js";
import { DiaryLockModal } from "./components/DiaryLockModal.jsx";
import { DiarySkeleton } from "../components/RouteSkeletons.jsx";
import { usePageTitle } from "../../../hooks/usePageTitle.js";

export default function Diary() {
  usePageTitle("Diary");
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingEntry, setSavingEntry] = useState(false);
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const [lockState, setLockState] = useState({
    checked: false,
    locked: false,
    unlocked: false,
    pin: "",
  });
  const [lockBusy, setLockBusy] = useState(false);
  const [lockError, setLockError] = useState("");
  const saveTimer = useRef(null);
  const textareaRef = useRef(null);
  const session = getAuthSession();
  const profileId = session?.profile?.id ?? session?.user?.profileId;
  const diaryPin = lockState.pin;

  const active =
    entries.find((e) => e.id === activeId) ?? entries[0] ?? createDraftEntry();
  const todayWaterCups = Math.round(
    entries
      .filter(
        (entry) =>
          new Date(entry.createdAt).toDateString() ===
          new Date().toDateString(),
      )
      .reduce((sum, entry) => sum + Number(entry.waterIntakeMl ?? 0), 0) / 250,
  );
  const waterTargetCups = 8;

  useEffect(() => {
    let cancelled = false;

    if (!profileId) {
      clearAuthSession();
      navigate("/login", { replace: true });
      return () => {
        cancelled = true;
      };
    }

    const checkDiaryLock = async () => {
      try {
        const data = await apiRequest(`/profiles/${profileId}/diary-lock`);
        if (cancelled) return;
        const locked = Boolean(data?.diaryLocked);
        setLockState({
          checked: true,
          locked,
          unlocked: false,
          pin: "",
        });
      } catch (err) {
        if (String(err.message).toLowerCase().includes("profile not found")) {
          clearAuthSession();
          navigate("/login", { replace: true });
          return;
        }
        if (!cancelled) {
          setLockState({
            checked: true,
            locked: false,
            unlocked: false,
            pin: "",
          });
          setLockError(err.message || "Couldn't check your diary lock.");
        }
      }
    };

    checkDiaryLock();

    return () => {
      cancelled = true;
    };
  }, [navigate, profileId]);

  useEffect(() => {
    let cancelled = false;

    if (!profileId || !lockState.checked || !lockState.unlocked) {
      return () => {
        cancelled = true;
      };
    }

    const loadEntries = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest(`/diary/${profileId}`, {
          headers: diaryPin ? { "x-diary-pin": diaryPin } : undefined,
        });
        if (cancelled) return;
        const nextEntries = (data?.entries ?? []).map(mapDiaryEntry);
        const resolvedEntries =
          nextEntries.length > 0 ? nextEntries : [createDraftEntry()];
        setEntries(resolvedEntries);
        setActiveId(resolvedEntries[0]?.id ?? null);
      } catch (err) {
        if (cancelled) return;
        if (String(err.message).toLowerCase().includes("diary locked")) {
          setLockState((current) => ({
            ...current,
            locked: true,
            unlocked: false,
            pin: "",
          }));
          setLockError("Wrong PIN. Try again.");
          return;
        }
        setError(err.message || "Couldn't load your diary. Try again.");
        const draft = createDraftEntry();
        setEntries([draft]);
        setActiveId(draft.id);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadEntries();

    return () => {
      cancelled = true;
    };
  }, [diaryPin, lockState.checked, lockState.unlocked, profileId]);

  // ── helpers ──────────────────────────────────────────────
  const updateActive = useCallback(
    (patch) => {
      setSaved(false);
      clearTimeout(saveTimer.current);
      setEntries((prev) =>
        prev.map((e) => (e.id === activeId ? { ...e, ...patch } : e)),
      );
      saveTimer.current = setTimeout(() => setSaved(true), 1200);
    },
    [activeId],
  );

  const addEntry = () => {
    const entry = createDraftEntry();
    setEntries((prev) => [entry, ...prev]);
    setActiveId(entry.id);
    setSaved(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const deleteEntry = async () => {
    if (entries.length === 1) return;
    const previousEntries = entries;
    const previousActiveId = activeId;
    const remaining = entries.filter((e) => e.id !== activeId);

    setEntries(remaining);
    setActiveId(remaining[0]?.id ?? null);
    setError("");

    if (active.persisted) {
      try {
        await apiRequest(`/diary/${active.id}`, {
          method: "DELETE",
          timeoutMs: 10000,
        });
      } catch (err) {
        if (
          String(err.message ?? "")
            .toLowerCase()
            .includes("not found")
        ) {
          return;
        }

        setEntries(previousEntries);
        setActiveId(previousActiveId);
        setError(err.message || "Couldn't delete this entry.");
        return;
      }
    }
  };

  const switchEntry = (id) => {
    setSaved(true);
    clearTimeout(saveTimer.current);
    setActiveId(id);
  };

  const saveActive = async () => {
    if (!profileId || !active?.text?.trim()) return;
    setSavingEntry(true);
    setError("");
    try {
      const data = await apiRequest(
        active.persisted ? `/diary/${active.id}` : "/diary",
        {
          method: active.persisted ? "PATCH" : "POST",
          body: {
            profileId,
            entry: active.text,
            moodTag: active.moodKey,
            energyLevel: active.energy,
            stressLevel: active.stress,
            waterIntakeMl: active.waterIntakeMl || null,
          },
          timeoutMs: 20000,
        },
      );
      const savedEntry = mapDiaryEntry(data?.diary);
      setEntries((prev) => {
        if (active.persisted) {
          return prev.map((entry) =>
            entry.id === active.id ? savedEntry : entry,
          );
        }

        return [savedEntry, ...prev.filter((entry) => entry.id !== active.id)];
      });
      setActiveId(savedEntry.id);
      setSaved(true);
    } catch (err) {
      setError(err.message || "Couldn't save your entry.");
      setSaved(false);
    } finally {
      setSavingEntry(false);
    }
  };

  const generateInsight = async () => {
    if (generatingInsight) return;
    if (!active?.text?.trim()) {
      setError("Add a few words first, then ask for insights.");
      return;
    }

    setGeneratingInsight(true);
    setError("");
    try {
      const data = await runGeminiLiveJson({
        prompt: buildDiaryReflectionPrompt({
          profile: session?.profile,
          entry: active.text,
          mood: active.mood,
          energy: active.energy,
          stress: active.stress,
          todayWaterCups,
          waterTargetCups,
        }),
        temperature: 0.5,
      });
      const reflection =
        String(data?.reflection ?? "").trim() ||
        "Could not generate an insight from this entry.";

      setEntries((prev) =>
        prev.map((e) => (e.id === active.id ? { ...e, ai: reflection } : e)),
      );

      if (active.persisted) {
        await apiRequest(`/diary/${active.id}`, {
          method: "PATCH",
          body: {
            profileId,
            entry: active.text,
            moodTag: active.moodKey,
            energyLevel: active.energy,
            stressLevel: active.stress,
            waterIntakeMl: active.waterIntakeMl || null,
            aiReflection: reflection,
          },
          timeoutMs: 20000,
        }).catch(() => {});
      }
    } catch (err) {
      setError(err.message || "Could not generate insight");
    } finally {
      setGeneratingInsight(false);
    }
  };

  const createDiaryPin = async (pin) => {
    if (!profileId) return;
    setLockBusy(true);
    setLockError("");
    try {
      const data = await apiRequest(`/profiles/${profileId}/diary-lock`, {
        method: "POST",
        body: { pin },
        timeoutMs: 10000,
      });
      const currentSession = getAuthSession();
      if (currentSession && data?.profile) {
        setAuthSession({
          ...currentSession,
          profile: {
            ...currentSession.profile,
            ...data.profile,
            diaryLocked: true,
          },
        });
      }
      setLockState({
        checked: true,
        locked: true,
        unlocked: true,
        pin,
      });
    } catch (err) {
      setLockError(err);
    } finally {
      setLockBusy(false);
    }
  };

  const unlockDiary = (pin) => {
    setLockError("");
    setLockState((current) => ({
      ...current,
      locked: true,
      unlocked: true,
      pin,
    }));
  };

  const resetDiaryPin = async ({ password, pin }) => {
    if (!profileId) return;
    setLockBusy(true);
    setLockError("");
    try {
      const data = await apiRequest(`/profiles/${profileId}/diary-lock/reset`, {
        method: "POST",
        body: { password, pin },
        timeoutMs: 10000,
      });
      const currentSession = getAuthSession();
      if (currentSession && data?.profile) {
        setAuthSession({
          ...currentSession,
          profile: {
            ...currentSession.profile,
            ...data.profile,
            diaryLocked: true,
          },
        });
      }
      setLockState({
        checked: true,
        locked: true,
        unlocked: true,
        pin,
      });
    } catch (err) {
      setLockError(err);
    } finally {
      setLockBusy(false);
    }
  };

  // focus textarea when active entry changes
  useEffect(() => {
    if (lockState.unlocked) {
      textareaRef.current?.focus();
    }
  }, [activeId, lockState.unlocked]);

  const filtered = entries.filter(
    (e) => !search || e.text.toLowerCase().includes(search.toLowerCase()),
  );

  const wordCount = active.text.trim().split(/\s+/).filter(Boolean).length;
  const MoodIcon = moods.find((m) => m.k === active.moodKey)?.Icon ?? Smiley;
  const lockMode = lockState.checked && lockState.locked ? "unlock" : "create";
  const locked = !lockState.unlocked;

  return (
    <div className="relative flex min-h-[calc(100vh-56px)] flex-col overflow-y-auto bg-slate-50 lg:h-[calc(100vh-56px)] lg:flex-row lg:overflow-hidden">
      {locked && (
        <DiaryLockModal
          mode={lockMode}
          loading={lockBusy || !lockState.checked}
          error={lockError}
          onCreate={createDiaryPin}
          onUnlock={unlockDiary}
          onReset={resetDiaryPin}
          onCancel={() => navigate("/u/dashboard")}
        />
      )}
      {locked && (
        <div className="absolute inset-0 z-20 bg-white/30 backdrop-blur-[2px] pointer-events-none" />
      )}
      {/* ── Left: entry list ──────────────────────────────── */}
      <div
        className={`w-full shrink-0 border-b border-slate-200 bg-white flex flex-col transition lg:w-[260px] lg:border-b-0 lg:border-r ${
          locked ? "blur-sm select-none pointer-events-none" : ""
        }`}
      >
        <div className="px-4 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="font-display text-[16px] text-slate-900">
              Journal
            </span>
            <button
              onClick={addEntry}
              className="w-7 h-7 rounded-lg bg-brand-50 grid place-items-center text-brand-600 hover:bg-brand-100 transition"
            >
              <Plus size={14} weight="bold" />
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <MagnifyingGlass size={12} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries…"
              className="w-full h-8 pl-7 pr-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[12px] outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400"
            />
          </div>
        </div>

        <ul className="max-h-[220px] flex-1 overflow-y-auto py-1 lg:max-h-none">
          {loading && (
            <li className="px-4 py-3">
              <DiarySkeleton />
            </li>
          )}
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-[12px] text-slate-400 text-center">
              No entries found
            </li>
          )}
          {filtered.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => switchEntry(e.id)}
                className={`w-full text-left px-4 py-3 transition border-b border-slate-100 last:border-0
                  ${activeId === e.id ? "bg-brand-50" : "hover:bg-slate-50"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[11px] font-semibold ${activeId === e.id ? "text-brand-700" : "text-slate-500"}`}
                  >
                    {fmtDate(e.createdAt)} · {fmtTime(e.createdAt)}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ring-1 font-medium ${moodBg[e.moodKey]}`}
                  >
                    {e.mood}
                  </span>
                </div>
                <p className="text-[12px] text-slate-500 leading-snug line-clamp-2">
                  {e.text || (
                    <span className="italic text-slate-300">Empty entry</span>
                  )}
                </p>
              </button>
            </li>
          ))}
        </ul>

        <div className="px-4 py-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-1.5">
          <Lock size={11} /> PIN protected · {entries.length}{" "}
          {entries.length === 1 ? "entry" : "entries"}
        </div>
      </div>

      {/* ── Centre: editor ───────────────────────────────── */}
      <div
        className={`min-h-[620px] flex-1 flex flex-col overflow-hidden transition lg:min-h-0 ${
          locked ? "blur-sm select-none pointer-events-none" : ""
        }`}
      >
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-200 bg-white flex flex-col gap-3 shrink-0 sm:px-6 lg:h-12 lg:flex-row lg:items-center lg:justify-between lg:py-0">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <NotePencil size={16} className="text-slate-400" />
            <span className="text-[13px] text-slate-700 font-medium">
              {fmtDate(active.createdAt)} · {fmtTime(active.createdAt)}
            </span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full ring-1 font-medium inline-flex items-center gap-1 ${moodBg[active.moodKey]}`}
            >
              <MoodIcon size={11} /> {active.mood}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="h-7 px-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[12px] text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1.5 transition">
              <Microphone size={12} /> Voice
            </button>
            <button
              onClick={deleteEntry}
              disabled={entries.length === 1}
              className="h-7 px-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[12px] text-red-500 hover:bg-red-50 hover:ring-red-200 inline-flex items-center gap-1.5 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash size={12} /> Delete
            </button>
            <button
              onClick={saveActive}
              disabled={!active.text.trim() || savingEntry}
              className="h-7 px-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-medium inline-flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingEntry
                ? "Saving..."
                : active.persisted
                  ? "Save"
                  : saved
                    ? "Draft"
                    : "Save"}
            </button>
          </div>
        </div>

        {error && (
          <div className="px-8 py-2 bg-red-50 border-b border-red-100 text-[12px] text-red-700">
            {error}
          </div>
        )}

        {/* Mood row */}
        <div className="px-4 sm:px-8 py-3 border-b border-slate-100 bg-white flex items-center gap-1.5 flex-wrap shrink-0">
          {moods.map((m) => (
            <button
              key={m.k}
              onClick={() =>
                updateActive({
                  moodKey: m.k,
                  mood: labelizeMood(m.k),
                  energy: moodLevels[m.k]?.energy ?? active.energy,
                  stress: moodLevels[m.k]?.stress ?? active.stress,
                })
              }
              className={`h-8 px-3 rounded-full text-[12px] font-medium transition flex items-center gap-1.5
                ${active.moodKey === m.k ? "bg-brand-600 text-white" : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"}`}
            >
              <m.Icon size={13} /> {m.label}
            </button>
          ))}
        </div>

        {/* Sliders row */}
        <div className="px-4 sm:px-8 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider w-12">
              Energy
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  onClick={() => {
                    const next = deriveMoodKey(i, active.stress);
                    updateActive({
                      energy: i,
                      moodKey: next,
                      mood: labelizeMood(next),
                    });
                  }}
                  className={`w-6 h-6 rounded-md transition ${i <= active.energy ? "bg-brand-500" : "bg-slate-100 ring-1 ring-slate-200 hover:bg-slate-200"}`}
                />
              ))}
            </div>
            <span className="text-[12px] text-slate-400 tabular-nums font-mono">
              {active.energy}/5
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider w-12">
              Stress
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  onClick={() => {
                    const next = deriveMoodKey(active.energy, i);
                    updateActive({
                      stress: i,
                      moodKey: next,
                      mood: labelizeMood(next),
                    });
                  }}
                  className={`w-6 h-6 rounded-md transition ${i <= active.stress ? "bg-amber-400" : "bg-slate-100 ring-1 ring-slate-200 hover:bg-slate-200"}`}
                />
              ))}
            </div>
            <span className="text-[12px] text-slate-400 tabular-nums font-mono">
              {active.stress}/5
            </span>
          </div>
        </div>

        {/* Writing area */}
        <div className="flex-1 overflow-y-auto relative">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, transparent 0px, transparent 31px, #E2E8F0 31px, #E2E8F0 32px)",
              backgroundSize: "100% 32px",
              backgroundPositionY: "56px",
            }}
          />
          <textarea
            ref={textareaRef}
            value={active.text}
            onChange={(e) => updateActive({ text: e.target.value })}
            className="relative w-full h-full resize-none outline-none bg-transparent px-4 sm:px-8 pt-6 pb-8 text-[15px] leading-8 text-slate-800 z-10"
            placeholder="Write freely…"
          />
        </div>

        {/* Footer */}
        <div className="min-h-8 px-4 sm:px-8 py-2 border-t border-slate-100 bg-white flex flex-wrap items-center gap-2 sm:gap-4 text-[11px] text-slate-400 shrink-0">
          <span>
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {active.persisted
              ? saved
                ? "All changes saved"
                : "Unsaved changes"
              : saved
                ? "Draft"
                : "Draft · unsaved"}
          </span>
        </div>
      </div>

      {/* ── Right: AI panel ──────────────────────────────── */}
      <div
        className={`w-full shrink-0 border-t border-slate-200 bg-white flex flex-col overflow-y-auto transition lg:w-[272px] lg:border-l lg:border-t-0 ${
          locked ? "blur-sm select-none pointer-events-none" : ""
        }`}
      >
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-brand-600 font-semibold">
              <Sparkle size={13} /> AI Reflection
            </div>
            <button
              onClick={generateInsight}
              disabled={generatingInsight || !active?.text?.trim()}
              title={
                !active?.text?.trim()
                  ? "Write something first"
                  : "Refresh your reflection"
              }
              className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md ring-1 ring-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ArrowsClockwise
                size={11}
                className={generatingInsight ? "animate-spin" : ""}
              />
              {generatingInsight ? "Generating…" : "Generate"}
            </button>
          </div>
          {generatingInsight ? (
            <div className="mt-3 space-y-2">
              <div className="h-3 w-full rounded bg-slate-100 animate-pulse" />
              <div className="h-3 w-5/6 rounded bg-slate-100 animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-slate-100 animate-pulse" />
            </div>
          ) : (
            <p className="mt-3 font-display text-[15px] text-slate-900 leading-[1.45]">
              {active.ai}
            </p>
          )}
        </div>

        <div className="px-5 py-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
              <Lightning size={11} /> Energy
            </div>
            <div className="font-display text-[18px] text-slate-900">
              {active.energy <= 2 ? "Low" : active.energy <= 3 ? "Mid" : "High"}
            </div>
            <div className="text-[11px] text-slate-500">{active.energy}/5</div>
          </div>
          <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
              <Drop size={11} /> Water
            </div>
            <div className="font-display text-[18px] text-slate-900">
              {todayWaterCups}/{waterTargetCups}
            </div>
            <div className="text-[11px] text-slate-500">cups today</div>
          </div>
          <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3 lg:col-span-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
              <Pulse size={11} /> Pattern
            </div>
            <div className="text-[12px] text-slate-700 leading-snug">
              When you skip breakfast, your wellness score drops{" "}
              <strong className="text-slate-900">−12 on average</strong>.
            </div>
          </div>
        </div>

        <div className="px-5 py-4 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-3">
            All entries ({entries.length})
          </div>
          <div className="space-y-2">
            {entries
              .filter((e) => e.id !== activeId)
              .map((e) => (
                <button
                  key={e.id}
                  onClick={() => switchEntry(e.id)}
                  className="w-full text-left rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3 hover:bg-slate-100 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-slate-600">
                      {fmtDate(e.createdAt)}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ring-1 font-medium ${moodBg[e.moodKey]}`}
                    >
                      {e.mood}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-500 leading-snug line-clamp-2">
                    {e.text || (
                      <span className="italic text-slate-300">Empty</span>
                    )}
                  </p>
                </button>
              ))}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed">
          AI guidance is general only. Follow your doctor's advice during
          recovery or prescribed diets.
        </div>
      </div>
    </div>
  );
}
