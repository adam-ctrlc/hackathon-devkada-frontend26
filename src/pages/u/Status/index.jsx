import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Input, Field } from "../../../components/ui/Input.jsx";
import {
  Check,
  CheckCircle,
  X,
  Sparkle,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { apiRequest } from "../../../lib/api.js";
import { runGeminiLiveJson } from "../../../lib/gemini-live.js";
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
} from "../../../lib/auth-session.js";
import {
  STATUS_OPTIONS,
  getStatusBlockReason,
  getStatusOptionsForProfile,
  statusToOptionId,
} from "../../../data/status-options.jsx";
import { StatusSkeleton } from "../components/RouteSkeletons.jsx";
import { usePageTitle } from "../../../hooks/usePageTitle.js";

const buildRefinePrompt = ({ notes, customRestriction, profile }) => {
  const ctx = {
    age: profile.age ?? null,
    sex: profile.sex ?? null,
    healthGoal: profile.healthGoal ?? null,
    healthStatus: profile.healthContext?.status ?? null,
    allergies: profile.allergies ?? [],
    dietRestrictions: profile.dietRestrictions ?? [],
    foodPreferences: profile.foodPreferences ?? [],
  };

  return `You are a health profile assistant. The user has entered free-text health notes and a custom restriction.
Your job is to:
1. Fix grammar and spelling
2. Rewrite each field as a clear, specific, first-person sentence that a medical AI can act on
3. Use the user's profile context below to add specificity — for example, if they mention an allergy, name the specific ingredient class; if they mention a restriction, include any relevant timeframe or severity if implied
4. Keep it concise (1–3 sentences per field max)
5. Do NOT add information not implied by the user's input — only clarify and correct

User profile context:
${JSON.stringify(ctx, null, 2)}

Raw personal notes: ${notes ? `"${notes}"` : "(empty — return empty string)"}
Raw custom restriction: ${customRestriction ? `"${customRestriction}"` : "(empty — return empty string)"}

Return JSON only:
{
  "notes": "<refined notes or empty string>",
  "customRestriction": "<refined restriction or empty string>"
}`;
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Status() {
  usePageTitle("Health Status");
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => getAuthSession()?.profile ?? {});
  const [profileId] = useState(() => getAuthSession()?.profile?.id ?? "");
  const [selected, setSelected] = useState("none");
  const [notes, setNotes] = useState("");
  const [customRestriction, setCustom] = useState("");
  const [savedStatus, setSavedStatus] = useState("none");
  const [savedNotes, setSavedNotes] = useState("");
  const [savedCustomRestriction, setSavedCustomRestriction] = useState("");
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [refining, setRefining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    let cancelled = false;
    const session = getAuthSession();
    const id = session?.profile?.id;

    if (!id) {
      navigate("/", { replace: true });
      return;
    }

    const loadStatus = async () => {
      setLoading(true);
      try {
        const data = await apiRequest(`/profiles/${id}`);
        if (cancelled) return;
        setProfile(data.profile ?? {});
        const context = data.profile?.healthContext ?? {};
        const loadedOptionId = statusToOptionId(context.status);
        const optionId = getStatusBlockReason(loadedOptionId, data.profile)
          ? "none"
          : loadedOptionId;
        setSelected(optionId);
        setSavedStatus(optionId);
        setNotes(context.notes ?? "");
        setCustom(context.customRestriction ?? "");
        setSavedNotes(context.notes ?? "");
        setSavedCustomRestriction(context.customRestriction ?? "");
        setDirty(false);
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

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const current =
    STATUS_OPTIONS.find((s) => s.id === selected) ?? STATUS_OPTIONS[0];
  const saved = STATUS_OPTIONS.find((s) => s.id === savedStatus);
  const visibleStatusOptions = getStatusOptionsForProfile(profile);

  const pick = (id) => {
    const blockReason = getStatusBlockReason(id, profile);
    if (blockReason) {
      showToast(blockReason);
      return;
    }

    setSelected(id);
    setDirty(true);
  };

  const save = async () => {
    const option = STATUS_OPTIONS.find((item) => item.id === selected);
    const blockReason = getStatusBlockReason(option?.id, profile);
    if (blockReason) {
      showToast(blockReason);
      return;
    }

    let finalNotes = notes;
    let finalRestriction = customRestriction;

    if (notes.trim() || customRestriction.trim()) {
      setRefining(true);
      showToast("Refining your notes with AI…");
      try {
        const refined = await runGeminiLiveJson({
          prompt: buildRefinePrompt({ notes, customRestriction, profile }),
          temperature: 0.2,
          timeoutMs: 60000,
        });
        if (refined?.notes !== undefined) {
          finalNotes = String(refined.notes ?? "").trim() || notes;
          setNotes(finalNotes);
        }
        if (refined?.customRestriction !== undefined) {
          finalRestriction =
            String(refined.customRestriction ?? "").trim() || customRestriction;
          setCustom(finalRestriction);
        }
      } catch {
        // AI refinement failed — save raw input as fallback
      } finally {
        setRefining(false);
      }
    }

    setSaving(true);
    try {
      const data = await apiRequest("/health-context", {
        method: "POST",
        body: {
          profileId,
          status: option?.label ?? selected,
          notes: finalNotes,
          customRestriction: finalRestriction,
        },
      });
      const session = getAuthSession();
      if (session) {
        setAuthSession({
          ...session,
          profile: {
            ...session.profile,
            healthContext: data.healthContext,
          },
        });
      }
      setSavedStatus(selected);
      setSavedNotes(finalNotes);
      setSavedCustomRestriction(finalRestriction);
      setDirty(false);
      showToast("Health status saved — AI refined your notes");
    } catch (err) {
      showToast(err.message);
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setSelected(savedStatus);
    setNotes(savedNotes);
    setCustom(savedCustomRestriction);
    setDirty(false);
  };

  const Icon = current.icon;

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1180px]">
        <StatusSkeleton />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1180px] relative">
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
            Health Status
          </div>
          <h1 className="font-display text-[34px] leading-[1.05] tracking-tight text-slate-900">
            Your current health mode
          </h1>
          <p className="text-slate-600 mt-2 max-w-[560px]">
            This changes how KainWise scores your food, what swaps it suggests,
            and how the AI gives guidance.
          </p>
        </div>
        <div className="flex gap-2">
          {dirty && !refining && !saving && (
            <Button variant="ghost" size="sm" onClick={discard}>
              <X size={13} /> Discard
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={save}
            disabled={!dirty || refining || saving}
          >
            {refining ? (
              <>
                <ArrowsClockwise size={13} className="animate-spin" /> Refining…
              </>
            ) : saving ? (
              <>
                <ArrowsClockwise size={13} className="animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Check size={14} /> Save status
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Status grid */}
        <div className="lg:col-span-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {visibleStatusOptions.map((s) => {
              const isActive = selected === s.id;
              const isSaved = savedStatus === s.id;
              const blockReason = getStatusBlockReason(s.id, profile);
              const isBlocked = Boolean(blockReason);
              return (
                <button
                  key={s.id}
                  onClick={() => pick(s.id)}
                  disabled={isBlocked}
                  title={blockReason || s.description}
                  className={`flex items-center gap-3 h-14 px-4 rounded-xl text-left text-[13.5px] font-medium ring-1 transition relative
                    ${
                      isActive
                        ? "bg-brand-600 text-white ring-brand-600 shadow-sm"
                        : isBlocked
                          ? "bg-slate-50 text-slate-400 ring-slate-200 cursor-not-allowed opacity-70"
                          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                    }`}
                >
                  <s.icon
                    size={16}
                    className={
                      isActive
                        ? "text-white shrink-0"
                        : isBlocked
                          ? "text-slate-300 shrink-0"
                          : "text-slate-400 shrink-0"
                    }
                  />
                  <span className="leading-tight truncate">
                    {s.label}
                    {isBlocked && (
                      <span className="block text-[10px] font-normal text-slate-400">
                        Not applicable
                      </span>
                    )}
                  </span>
                  {isSaved && !isActive && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Notes */}
          <Card className="p-5 space-y-4">
            <Field label="Personal notes (visible to AI only)">
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setDirty(true);
                }}
                rows={3}
                disabled={refining}
                placeholder="e.g. i am allergy to milk, day 12 of recovery"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-[14px] resize-none disabled:opacity-60 disabled:cursor-wait"
              />
              <div className="mt-1.5 flex flex-col gap-1">
                {notes.trim() && (
                  <p className="text-[11px] text-brand-600 flex items-center gap-1 font-medium">
                    <Sparkle size={10} weight="fill" />
                    AI will fix grammar and personalize this using your profile
                    before saving
                  </p>
                )}
                <p className="text-[11px] text-slate-500">
                  Used to personalize AI food guidance and diary reflections.
                </p>
              </div>
            </Field>
            <Field label="Custom restriction or doctor's note">
              <Input
                value={customRestriction}
                onChange={(e) => {
                  setCustom(e.target.value);
                  setDirty(true);
                }}
                disabled={refining}
                placeholder="e.g. Avoid raw vegetables until May 20"
                className="disabled:opacity-60 disabled:cursor-wait"
              />
              <div className="mt-1.5 flex flex-col gap-1">
                {customRestriction.trim() && (
                  <p className="text-[11px] text-brand-600 flex items-center gap-1 font-medium">
                    <Sparkle size={10} weight="fill" />
                    AI will rewrite this as a clear, specific restriction before
                    saving
                  </p>
                )}
                <p className="text-[11px] text-slate-500">
                  Private. Only used to flag incompatible foods.
                </p>
              </div>
            </Field>
          </Card>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-4 space-y-5">
          {/* Live preview */}
          <Card className="p-5 !bg-brand-50 !border-brand-100">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-brand-700 font-semibold mb-3">
              <Icon size={12} /> Active mode
            </div>
            <div className="font-display text-[18px] leading-tight text-slate-900 mb-1">
              {current.label}
            </div>
            <div className="text-[12px] text-slate-600 mb-4 leading-snug">
              {current.description}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-brand-700 font-semibold mb-2">
              What this changes
            </div>
            <ul className="space-y-1.5">
              {current.changes.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[13px] text-slate-700"
                >
                  <Check
                    size={12}
                    className="text-emerald-500 shrink-0 mt-0.5"
                  />{" "}
                  {c}
                </li>
              ))}
            </ul>
            {dirty && selected !== savedStatus && (
              <div className="mt-4 pt-4 border-t border-brand-100 text-[11px] text-brand-700 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                Unsaved — was "{saved?.label}"
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
              Disclaimer
            </div>
            <p className="text-[12px] text-slate-600 leading-relaxed">
              KainWise is not a medical tool. Always follow the specific
              guidance from your doctor or licensed dietitian, especially during
              recovery, pregnancy, or for serious conditions.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
