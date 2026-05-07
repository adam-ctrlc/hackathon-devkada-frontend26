import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import {
  Check,
  CheckCircle,
  CurrencyCircleDollar,
  User,
  Scales,
  Heart,
  Sparkle,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input, Field } from "../components/ui/Input.jsx";
import { Select } from "../components/Select.jsx";
import { BrandName } from "../components/BrandName.jsx";
import { AppFooter } from "../components/AppFooter.jsx";
import { apiRequest, formatApiError } from "../lib/api.js";
import { runGeminiLiveJson } from "../lib/gemini-live.js";
import { getAuthSession, setAuthSession } from "../lib/auth-session.js";
import {
  ACTIVITY_LEVELS,
  CURRENCIES,
  DIET_PATTERNS,
  HEALTH_GOALS,
  emptyProfileForm,
} from "../utils/profile.js";
import { TagSelect } from "./u/Profile/components/TagSelect.jsx";

const ALLERGY_OPTIONS = [
  "Nuts",
  "Peanuts",
  "Tree nuts",
  "Dairy",
  "Milk",
  "Eggs",
  "Fish",
  "Shellfish",
  "Shrimp",
  "Wheat",
  "Gluten",
  "Soy",
  "Sesame",
  "Mustard",
  "Sulphites",
];

const RESTRICTION_OPTIONS = [
  "Low sugar",
  "Low sodium",
  "Low fat",
  "Low carb",
  "Gluten-free",
  "Dairy-free",
  "Vegan",
  "Vegetarian",
  "Keto",
  "Paleo",
  "Halal",
  "Kosher",
  "Diabetic-friendly",
  "Lactose-free",
  "No pork",
];

const PREFERENCE_OPTIONS = [
  "Salads",
  "Eggs",
  "Oats",
  "Rice",
  "Chicken",
  "Fish",
  "Fruits",
  "Vegetables",
  "Whole grains",
  "Legumes",
  "Soup",
  "Grilled foods",
  "Smoothies",
  "Nuts",
  "Yogurt",
];

const tagItem = z
  .string()
  .min(1, "Item cannot be empty")
  .max(60, "Too long")
  .trim();
const tagsSchema = z.object({
  allergies: z.array(tagItem).max(15),
  dietRestrictions: z.array(tagItem).max(15),
  foodPreferences: z.array(tagItem).max(20),
});

const numField = (label, min, max) =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z
      .number({
        required_error: `${label} is required`,
        invalid_type_error: `${label} is required`,
      })
      .min(min, `${label} must be at least ${min}`)
      .max(max, `${label} must be at most ${max}`),
  );

const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(80),
  lastName: z.string().min(1, "Last name is required").max(80),
  age: numField("Age", 1, 120),
  heightCm: numField("Height", 50, 300),
  weightKg: numField("Weight", 10, 400),
  activityLevel: z.string().min(1, "Activity level is required"),
  dietPattern: z.string().min(1, "Diet pattern is required"),
  healthGoal: z.string().min(1, "Health goal is required"),
  budgetAmount: numField("Budget amount", 1, 10_000_000),
});

const buildTagValidationPrompt = ({
  allergies,
  dietRestrictions,
  foodPreferences,
}) =>
  `You are a food and health data validator. Check each item in the arrays below.

Rules:
- allergies: must be real food allergens (e.g. nuts, dairy, shellfish). Reject random words or non-food items.
- dietRestrictions: must be real dietary restrictions (e.g. low sugar, gluten-free, vegan). Reject nonsense.
- foodPreferences: must be real food items, ingredients, or food categories (e.g. salads, oats, chicken). Reject non-food items.

For VALID items: return a "refined" name (fix spelling/casing, e.g. "tomatos" → "Tomatoes", "EGGS" → "Eggs").
For INVALID items: mark as invalid and give a short reason.

Input:
${JSON.stringify({ allergies, dietRestrictions, foodPreferences }, null, 2)}

Return JSON only:
{
  "allergies": [{ "original": "...", "refined": "...", "valid": true }],
  "dietRestrictions": [{ "original": "...", "refined": "...", "valid": true }],
  "foodPreferences": [{ "original": "...", "refined": "...", "valid": true, "reason": "" }]
}`;

