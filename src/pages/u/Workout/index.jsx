import { useState, useEffect, useMemo } from "react";
import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Pill } from "../../../components/ui/Pill.jsx";
import { Ring, Spark, Bar } from "../../../components/ui/Charts.jsx";
import { Modal } from "../../../components/ui/Modal.jsx";
import { apiRequest } from "../../../lib/api.js";
import { clearAuthSession, getAuthSession } from "../../../lib/auth-session.js";
import { getDayPeriod } from "../../../lib/date-time.js";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  ArrowRight,
  Sparkle,
  Fire,
  Lightning,
  Timer,
  Footprints,
  Heart,
  CaretUp,
  Play,
  Barbell,
  CheckCircle,
  Check,
  Drop,
  Moon,
} from "@phosphor-icons/react";
import { LogModal } from "./components/LogModal.jsx";
import { SessionTimer } from "./components/SessionTimer.jsx";
import {
  typeIcon,
  typeTone,
  typeLabel,
  intensityPct,
  weekDays,
  workoutTypes,
  waterPeriods,
  formatDate,
  getInputDateTimeValue,
  inferWaterPeriod,
  setWaterPeriodOnDateTime,
  mapWorkoutLog,
  mapWaterLog,
  mapSuggestion,
} from "../../../utils/workout.js";
import { WellnessLogSkeleton } from "../components/RouteSkeletons.jsx";
import { usePageTitle } from "../../../hooks/usePageTitle.js";

