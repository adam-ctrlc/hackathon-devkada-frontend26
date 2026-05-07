import { SAFETY_GUARD_PROMPT } from "./safety-guard.js";

export const buildSwapPrompt = ({ profile, scans }) => {
  const healthContext = profile?.healthContext ?? {};

  const scanList = scans
    .map(
      (s, i) =>
        `${i + 1}. ${s.productName} (score ${s.score ?? "?"}, ${s.supportLevel ?? "Medium"} support, type: ${s.foodType ?? "food"})`,
    )
    .join("\n");

  return `You are KainWise, a food swap assistant. Suggest one next-time swap for each scanned product below.

${SAFETY_GUARD_PROMPT}

These foods were already eaten, so frame every answer as a plan for the next similar meal or purchase, not as a retroactive replacement.

Profile context:
- Health status: ${healthContext.status ?? "general wellness"}
- Notes: ${healthContext.notes ?? healthContext.customRestriction ?? "none"}
- Goal: ${profile?.healthGoal ?? "balanced eating"}

Scanned products (need swaps):
${scanList}

Return a JSON array. Each item must match this shape exactly:
{"from": string, "to": string, "reason": string (1-2 sentences), "delta": [{"k": string (e.g. "sugar","sodium","fiber"), "v": string (e.g. "-30%","+5g"), "tone": "green"|"amber"|"slate"}], "groceries": [string], "supportLevel": "Low"|"Medium"|"High"}

The "from" must match the scanned product name exactly. Output JSON only, no prose.`;
};
