import { SAFETY_GUARD_PROMPT } from "./safety-guard.js";

export const buildDiaryReflectionPrompt = ({
  profile,
  entry,
  mood,
  energy,
  stress,
  todayWaterCups,
  waterTargetCups,
}) => {
  const profileSummary = {
    healthGoal: profile?.healthGoal,
    dietRestrictions: profile?.dietRestrictions ?? [],
    allergies: profile?.allergies ?? [],
    healthContext: profile?.healthContext ?? null,
  };

  return `Generate a short personalized wellness reflection for a user's diary entry.

${SAFETY_GUARD_PROMPT}

Profile:
${JSON.stringify(profileSummary, null, 2)}

Entry:
"${entry}"

Mood: ${mood}
Energy: ${energy}/5
Stress: ${stress}/5
Water today: ${todayWaterCups}/${waterTargetCups} cups

Return JSON only with this exact shape:
{
  "reflection": "string (2-4 sentences, warm and specific to the entry, mention concrete next steps)"
}`;
};
