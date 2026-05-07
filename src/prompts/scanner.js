import { SAFETY_GUARD_PROMPT } from "./safety-guard.js";

const buildScannerProfileContext = (profile = {}, targets = {}) => ({
  age: profile.age ?? null,
  sex: profile.sex ?? null,
  heightCm: profile.heightCm ?? null,
  weightKg: profile.weightKg ?? null,
  activityLevel: profile.activityLevel ?? null,
  healthGoal: profile.healthGoal ?? null,
  dietPattern: profile.dietPattern ?? null,
  allergies: profile.allergies ?? [],
  foodPreferences: profile.foodPreferences ?? [],
  dietRestrictions: profile.dietRestrictions ?? [],
  foodBudget: {
    amount: profile.budgetAmount ?? null,
    currency: profile.budgetCurrency ?? profile.incomeCurrency ?? "PHP",
    frequency: profile.budgetFrequency ?? "monthly",
  },
  healthStatus: profile.healthContext?.status ?? null,
  personalNotes: profile.healthContext?.notes ?? null,
  customRestriction: profile.healthContext?.customRestriction ?? null,
  activeTargets: targets,
});

export const buildScannerLivePrompt = ({
  productName,
  barcode,
  productData,
  profile,
  targets,
}) => {
  const foodSection = productData
    ? `OpenFoodFacts product data for "${productData.productName ?? productName}":
${JSON.stringify(productData, null, 2)}

IMPORTANT: Some nutrition fields may be null or missing. For ANY missing/null field, estimate a realistic value per serving based on the product name, brand, food type, and typical values for similar products. Never return 0 unless the nutrient is genuinely absent. Always populate every nutrition field with a non-zero, realistic estimate when actual data is missing, and mention in the summary when values are estimated.`
    : `Food input: ${productName || barcode}

Correct obvious typos or close food/product names before analysis. For example, if the input looks like a misspelled brand or common Filipino food, use the closest likely food name in productName.
Estimate realistic per-serving nutrition values based on the corrected food name. Never return 0 unless the nutrient is genuinely absent.`;

  return `Analyze this food for the KainWise scanner using Gemini Live from the browser.

${SAFETY_GUARD_PROMPT}

${foodSection}

User profile and daily targets:
${JSON.stringify({ profile: buildScannerProfileContext(profile, targets), targets }, null, 2)}

Return JSON only with this exact shape:
{
  "isFood": boolean,
  "rejectionReason": "string or null",
  "productName": "string",
  "correction": {"originalInput": "string", "correctedInput": "string", "confidence": "Low" | "Medium" | "High"},
  "foodType": "string",
  "ingredients": [{"name":"string","note":"string or null","concern":"none|allergen|additive|high-sodium|high-sugar|high-fat|preservative"}],
  "nutrition": {
    "calories": number,
    "sugarGrams": number,
    "sodiumMg": number,
    "fatGrams": number,
    "proteinGrams": number,
    "fiberGrams": number
  },
  "score": number,
  "supportLevel": "High" | "Medium" | "Low",
  "summary": "2-3 specific sentences explaining what the food is, typical ingredients/preparation, and the main nutrition tradeoff for this user",
  "wellnessImpact": "2-3 specific sentences explaining why this score makes sense using concrete nutrients, preparation method, and the user's profile context",
  "flags": [{"tone": "green" | "amber" | "red" | "slate", "label": "string", "detail": "specific sentence with nutrient numbers, ingredient/preparation reason, or profile-specific concern"}],
  "alternatives": ["string"],
  "suggestion": "string"
}

Writing rules:
- If the input is not food, a drink, supplement, ingredient, meal, or edible product, return {"isFood":false,"rejectionReason":"This does not look like food or a drink."} and do not invent nutrition.
- Reject objects like laptop, phone, keyboard, clothes, furniture, tools, vehicles, or unrelated prompts.
- Use healthStatus, personalNotes, customRestriction, allergies, dietRestrictions, and activeTargets when scoring. If personalNotes mention an allergy or sensitivity, flag incompatible foods.
- Use foodBudget when suggesting alternatives. Prefer realistic options for the user's budget currency and frequency.
- For Managing diabetes or low sugar mode, prioritize low sugar and low glycaemic impact. Flag sugary drinks, desserts, refined carbs, sweet sauces, and large rice portions.
- For high blood pressure or kidney-friendly mode, apply the lower sodium target and flag salty/processed foods.
- For surgery recovery, prioritize protein, hydration, gentle meals, and avoid harsh or incompatible foods from customRestriction.
- Avoid one-line generic descriptions like "popular Filipino street food."
- Expand descriptions with useful context. Example: instead of "Deep-fried battered quail eggs, a popular Filipino street food," explain that kwek-kwek is quail egg coated in orange batter and deep-fried, that frying raises fat/calorie density, and that sauces can add sodium/sugar.
- Mention exact estimated nutrient values from your returned nutrition when relevant.
- Keep each sentence concise, but make it specific.
- Always return "ingredients" as an array of objects with name, note, and concern.
- List every distinct ingredient or component you can identify or infer. Aim for at least 4–8 items for any real food.
- For each ingredient, set "note" to a short phrase explaining its role or nutritional impact (e.g. "main protein", "adds sodium", "natural sweetener", "binding agent"). Never leave note null for key ingredients.
- Set "concern" to one of: "none", "allergen", "additive", "high-sodium", "high-sugar", "high-fat", "preservative". Use "allergen" for common allergens (gluten, dairy, shellfish, nuts, soy, eggs). Use "additive" for artificial colors, flavor enhancers (e.g. MSG), or artificial preservatives.
- If the exact recipe is proprietary, list the most likely or typical ingredients based on the food type — never return an empty array.
- Do not return vague entries like "other ingredients" or "spices" as a single catch-all — name them individually when possible.`;
};
