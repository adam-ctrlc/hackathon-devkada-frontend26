import { SAFETY_GUARD_PROMPT } from "./safety-guard.js";

const truncateText = (value, max = 500) =>
  String(value ?? "")
    .trim()
    .slice(0, max);

const compactContext = (context = {}) => ({
  periodDays: context?.periodDays ?? null,
  food: {
    entries: context?.food?.entries ?? 0,
    lowSupportEntries: context?.food?.lowSupportEntries ?? 0,
    lowSupportRatio: context?.food?.lowSupportRatio ?? 0,
    highSodiumEntries: context?.food?.highSodiumEntries ?? 0,
    highSugarEntries: context?.food?.highSugarEntries ?? 0,
  },
  hydration: {
    avgDailyMl: context?.hydration?.avgDailyMl ?? 0,
    targetMl: context?.hydration?.targetMl ?? 0,
    ratio: context?.hydration?.ratio ?? 0,
    level: context?.hydration?.level ?? "unknown",
  },
  sleep: {
    entries: context?.sleep?.entries ?? 0,
    avgHours: context?.sleep?.avgHours ?? 0,
    todayHours: context?.sleep?.todayHours ?? 0,
    shortSleepDays: context?.sleep?.shortSleepDays ?? 0,
    level: context?.sleep?.level ?? "unknown",
  },
  workout: {
    sessions14d: context?.workout?.sessions14d ?? 0,
    activeDays14d: context?.workout?.activeDays14d ?? 0,
    minutes14d: context?.workout?.minutes14d ?? 0,
  },
  diary: {
    entries14d: context?.diary?.entries14d ?? 0,
    avgEnergy: context?.diary?.avgEnergy ?? 0,
    avgStress: context?.diary?.avgStress ?? 0,
    lowEnergyDays: context?.diary?.lowEnergyDays ?? 0,
    highStressDays: context?.diary?.highStressDays ?? 0,
    shortSleepDays: context?.diary?.shortSleepDays ?? 0,
  },
  summary: context?.summary ?? null,
  motivationText: truncateText(context?.motivationText, 240),
});

export const buildScannerInsightsPrompt = ({
  result,
  context,
  checkIn,
  profile,
}) => {
  return `You are KainWise, generating scanner follow-up coaching text.

${SAFETY_GUARD_PROMPT}

Generate ONLY valid JSON with this exact shape:
{
  "patternNotice": {
    "title": "Pattern notice or Pattern alert",
    "trendLine": "string",
    "hydrationLine": "string",
    "suggestions": ["string"],
    "tone": "green" | "amber" | "red"
  },
  "mentalSupport": {
    "title": "Mind & energy impact",
    "summary": "string",
    "confidence": "low" | "medium" | "high",
    "tone": "green" | "amber" | "red",
    "contributors": ["string"],
    "actions": ["string"],
    "motivation": "string"
  }
}

Input data:
${JSON.stringify(
  {
    currentScan: {
      name: result?.name ?? null,
      supportLevel: result?.supportLevel ?? null,
      score: result?.score ?? null,
      calories: result?.calories ?? null,
      sodiumMg: result?.sodiumMg ?? null,
      sugarGrams: result?.sugarGrams ?? null,
      fatGrams: result?.fatGrams ?? null,
      proteinGrams: result?.proteinGrams ?? null,
      fiberGrams: result?.fiberGrams ?? null,
      allergens: result?.allergens ?? [],
      flags: result?.flags ?? [],
    },
    trendContext: compactContext(context),
    latestCheckIn: checkIn ?? null,
    profile: {
      healthGoal: profile?.healthGoal ?? null,
      healthStatus: profile?.healthContext?.status ?? null,
      restrictions: profile?.dietRestrictions ?? [],
      allergies: profile?.allergies ?? [],
    },
  },
  null,
  2,
)}

Writing rules:
- Use non-diagnostic language only. Do not claim or diagnose mental illness.
- Use practical, concrete suggestions with specific examples (food, water timing, movement, routine).
- Keep each bullet short and readable for mobile.
- Pattern notice should summarize trend and hydration clearly.
- Mind & energy impact should connect current scan + trend data.
- Suggestions and actions should avoid medical claims and avoid fear-based language.
- If data is sparse, set confidence to "low" and use cautious phrasing.
- Return JSON only. No markdown, no extra keys, no prose outside JSON.`;
};