export default function Workout() {
  usePageTitle("Workout");
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [waterLogs, setWaterLogs] = useState([]);
  const [sleepLogs, setSleepLogs] = useState([]);
  const [activeLog, setActiveLog] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [logPrefill, setLogPrefill] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingWater, setSavingWater] = useState(false);
  const [deletingWaterId, setDeletingWaterId] = useState(null);
  const [editingWaterId, setEditingWaterId] = useState(null);
  const [showWater, setShowWater] = useState(false);
  const [showSleep, setShowSleep] = useState(false);
  const [savingSleep, setSavingSleep] = useState(false);
  const [deletingSleepId, setDeletingSleepId] = useState(null);
  const [editingSleepId, setEditingSleepId] = useState(null);
  const [waterForm, setWaterForm] = useState(() => ({
    glasses: "1",
    glassSizeMl: "250",
    waterPeriod: inferWaterPeriod(),
    drankAt: getInputDateTimeValue(),
    note: "",
  }));
  const [sleepForm, setSleepForm] = useState(() => ({
    hours: "8",
    sleptAt: getInputDateTimeValue(),
    note: "",
  }));
  const session = getAuthSession();
  const profileId = session?.profile?.id ?? session?.user?.profileId;

  useEffect(() => {
    let cancelled = false;

    if (!profileId) {
      clearAuthSession();
      navigate("/login", { replace: true });
      return () => {
        cancelled = true;
      };
    }

    const loadWorkout = async () => {
      setLoading(true);
      setError("");
      try {
        const [logsData, waterData, sleepData] = await Promise.all([
          apiRequest(`/fitness/workouts/${profileId}`),
          apiRequest(`/water/${profileId}?days=14`),
          apiRequest(`/sleep/${profileId}?days=14&autofill=1&defaultHours=8`),
        ]);

        if (cancelled) return;

        const nextLogs = (logsData?.workoutLogs ?? []).map(mapWorkoutLog);
        setLogs(nextLogs);
        setActiveLog((current) => current ?? nextLogs[0] ?? null);
        setWaterLogs((waterData?.water?.logs ?? []).map(mapWaterLog));
        setSleepLogs(sleepData?.sleep?.logs ?? []);

        const suggestionData = await apiRequest(
          `/fitness/workout/${profileId}/suggest`,
          {
            method: "POST",
            body: {
              useGemini: true,
              maxMinutes: 45,
              source: "daily-cache",
            },
            timeoutMs: 20000,
          },
        );
        if (cancelled) return;

        const rawSuggestions =
          suggestionData?.suggestions ??
          suggestionData?.workouts ??
          suggestionData?.items ??
          suggestionData?.exercises ??
          (Array.isArray(suggestionData) ? suggestionData : []);
        const nextSuggestions = rawSuggestions.slice(0, 3).map(mapSuggestion);
        if (nextSuggestions.length === 0) {
          throw new Error("Gemini Live returned no workout suggestions");
        }
        setSuggestions(nextSuggestions);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Unable to load workout data");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadWorkout();

    return () => {
      cancelled = true;
    };
  }, [navigate, profileId]);

  const weekDurations = logs.slice(0, 7).map((w) => w.durationMinutes);
  const visibleLogs = useMemo(
    () =>
      typeFilter === "all"
        ? logs
        : logs.filter((workout) => workout.workoutType === typeFilter),
    [logs, typeFilter],
  );
  const stats = {
    totalMinutes: logs.slice(0, 7).reduce((s, w) => s + w.durationMinutes, 0),
    totalCalories: logs
      .slice(0, 7)
      .reduce((s, w) => s + (w.caloriesBurned ?? 0), 0),
    totalDistanceKm: logs
      .slice(0, 7)
      .reduce((s, w) => s + (w.distanceKm ?? 0), 0)
      .toFixed(1),
    sessionCount: logs.slice(0, 7).length,
  };
  const waterTotalToday = waterLogs
    .filter((log) => {
      const date = new Date(log.drankAt ?? log.createdAt);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toDateString() === new Date().toDateString()
      );
    })
    .reduce((sum, log) => sum + (Number(log.amountMl) || 0), 0);
  const waterFormTotalMl =
    (Number(waterForm.glasses) || 0) * (Number(waterForm.glassSizeMl) || 0);
  const sleepTotalToday = sleepLogs
    .filter((log) => {
      const date = new Date(log.sleptAt ?? log.createdAt);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toDateString() === new Date().toDateString()
      );
    })
    .reduce((sum, log) => sum + (Number(log.hours) || 0), 0);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const resetWaterForm = () => {
    setEditingWaterId(null);
    setWaterForm({
      glasses: "1",
      glassSizeMl: "250",
      waterPeriod: inferWaterPeriod(),
      drankAt: getInputDateTimeValue(),
      note: "",
    });
  };

  const resetSleepForm = () => {
    setEditingSleepId(null);
    setSleepForm({
      hours: "8",
      sleptAt: getInputDateTimeValue(),
      note: "",
    });
  };

  const editWaterLog = (log) => {
    const drankAt = log.drankAt ?? log.createdAt;
    setEditingWaterId(log.id);
    setWaterForm({
      glasses: String(log.glassCount ?? 1),
      glassSizeMl: String(log.glassSizeMl ?? 250),
      waterPeriod: inferWaterPeriod(drankAt),
      drankAt: getInputDateTimeValue(drankAt),
      note: log.note ?? "",
    });
  };

  const editSleepLog = (log) => {
    const sleptAt = log.sleptAt ?? log.createdAt;
    setEditingSleepId(log.id);
    setSleepForm({
      hours: String(Number(log.hours ?? 8)),
      sleptAt: getInputDateTimeValue(sleptAt),
      note: log.note ?? "",
    });
  };

  const saveWaterLog = async () => {
    if (!profileId || savingWater) return;

    const glasses = Number(waterForm.glasses);
    const glassSizeMl = Number(waterForm.glassSizeMl);
    if (!Number.isFinite(glasses) || glasses <= 0) {
      showToast("Enter a valid glass count");
      return;
    }
    if (!Number.isFinite(glassSizeMl) || glassSizeMl <= 0) {
      showToast("Enter a valid glass size");
      return;
    }

    setSavingWater(true);
    try {
      const body = {
        profileId,
        glasses,
        glassSizeMl,
        drankAt: waterForm.drankAt,
        note: waterForm.note.trim() || null,
      };
      const data = await apiRequest(
        editingWaterId ? `/water-logs/${editingWaterId}` : "/water",
        {
          method: editingWaterId ? "PATCH" : "POST",
          body,
          timeoutMs: 12000,
        },
      );
      const savedLog = mapWaterLog(data?.waterLog ?? body);

      setWaterLogs((current) => {
        if (!editingWaterId) return [savedLog, ...current];
        return current.map((item) =>
          item.id === savedLog.id ? savedLog : item,
        );
      });
      showToast(editingWaterId ? "Water log updated" : "Water intake saved");
      resetWaterForm();
      setShowWater(false);
    } catch (err) {
      showToast(err.message || "Water save failed");
    } finally {
      setSavingWater(false);
    }
  };

  const deleteWaterLog = async (logId) => {
    if (!logId) return;
    const previous = waterLogs;
    setDeletingWaterId(logId);
    setWaterLogs((current) => current.filter((item) => item.id !== logId));
    if (editingWaterId === logId) resetWaterForm();

    try {
      await apiRequest(`/water-logs/${logId}`, {
        method: "DELETE",
        timeoutMs: 12000,
      });
      showToast("Water log deleted");
    } catch (err) {
      setWaterLogs(previous);
      showToast(err.message || "Water delete failed");
    } finally {
      setDeletingWaterId(null);
    }
  };

  const saveSleepLog = async () => {
    if (!profileId || savingSleep) return;
    const hours = Number(sleepForm.hours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      showToast("Enter valid sleep hours (0-24)");
      return;
    }

    setSavingSleep(true);
    try {
      const body = {
        profileId,
        hours,
        sleptAt: sleepForm.sleptAt,
        note: sleepForm.note.trim() || null,
      };
      const data = await apiRequest(
        editingSleepId ? `/sleep-logs/${editingSleepId}` : "/sleep",
        {
          method: editingSleepId ? "PATCH" : "POST",
          body,
          timeoutMs: 12000,
        },
      );
      const savedLog = data?.sleepLog ?? body;
      setSleepLogs((current) => {
        if (!editingSleepId) return [savedLog, ...current];
        return current.map((item) =>
          item.id === savedLog.id ? savedLog : item,
        );
      });
      showToast(editingSleepId ? "Sleep log updated" : "Sleep saved");
      resetSleepForm();
      setShowSleep(false);
    } catch (err) {
      showToast(err.message || "Sleep save failed");
    } finally {
      setSavingSleep(false);
    }
  };

  const deleteSleepLog = async (logId) => {
    if (!logId) return;
    const previous = sleepLogs;
    setDeletingSleepId(logId);
    setSleepLogs((current) => current.filter((item) => item.id !== logId));
    if (editingSleepId === logId) resetSleepForm();

    try {
      await apiRequest(`/sleep-logs/${logId}`, {
        method: "DELETE",
        timeoutMs: 12000,
      });
      showToast("Sleep log deleted");
    } catch (err) {
      setSleepLogs(previous);
      showToast(err.message || "Sleep delete failed");
    } finally {
      setDeletingSleepId(null);
    }
  };

  const saveLog = async (entry) => {
    if (!profileId) return;
    setSaving(true);
    try {
      const data = await apiRequest("/fitness/workouts", {
        method: "POST",
        body: {
          profileId,
          workoutName: entry.title,
          ...entry,
        },
        timeoutMs: 15000,
      });
      const savedLog = mapWorkoutLog(data?.workoutLog ?? entry);
      setLogs((prev) => [savedLog, ...prev]);
      setActiveLog(savedLog);
      setShowLog(false);
      setLogPrefill(null);
      showToast(`"${savedLog.title}" logged`);
    } catch (err) {
      showToast(err.message || "Workout save failed");
    } finally {
      setSaving(false);
    }
  };

  const openLog = (prefill = null) => {
    setLogPrefill(prefill);
    setShowLog(true);
  };

  const startSession = (s) => {
    setActiveSession(s);
  };

  const finishSession = (mins) => {
    const session = activeSession;
    setActiveSession(null);
    saveLog({
      title: session.title,
      workoutType: session.type,
      source: "manual",
      durationMinutes: mins,
      caloriesBurned: Math.round(mins * 5.5),
      distanceKm: session.type === "cardio" ? +(mins * 0.08).toFixed(1) : null,
      intensity: "low",
      notes: {
        sessionTime: getDayPeriod(),
        exercises: [
          {
            name: session.title,
            minutes: mins,
            sets: null,
            reps: null,
          },
        ],
      },
    });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1180px] relative">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle size={14} className="text-emerald-400" /> {toast}
        </div>
      )}

      {/* Modals */}
      {showLog && (
        <LogModal
          prefill={logPrefill}
          onSave={saveLog}
          saving={saving}
          onClose={() => {
            setShowLog(false);
            setLogPrefill(null);
          }}
        />
      )}
      {activeSession && (
        <SessionTimer
          session={activeSession}
          onFinish={finishSession}
          onCancel={() => setActiveSession(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-brand-600 font-semibold mb-2">
            Wellness log
          </div>
          <h1 className="font-display text-[34px] leading-[1.05] tracking-tight text-slate-900">
            Workouts, water, and sleep
          </h1>
          <p className="text-slate-600 mt-2 max-w-[560px]">
            Low-impact movement tailored to your recovery. Every session counts
            toward healing.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="line" size="sm" onClick={() => openLog()}>
            <Play size={13} /> Start session
          </Button>
          <Button variant="primary" size="sm" onClick={() => openLog()}>
            <Plus size={14} /> Log workout
          </Button>
        </div>
      </div>

      {loading && (
        <div className="mb-5">
          <WellnessLogSkeleton />
        </div>
      )}

      {error && (
        <Card className="p-5 mb-5 text-[13px] text-red-600">{error}</Card>
      )}

      {/* Hydration strip */}
      <Card className="p-4 mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 grid place-items-center shrink-0">
          <Drop size={20} weight="fill" />
        </div>
        <div className="shrink-0 self-start sm:self-auto">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Today
          </div>
          <div className="font-display text-[22px] leading-none text-slate-900 mt-1">
            {waterTotalToday}
            <span className="text-[12px] text-slate-400 ml-1">ml</span>
          </div>
        </div>
        <div className="hidden h-10 w-px bg-slate-200 mx-1 sm:block" />
        <div className="w-full flex-1 min-w-0 flex items-center gap-2 overflow-x-auto scroll-hide">
          {waterLogs.length === 0 ? (
            <p className="text-[12.5px] text-slate-500">
              No water logged yet — track a glass to feed calendar &amp;
              insights.
            </p>
          ) : (
            waterLogs.slice(0, 4).map((log) => (
              <button
                key={log.id}
                type="button"
                onClick={() => {
                  editWaterLog(log);
                  setShowWater(true);
                }}
                className="shrink-0 rounded-xl bg-slate-50 hover:bg-sky-50 transition px-3 py-2 text-left"
                title="Edit water log"
              >
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold capitalize">
                  {log.waterPeriod ?? "water"}
                </div>
                <div className="font-mono text-[13px] text-slate-900 tabular-nums">
                  {log.amountMl}
                  <span className="text-[10px] text-slate-400 ml-1">ml</span>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
          {waterLogs.length > 4 && (
            <span className="text-[11px] text-slate-500">
              +{waterLogs.length - 4} more
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              resetWaterForm();
              setShowWater(true);
            }}
            className="w-full sm:w-auto"
          >
            <Plus size={12} /> Log water
          </Button>
        </div>
      </Card>

      {/* Sleep strip */}
      <Card className="p-4 mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 grid place-items-center shrink-0">
          <Moon size={20} weight="fill" />
        </div>
        <div className="shrink-0 self-start sm:self-auto">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Today sleep
          </div>
          <div className="font-display text-[22px] leading-none text-slate-900 mt-1">
            {sleepTotalToday ? sleepTotalToday.toFixed(1) : "0.0"}
            <span className="text-[12px] text-slate-400 ml-1">hours</span>
          </div>
        </div>
        <div className="hidden h-10 w-px bg-slate-200 mx-1 sm:block" />
        <div className="w-full flex-1 min-w-0 flex items-center gap-2 overflow-x-auto scroll-hide">
          {sleepLogs.length === 0 ? (
            <p className="text-[12.5px] text-slate-500">
              No sleep logged yet. Default is 8h/day, then you can override it.
            </p>
          ) : (
            sleepLogs.slice(0, 4).map((log) => (
              <button
                key={log.id}
                type="button"
                onClick={() => {
                  editSleepLog(log);
                  setShowSleep(true);
                }}
                className="shrink-0 rounded-xl bg-slate-50 hover:bg-indigo-50 transition px-3 py-2 text-left"
                title="Edit sleep log"
              >
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold capitalize">
                  {new Date(log.sleptAt ?? log.createdAt).toLocaleDateString()}
                </div>
                <div className="font-mono text-[13px] text-slate-900 tabular-nums">
                  {Number(log.hours ?? 0).toFixed(1)}
                  <span className="text-[10px] text-slate-400 ml-1">h</span>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
          {sleepLogs.length > 4 && (
            <span className="text-[11px] text-slate-500">
              +{sleepLogs.length - 4} more
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              resetSleepForm();
              setShowSleep(true);
            }}
            className="w-full sm:w-auto"
          >
            <Plus size={12} /> Log sleep
          </Button>
        </div>
      </Card>

      {/* Weekly overview + AI suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        <Card className="lg:col-span-7 p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
              <Ring
                value={Math.min(Math.round(stats.totalMinutes / 1.5), 100)}
                size={104}
                stroke={9}
                tone="brand"
                sub="activity"
              />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  This week
                </div>
                <div className="font-display text-[30px] leading-none text-slate-900 mt-2">
                  {stats.totalMinutes}
                  <span className="text-[14px] text-slate-400 ml-1">min</span>
                </div>
                <div className="text-[12px] text-slate-500 mt-1">
                  of 150 target
                </div>
                <div className="inline-flex items-center gap-1 mt-2 text-[12px] text-emerald-600 font-medium">
                  <CaretUp size={12} /> +20 vs last wk
                </div>
              </div>
            </div>
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 xl:max-w-[320px]">
              {[
                {
                  label: "Sessions",
                  value: stats.sessionCount,
                  unit: "this wk",
                  icon: Lightning,
                  tone: "brand",
                },
                {
                  label: "Calories",
                  value: stats.totalCalories,
                  unit: "kcal",
                  icon: Fire,
                  tone: "amber",
                },
                {
                  label: "Distance",
                  value: stats.totalDistanceKm,
                  unit: "km",
                  icon: Footprints,
                  tone: "green",
                },
              ].map((s) => {
                const Icon = s.icon;
                const dotColors = {
                  brand: "bg-brand-50 text-brand-600",
                  amber: "bg-amber-50 text-amber-600",
                  green: "bg-emerald-50 text-emerald-600",
                };
                return (
                  <div
                    key={s.label}
                    className="rounded-xl bg-slate-50 p-3 text-center"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${dotColors[s.tone]} grid place-items-center mx-auto mb-2`}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="font-display text-[18px] leading-none text-slate-900">
                      {s.value}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">
                      {s.unit}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-6 overflow-x-auto pb-1">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
              Daily duration
            </div>
            <div className="min-w-[520px]">
              <Spark
                data={weekDurations.length ? weekDurations : [0, 0]}
                w={520}
                h={56}
                tone="brand"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400 tracking-wider">
                {weekDays.map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-5 p-0 overflow-hidden flex flex-col">
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-brand-600 font-semibold">
                AI-suggested
              </div>
              <h3 className="font-display text-[17px] mt-0.5 text-slate-900">
                Recommended for today
              </h3>
            </div>
            <Sparkle size={16} className="text-brand-500" />
          </div>
          <ul className="divide-y divide-slate-100 flex-1">
            {loading && suggestions.length === 0
              ? Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="px-5 py-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 rounded bg-slate-100 animate-pulse" />
                      <div className="h-2.5 w-1/2 rounded bg-slate-100 animate-pulse" />
                    </div>
                  </li>
                ))
              : suggestions.map((s, i) => {
                  const Icon = typeIcon[s.type] ?? Barbell;
                  const tone = typeTone[s.type] ?? "brand";
                  const bg = {
                    brand: "bg-brand-50 text-brand-600",
                    green: "bg-emerald-50 text-emerald-600",
                    amber: "bg-amber-50 text-amber-600",
                  }[tone];
                  return (
                    <li
                      key={i}
                      className="px-5 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-start"
                    >
                      <div
                        className={`w-9 h-9 rounded-lg ${bg} grid place-items-center shrink-0`}
                      >
                        <Icon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-medium text-slate-900 truncate">
                          {s.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mb-1">
                          {s.duration} min · {typeLabel[s.type]}
                        </div>
                        <p className="text-[12px] text-slate-600 leading-snug line-clamp-2">
                          {s.reason}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:flex-col sm:shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => startSession(s)}
                        >
                          <Play size={11} /> Start
                        </Button>
                        <Button
                          variant="line"
                          size="sm"
                          onClick={() =>
                            openLog({
                              title: s.title,
                              type: s.type,
                              duration: s.duration,
                            })
                          }
                        >
                          <Plus size={11} /> Log
                        </Button>
                      </div>
                    </li>
                  );
                })}
          </ul>
          <div className="px-5 py-3 bg-slate-50 flex items-start gap-2">
            <Heart size={13} className="text-brand-600 mt-0.5 shrink-0" />
            <p className="text-[11.5px] text-slate-600 leading-snug">
              <span className="font-medium text-slate-900">
                Recovery mode active.
              </span>{" "}
              Keep intensity gradual. Always check with your doctor before
              increasing intensity.
            </p>
          </div>
        </Card>
      </div>

      {/* Hydration drawer */}
      {showWater && (
        <Modal
          title={editingWaterId ? "Edit water log" : "Log water"}
          subtitle="Glass count, size, and timing — used in calendar and insights."
          width="max-w-[520px]"
          onClose={() => {
            setShowWater(false);
            resetWaterForm();
          }}
          footer={
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="text-[12px] text-slate-500">
                Total:{" "}
                <span className="font-mono text-slate-900">
                  {waterFormTotalMl || 0} ml
                </span>
              </div>
              <div className="flex gap-2">
                {editingWaterId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingWaterId === editingWaterId}
                    onClick={() => {
                      const id = editingWaterId;
                      setShowWater(false);
                      resetWaterForm();
                      deleteWaterLog(id);
                    }}
                    className="!text-red-600 hover:!bg-red-50 disabled:opacity-50"
                  >
                    {deletingWaterId === editingWaterId ? "Deleting…" : "Delete"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowWater(false);
                    resetWaterForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={saveWaterLog}
                  disabled={savingWater}
                >
                  <Check size={13} />
                  {savingWater
                    ? "Saving..."
                    : editingWaterId
                      ? "Update"
                      : "Save water"}
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
                  Glasses
                </label>
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={waterForm.glasses}
                  onChange={(event) =>
                    setWaterForm((current) => ({
                      ...current,
                      glasses: event.target.value,
                    }))
                  }
                  className="w-full h-10 px-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[14px] outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
                  Glass size
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={waterForm.glassSizeMl}
                    onChange={(event) =>
                      setWaterForm((current) => ({
                        ...current,
                        glassSizeMl: event.target.value,
                      }))
                    }
                    className="w-full h-10 px-3 pr-10 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[14px] outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                    ml
                  </span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
                Timing
              </label>
              <input
                type="datetime-local"
                value={waterForm.drankAt}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setWaterForm((current) => ({
                    ...current,
                    drankAt: nextValue,
                    waterPeriod: inferWaterPeriod(nextValue),
                  }));
                }}
                className="w-full h-10 px-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-sky-400"
              />
              <div className="grid grid-cols-2 gap-2 mt-2 sm:grid-cols-5">
                {waterPeriods.map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() =>
                      setWaterForm((current) => ({
                        ...current,
                        drankAt: setWaterPeriodOnDateTime(
                          current.drankAt,
                          value,
                        ),
                        waterPeriod: value,
                      }))
                    }
                    className={`h-8 rounded-full text-[11px] font-semibold transition ${
                      waterForm.waterPeriod === value
                        ? "bg-slate-900 text-white"
                        : "bg-slate-50 ring-1 ring-slate-200 text-slate-600 hover:ring-sky-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
                Note
              </label>
              <textarea
                value={waterForm.note}
                onChange={(event) =>
                  setWaterForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                rows={2}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[14px] outline-none focus:ring-2 focus:ring-sky-400 resize-none"
              />
            </div>
          </div>
        </Modal>
      )}
      {showSleep && (
        <Modal
          title={editingSleepId ? "Edit sleep log" : "Log sleep"}
          subtitle="Default is 8 hours daily. Override specific days anytime."
          width="max-w-[480px]"
          onClose={() => {
            setShowSleep(false);
            resetSleepForm();
          }}
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              {editingSleepId && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deletingSleepId === editingSleepId}
                  onClick={() => {
                    const id = editingSleepId;
                    setShowSleep(false);
                    resetSleepForm();
                    deleteSleepLog(id);
                  }}
                  className="!text-red-600 hover:!bg-red-50 disabled:opacity-50"
                >
                  {deletingSleepId === editingSleepId ? "Deleting…" : "Delete"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowSleep(false);
                  resetSleepForm();
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={saveSleepLog}
                disabled={savingSleep}
              >
                <Check size={13} />
                {savingSleep
                  ? "Saving..."
                  : editingSleepId
                    ? "Update"
                    : "Save sleep"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
                Sleep hours
              </label>
              <input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={sleepForm.hours}
                onChange={(event) =>
                  setSleepForm((current) => ({
                    ...current,
                    hours: event.target.value,
                  }))
                }
                className="w-full h-10 px-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[14px] outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
                Time
              </label>
              <input
                type="datetime-local"
                value={sleepForm.sleptAt}
                onChange={(event) =>
                  setSleepForm((current) => ({
                    ...current,
                    sleptAt: event.target.value,
                  }))
                }
                className="w-full h-10 px-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
                Note
              </label>
              <textarea
                value={sleepForm.note}
                onChange={(event) =>
                  setSleepForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                rows={2}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[14px] outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
            </div>
          </div>
        </Modal>
      )}
      {/* Log + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        <Card className="lg:col-span-5 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Recent sessions
              </div>
              <h3 className="font-display text-[17px] mt-0.5 text-slate-900">
                Last {visibleLogs.length} workouts
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTypeFilter("all")}
            >
              All <ArrowRight size={13} />
            </Button>
          </div>
          <div className="px-5 py-3 border-b border-slate-100 flex gap-2 overflow-x-auto">
            {[["all", "All"], ...workoutTypes].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                className={`h-8 px-3 rounded-full text-[12px] font-medium whitespace-nowrap transition ${
                  typeFilter === value
                    ? "bg-slate-900 text-white"
                    : "bg-white ring-1 ring-slate-200 text-slate-600 hover:border-brand-300 hover:ring-brand-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <ul className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {!loading && visibleLogs.length === 0 && (
              <li className="px-5 py-10 text-center">
                <Barbell size={28} className="mx-auto text-slate-300 mb-2" />
                <div className="font-display text-[16px] text-slate-900">
                  {logs.length === 0
                    ? "No workouts yet"
                    : "No workouts match this filter"}
                </div>
                <p className="text-[12px] text-slate-500 mt-1">
                  {logs.length === 0
                    ? "Start a suggested session or log your first workout."
                    : "Try All or choose another workout type."}
                </p>
              </li>
            )}
            {visibleLogs.map((w) => {
              const Icon = typeIcon[w.workoutType] ?? Barbell;
              const tone = typeTone[w.workoutType] ?? "brand";
              const dotBg = {
                brand: "bg-brand-50 text-brand-600 ring-brand-100",
                green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
                amber: "bg-amber-50 text-amber-600 ring-amber-100",
              }[tone];
              const isActive = activeLog?.id === w.id;
              return (
                <li
                  key={w.id}
                  onClick={() => setActiveLog(w)}
                  className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition ${isActive ? "bg-brand-50" : "hover:bg-slate-50"}`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg ring-1 grid place-items-center shrink-0 ${dotBg}`}
                  >
                    <Icon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-[13.5px] font-medium truncate ${isActive ? "text-brand-700" : "text-slate-900"}`}
                    >
                      {w.title}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {formatDate(w.createdAt)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-[13px] text-slate-900 tabular-nums">
                      {w.durationMinutes}m
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {w.caloriesBurned ?? 0} kcal
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="lg:col-span-7 p-6">
          {!activeLog && (
            <div className="h-full min-h-[320px] grid place-items-center text-center">
              <div>
                <Timer size={30} className="mx-auto text-slate-300 mb-2" />
                <div className="font-display text-[18px] text-slate-900">
                  Pick a workout
                </div>
                <p className="text-[13px] text-slate-500 mt-1">
                  Workout details will show here once you have a session.
                </p>
              </div>
            </div>
          )}
          {activeLog &&
            (() => {
              const Icon = typeIcon[activeLog.workoutType] ?? Barbell;
              const tone = typeTone[activeLog.workoutType] ?? "brand";
              const dotBg = {
                brand: "bg-brand-50 text-brand-600",
                green: "bg-emerald-50 text-emerald-600",
                amber: "bg-amber-50 text-amber-600",
              }[tone];
              return (
                <>
                  <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl ${dotBg} grid place-items-center`}
                      >
                        <Icon size={20} />
                      </div>
                      <div>
                        <h2 className="font-display text-[22px] leading-tight text-slate-900">
                          {activeLog.title}
                        </h2>
                        <div className="text-[12px] text-slate-500 mt-0.5">
                          {formatDate(activeLog.createdAt)}
                        </div>
                      </div>
                    </div>
                    <Pill tone={tone} className="!normal-case !tracking-normal">
                      {typeLabel[activeLog.workoutType]}
                    </Pill>
                  </div>

                  <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                      {
                        label: "Duration",
                        value: `${activeLog.durationMinutes} min`,
                        icon: Timer,
                      },
                      {
                        label: "Calories",
                        value: `${activeLog.caloriesBurned ?? 0} kcal`,
                        icon: Fire,
                      },
                      {
                        label: "Distance",
                        value: activeLog.distanceKm
                          ? `${activeLog.distanceKm} km`
                          : "—",
                        icon: Footprints,
                      },
                      {
                        label: "Intensity",
                        value: activeLog.intensity ?? "—",
                        icon: Lightning,
                      },
                      {
                        label: "Session",
                        value: activeLog.notes?.sessionTime ?? "—",
                        icon: Heart,
                      },
                    ].map((s) => {
                      const SIcon = s.icon;
                      return (
                        <div
                          key={s.label}
                          className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3 text-center"
                        >
                          <SIcon
                            size={14}
                            className="text-slate-400 mx-auto mb-1"
                          />
                          <div className="font-display text-[17px] text-slate-900 capitalize">
                            {s.value}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
                            {s.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {Array.isArray(activeLog.notes?.exercises) &&
                    activeLog.notes.exercises.length > 0 && (
                      <div className="mb-5 rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                            Session exercises
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {activeLog.notes.exercises.reduce(
                              (sum, item) => sum + (Number(item.minutes) || 0),
                              0,
                            )}{" "}
                            min total
                          </span>
                        </div>
                        <div className="space-y-2">
                          {activeLog.notes.exercises.map((exercise, index) => (
                            <div
                              key={`${exercise.name}-${index}`}
                              className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center rounded-lg bg-white ring-1 ring-slate-200 px-3 py-2"
                            >
                              <div className="lg:col-span-6 text-[13px] font-medium text-slate-900">
                                {exercise.name || "Exercise"}
                              </div>
                              <div className="lg:col-span-2 text-left sm:text-right font-mono text-[12px] text-slate-600">
                                {Number(exercise.minutes) || 0}m
                              </div>
                              <div className="lg:col-span-2 text-left sm:text-right text-[12px] text-slate-500">
                                {exercise.sets ? `${exercise.sets} sets` : "—"}
                              </div>
                              <div className="lg:col-span-2 text-left sm:text-right text-[12px] text-slate-500">
                                {exercise.reps ? `${exercise.reps} reps` : "—"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {activeLog.intensity && (
                    <div className="mb-5">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                          Intensity
                        </span>
                        <span className="text-[11px] text-slate-500 capitalize">
                          {activeLog.intensity}
                        </span>
                      </div>
                      <Bar
                        value={intensityPct[activeLog.intensity] ?? 33}
                        tone={tone}
                      />
                    </div>
                  )}

                  {activeLog.notes?.feel && (
                    <div className="mb-5 rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                        How it felt
                      </div>
                      <p className="text-[14px] text-slate-700 leading-snug">
                        {activeLog.notes.feel}
                      </p>
                    </div>
                  )}

                  {activeLog.aiAnalysis?.feedback && (
                    <div className="rounded-xl bg-brand-50 ring-1 ring-brand-100 p-4 flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-600 grid place-items-center text-white shrink-0">
                        <Sparkle size={14} />
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-brand-700 font-semibold mb-1">
                          AI overview
                        </div>
                        <p className="text-[13.5px] text-slate-700 leading-snug">
                          {activeLog.aiAnalysis.feedback}
                        </p>
                        {[
                          activeLog.aiAnalysis.recoveryTip,
                          activeLog.aiAnalysis.nextSessionFocus,
                          activeLog.aiAnalysis.riskNote,
                        ]
                          .filter(Boolean)
                          .map((item, index) => (
                            <p
                              key={index}
                              className="text-[12.5px] text-slate-600 leading-snug mt-2"
                            >
                              {item}
                            </p>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
        </Card>
      </div>
    </div>
  );
}