export function RegisterProfileStep({
  profileId,
  firstName,
  lastName,
  email,
  onSaved,
  onSkip,
}) {
  const [form, setFormState] = useState({
    ...emptyProfileForm,
    firstName: firstName ?? "",
    lastName: lastName ?? "",
    email: email ?? "",
  });
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const set = (key, val) => setFormState((f) => ({ ...f, [key]: val }));

  const bmiRaw =
    form.heightCm && form.weightKg
      ? (form.weightKg / (form.heightCm / 100) ** 2).toFixed(1)
      : "";
  const bmiNum = Number(bmiRaw);
  const bmiLabel = bmiRaw
    ? bmiNum < 18.5
      ? "Underweight"
      : bmiNum < 25
        ? "Healthy"
        : bmiNum < 30
          ? "Overweight"
          : "Obese"
    : "—";
  const bmiColor = bmiRaw
    ? bmiNum < 18.5
      ? "text-amber-600"
      : bmiNum < 25
        ? "text-emerald-600"
        : "text-red-600"
    : "text-slate-400";

  const initials = `${(form.firstName[0] ?? "").toUpperCase()}${(form.lastName[0] ?? "").toUpperCase()}`;
  const calorieTarget = 0;
  const proteinG = Math.max(1, Math.round((Number(form.weightKg) || 60) * 1.2));

  const saveProfile = async () => {
    // Validate all required form fields
    const formResult = profileFormSchema.safeParse(form);
    const tagsResult = tagsSchema.safeParse({
      allergies: form.allergies,
      dietRestrictions: form.dietRestrictions,
      foodPreferences: form.foodPreferences,
    });

    if (!formResult.success || !tagsResult.success) {
      const errs = {};
      for (const issue of formResult.success ? [] : formResult.error.issues) {
        const field = issue.path[0];
        if (field && !errs[field]) errs[field] = issue.message;
      }
      for (const issue of tagsResult.success ? [] : tagsResult.error.issues) {
        const field = issue.path[0];
        if (field && !errs[field]) errs[field] = issue.message;
      }
      setFieldErrors(errs);
      showToast("Please fill in all required fields");
      return;
    }
    setFieldErrors({});

    const hasTagItems =
      form.allergies.length > 0 ||
      form.dietRestrictions.length > 0 ||
      form.foodPreferences.length > 0;

    let finalAllergies = form.allergies;
    let finalRestrictions = form.dietRestrictions;
    let finalPreferences = form.foodPreferences;

    if (hasTagItems) {
      setValidating(true);
      showToast("AI is validating your entries…");
      try {
        const result = await runGeminiLiveJson({
          prompt: buildTagValidationPrompt({
            allergies: form.allergies,
            dietRestrictions: form.dietRestrictions,
            foodPreferences: form.foodPreferences,
          }),
          temperature: 0.1,
          timeoutMs: 60000,
        });

        const errs = {};
        const processField = (key, items) => {
          if (!Array.isArray(items)) return null;
          const invalid = items.filter((i) => !i.valid);
          if (invalid.length > 0) {
            errs[key] =
              `Not recognized: ${invalid.map((i) => `"${i.original}"${i.reason ? ` (${i.reason})` : ""}`).join(", ")}`;
          }
          return items
            .filter((i) => i.valid)
            .map((i) => String(i.refined || i.original).trim())
            .filter(Boolean);
        };

        const refinedAllergies = processField("allergies", result?.allergies);
        const refinedRestrictions = processField(
          "dietRestrictions",
          result?.dietRestrictions,
        );
        const refinedPreferences = processField(
          "foodPreferences",
          result?.foodPreferences,
        );

        if (Object.keys(errs).length > 0) {
          setFieldErrors(errs);
          setValidating(false);
          showToast("Some entries were rejected — see errors below");
          return;
        }

        if (refinedAllergies) {
          finalAllergies = refinedAllergies;
          set("allergies", refinedAllergies);
        }
        if (refinedRestrictions) {
          finalRestrictions = refinedRestrictions;
          set("dietRestrictions", refinedRestrictions);
        }
        if (refinedPreferences) {
          finalPreferences = refinedPreferences;
          set("foodPreferences", refinedPreferences);
        }
      } catch {
        // AI failed — proceed with raw values
      } finally {
        setValidating(false);
      }
    }

    setSaving(true);
    try {
      const data = await apiRequest(`/profiles/${profileId}`, {
        method: "PATCH",
        body: {
          firstName: form.firstName,
          middleName: form.middleName,
          lastName: form.lastName,
          email: form.email,
          age: form.age === "" ? undefined : Number(form.age),
          sex: form.sex,
          heightCm: form.heightCm === "" ? undefined : Number(form.heightCm),
          weightKg: form.weightKg === "" ? undefined : Number(form.weightKg),
          activityLevel: form.activityLevel,
          healthGoal: form.healthGoal,
          allergies: finalAllergies,
          foodPreferences: finalPreferences,
          dietRestrictions: finalRestrictions,
          budgetAmount:
            form.budgetAmount === "" ? undefined : Number(form.budgetAmount),
          budgetCurrency: form.budgetCurrency,
          budgetFrequency: form.budgetFrequency,
        },
      });
      const session = getAuthSession();
      if (session) {
        setAuthSession({
          ...session,
          profile: { ...session.profile, ...data.profile },
        });
      }
      onSaved();
    } catch (err) {
      showToast(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Minimal nav header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-10 h-14 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="KainWise"
              className="w-7 h-7 rounded-lg object-cover"
            />
            <BrandName className="text-[17px] text-slate-900" />
          </Link>
          <div className="text-[12px] text-slate-400 font-medium">
            Step 2 of 2 — Health profile
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1180px] mx-auto w-full relative">
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-400" /> {toast}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
          <div>
            <div className="text-[11px] tracking-[0.18em] uppercase text-brand-600 font-semibold mb-2">
              Personal Health Profile
            </div>
            <h1 className="font-display text-[34px] leading-[1.05] tracking-tight text-slate-900">
              About your body
            </h1>
            <p className="text-slate-600 mt-2 max-w-[560px]">
              The more we know, the more personalized the AI guidance becomes.
              Everything stays on your device.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              disabled={saving || validating}
            >
              Skip for now
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={saveProfile}
              disabled={validating || saving}
            >
              {validating ? (
                <>
                  <ArrowsClockwise size={13} className="animate-spin" />{" "}
                  Validating…
                </>
              ) : saving ? (
                <>
                  <ArrowsClockwise size={13} className="animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Check size={14} /> Save &amp; continue
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left sidebar */}
          <div className="lg:col-span-4 space-y-5">
            {/* Stats card */}
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-100 grid place-items-center font-display text-[20px] text-brand-700 shrink-0">
                  {initials || <User size={22} className="text-brand-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[17px] leading-tight text-slate-900 truncate">
                    {[
                      form.firstName,
                      form.middleName ? form.middleName[0] + "." : "",
                      form.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ") || "Your name"}
                  </div>
                  <div className="text-[12px] text-slate-500 mt-0.5">
                    {form.sex === "FEMALE"
                      ? "Female"
                      : form.sex === "MALE"
                        ? "Male"
                        : "—"}
                    {form.age ? ` · ${form.age} yrs` : ""}
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 mb-4" />

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2.5">
                  <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
                    BMI
                  </div>
                  <div className="font-display text-[20px] leading-none text-slate-900">
                    {bmiRaw || "—"}
                  </div>
                  <div className={`text-[10px] font-semibold mt-1 ${bmiColor}`}>
                    {bmiLabel}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2.5">
                  <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
                    kcal/day
                  </div>
                  <div className="font-display text-[20px] leading-none text-slate-900">
                    {calorieTarget.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-medium text-slate-500 mt-1">
                    target
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2.5">
                  <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
                    Protein
                  </div>
                  <div className="font-display text-[20px] leading-none text-slate-900">
                    {proteinG}g
                  </div>
                  <div className="text-[10px] font-medium text-slate-500 mt-1">
                    daily
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Estimates only — consult your doctor for medical advice.
              </p>
            </Card>

            {/* Allergies */}
            <Card className="p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-red-50 grid place-items-center">
                    <Heart size={12} className="text-red-500" />
                  </div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
                    Allergies
                  </span>
                </div>
                {form.allergies.length > 0 && (
                  <span className="text-[10px] text-brand-600 flex items-center gap-1 font-medium">
                    <Sparkle size={9} weight="fill" /> AI validates on save
                  </span>
                )}
              </div>
              <TagSelect
                tags={form.allergies}
                onAdd={(t) => {
                  set("allergies", [...form.allergies, t]);
                  setFieldErrors((e) => ({ ...e, allergies: null }));
                }}
                onRemove={(t) =>
                  set(
                    "allergies",
                    form.allergies.filter((a) => a !== t),
                  )
                }
                options={ALLERGY_OPTIONS}
                placeholder="Select an allergy…"
                colorClass="bg-red-50 text-red-700 ring-red-100"
                error={fieldErrors.allergies}
                disabled={validating}
              />
            </Card>

            {/* Diet restrictions */}
            <Card className="p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-50 grid place-items-center">
                    <Scales size={12} className="text-amber-500" />
                  </div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
                    Diet restrictions
                  </span>
                </div>
                {form.dietRestrictions.length > 0 && (
                  <span className="text-[10px] text-brand-600 flex items-center gap-1 font-medium">
                    <Sparkle size={9} weight="fill" /> AI validates on save
                  </span>
                )}
              </div>
              <TagSelect
                tags={form.dietRestrictions}
                onAdd={(t) => {
                  set("dietRestrictions", [...form.dietRestrictions, t]);
                  setFieldErrors((e) => ({ ...e, dietRestrictions: null }));
                }}
                onRemove={(t) =>
                  set(
                    "dietRestrictions",
                    form.dietRestrictions.filter((r) => r !== t),
                  )
                }
                options={RESTRICTION_OPTIONS}
                placeholder="Select a restriction…"
                colorClass="bg-amber-50 text-amber-800 ring-amber-100"
                error={fieldErrors.dietRestrictions}
                disabled={validating}
              />
            </Card>

            {/* Budget */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 grid place-items-center">
                  <CurrencyCircleDollar
                    size={12}
                    className="text-emerald-600"
                  />
                </div>
                <span className="text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
                  Food budget
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <Field label="Amount *" error={fieldErrors.budgetAmount}>
                  <Input
                    type="number"
                    min="1"
                    value={form.budgetAmount}
                    onChange={(e) => {
                      set("budgetAmount", e.target.value);
                      setFieldErrors((f) => ({ ...f, budgetAmount: null }));
                    }}
                    placeholder="e.g. 3000"
                  />
                </Field>
                <Field label="Currency">
                  <Select
                    value={form.budgetCurrency}
                    onChange={(e) => set("budgetCurrency", e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Frequency">
                <Select
                  value={form.budgetFrequency}
                  onChange={(e) => set("budgetFrequency", e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </Select>
              </Field>
            </Card>
          </div>

          {/* Main form */}
          <Card className="lg:col-span-8 p-6">
            {/* Personal info */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-brand-50 grid place-items-center">
                <User size={14} className="text-brand-600" />
              </div>
              <span className="font-semibold text-[13px] text-slate-800">
                Personal information
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Field label="First name *" error={fieldErrors.firstName}>
                <Input
                  value={form.firstName}
                  onChange={(e) => {
                    set("firstName", e.target.value);
                    setFieldErrors((f) => ({ ...f, firstName: null }));
                  }}
                />
              </Field>
              <Field label="Middle name">
                <Input
                  value={form.middleName}
                  onChange={(e) => set("middleName", e.target.value)}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Last name *" error={fieldErrors.lastName}>
                <Input
                  value={form.lastName}
                  onChange={(e) => {
                    set("lastName", e.target.value);
                    setFieldErrors((f) => ({ ...f, lastName: null }));
                  }}
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </Field>
              <Field label="Age *" error={fieldErrors.age}>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={form.age}
                  onChange={(e) => {
                    set("age", parseInt(e.target.value) || "");
                    setFieldErrors((f) => ({ ...f, age: null }));
                  }}
                />
              </Field>
              <Field label="Sex">
                <Select
                  value={form.sex}
                  onChange={(e) => set("sex", e.target.value)}
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Prefer not to say</option>
                </Select>
              </Field>
            </div>

            {/* Body metrics */}
            <div className="h-px bg-slate-100 my-6" />
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-amber-50 grid place-items-center">
                <Scales size={14} className="text-amber-500" />
              </div>
              <span className="font-semibold text-[13px] text-slate-800">
                Body metrics
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <Field label="Height *" hint="cm" error={fieldErrors.heightCm}>
                <Input
                  type="number"
                  min="50"
                  max="300"
                  value={form.heightCm}
                  onChange={(e) => {
                    set("heightCm", parseInt(e.target.value) || "");
                    setFieldErrors((f) => ({ ...f, heightCm: null }));
                  }}
                />
              </Field>
              <Field label="Weight *" hint="kg" error={fieldErrors.weightKg}>
                <Input
                  type="number"
                  min="10"
                  max="400"
                  step="0.1"
                  value={form.weightKg}
                  onChange={(e) => {
                    set("weightKg", parseFloat(e.target.value) || "");
                    setFieldErrors((f) => ({ ...f, weightKg: null }));
                  }}
                />
              </Field>
              <Field label="Activity level *" error={fieldErrors.activityLevel}>
                <Select
                  value={form.activityLevel}
                  onChange={(e) => {
                    set("activityLevel", e.target.value);
                    setFieldErrors((f) => ({ ...f, activityLevel: null }));
                  }}
                >
                  <option value="">Select…</option>
                  {ACTIVITY_LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Diet pattern *" error={fieldErrors.dietPattern}>
                <Select
                  value={form.dietPattern}
                  onChange={(e) => {
                    set("dietPattern", e.target.value);
                    setFieldErrors((f) => ({ ...f, dietPattern: null }));
                  }}
                >
                  <option value="">Select…</option>
                  {DIET_PATTERNS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* Health goal */}
            <div className="h-px bg-slate-100 my-6" />
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 grid place-items-center">
                  <Heart size={14} className="text-emerald-600" />
                </div>
                <span className="font-semibold text-[13px] text-slate-800">
                  Health goal *
                </span>
              </div>
              {fieldErrors.healthGoal && (
                <span className="text-[11px] text-red-500">
                  {fieldErrors.healthGoal}
                </span>
              )}
            </div>
            <div
              className={`grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6 ${fieldErrors.healthGoal ? "ring-1 ring-red-200 rounded-xl p-2" : ""}`}
            >
              {HEALTH_GOALS.map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    set("healthGoal", g);
                    setFieldErrors((f) => ({ ...f, healthGoal: null }));
                  }}
                  className={`h-10 px-3 rounded-lg text-[13px] font-medium ring-1 transition
                    ${g === form.healthGoal ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-200 hover:bg-slate-50 text-slate-700"}`}
                >
                  {g === form.healthGoal && (
                    <Check size={12} className="inline mr-1.5 -mt-0.5" />
                  )}
                  {g}
                </button>
              ))}
            </div>

            {/* Food preferences */}
            <div className="h-px bg-slate-100 my-6" />
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-brand-50 grid place-items-center">
                  <Sparkle size={14} className="text-brand-500" weight="fill" />
                </div>
                <span className="font-semibold text-[13px] text-slate-800">
                  Food preferences
                </span>
              </div>
              {form.foodPreferences.length > 0 && (
                <span className="text-[10px] text-brand-600 flex items-center gap-1 font-medium">
                  <Sparkle size={9} weight="fill" /> AI validates on save
                </span>
              )}
            </div>
            <TagSelect
              tags={form.foodPreferences}
              onAdd={(t) => {
                set("foodPreferences", [...form.foodPreferences, t]);
                setFieldErrors((e) => ({ ...e, foodPreferences: null }));
              }}
              onRemove={(t) =>
                set(
                  "foodPreferences",
                  form.foodPreferences.filter((p) => p !== t),
                )
              }
              options={PREFERENCE_OPTIONS}
              placeholder="Select a food preference…"
              colorClass="bg-slate-100 text-slate-700 ring-slate-200"
              error={fieldErrors.foodPreferences}
              disabled={validating}
            />
          </Card>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
