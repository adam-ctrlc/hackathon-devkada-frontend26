import {
  Heart,
  Drop,
  Pulse,
  Smiley,
  Leaf,
  Lightning,
  Fire,
  Sparkle,
  Clock,
  Check,
} from "@phosphor-icons/react";

export const STATUS_OPTIONS = [
  {
    id: "surgery",
    label: "Recovering from surgery",
    icon: Heart,
    description:
      "Doctor-approved foods + extra protein. Low sodium, soft foods preferred.",
    changes: [
      "Sodium target adjusted by profile",
      "Protein target boosted by profile",
      "Soft-food friendly swaps",
      "Recovery-period diary prompts",
    ],
  },
  {
    id: "diabetes",
    label: "Managing diabetes",
    icon: Drop,
    description:
      "Low glycaemic index foods prioritised. Sugar and refined carbs flagged.",
    changes: [
      "Sugar target: ≤25g/day",
      "Low-GI food scoring boost",
      "Refined carb warnings",
      "Blood sugar-friendly meal ideas",
    ],
  },
  {
    id: "hypertension",
    label: "High blood pressure",
    icon: Pulse,
    description: "Sodium-restricted plan. Potassium-rich foods encouraged.",
    changes: [
      "Sodium target: 1,500mg/day",
      "Potassium-rich food highlights",
      "Processed food warnings",
      "DASH diet alignment",
    ],
  },
  {
    id: "pregnancy",
    label: "Pregnant",
    icon: Smiley,
    description:
      "Folate, iron, and calcium prioritised. Raw foods and allergens flagged.",
    changes: [
      "Folate & iron tracking",
      "Raw food / allergen warnings",
      "Calorie target adjusted (+300 kcal)",
      "Prenatal nutrition prompts",
    ],
  },
  {
    id: "breastfeed",
    label: "Breastfeeding",
    icon: Leaf,
    description:
      "Higher calorie and hydration targets. Foods to avoid while nursing highlighted.",
    changes: [
      "Calorie target +500 kcal/day",
      "Hydration target increased",
      "Foods to avoid while nursing flagged",
      "Calcium & vitamin D focus",
    ],
  },
  {
    id: "weightloss",
    label: "Weight loss goal",
    icon: Lightning,
    description:
      "Caloric deficit guidance. Satiety-focused, low-calorie foods scored higher.",
    changes: [
      "Calorie target: deficit mode",
      "High-satiety foods boosted",
      "Calorie-dense snacks flagged",
      "Portion guidance in diary",
    ],
  },
  {
    id: "musclegain",
    label: "Muscle gain goal",
    icon: Fire,
    description:
      "High protein targets. Caloric surplus with quality food sources.",
    changes: [
      "Protein target boosted by profile",
      "Calorie surplus guidance",
      "Post-workout nutrition tips",
      "Lean protein sources boosted",
    ],
  },
  {
    id: "keto",
    label: "Keto / low-carb",
    icon: Sparkle,
    description:
      "Net carbs tracked and capped. High-fat, moderate-protein foods highlighted.",
    changes: [
      "Net carbs capped at 20–50g/day",
      "High-carb foods flagged",
      "Healthy fat sources boosted",
      "Electrolyte tracking enabled",
    ],
  },
  {
    id: "vegan",
    label: "Vegan / plant-based",
    icon: Leaf,
    description:
      "Animal products excluded. B12, iron, zinc, and omega-3 monitored.",
    changes: [
      "Animal products flagged",
      "B12 & iron tracking",
      "Complete protein combinations",
      "Plant-based swap suggestions",
    ],
  },
  {
    id: "fasting",
    label: "Intermittent fasting",
    icon: Clock,
    description:
      "Eating window tracked. Nutrient density prioritised in eating window.",
    changes: [
      "Eating window reminders",
      "Calorie density optimised",
      "Breaking-fast food guidance",
      "Hydration reminders during fast",
    ],
  },
  {
    id: "kidney",
    label: "Kidney-friendly diet",
    icon: Drop,
    description: "Phosphorus, potassium, and sodium all restricted.",
    changes: [
      "Sodium target: 1,500mg/day",
      "Phosphorus-high foods flagged",
      "Potassium limits applied",
      "Protein moderated",
    ],
  },
  {
    id: "none",
    label: "No active condition",
    icon: Check,
    description:
      "General healthy eating guidance. No special restrictions applied.",
    changes: [
      "Standard calorie targets",
      "Balanced macro guidance",
      "Variety and whole-food scoring",
      "General wellness diary prompts",
    ],
  },
];

export const STATUS_OPTIONS_BY_GENDER = {
  male: STATUS_OPTIONS.filter(
    (option) => !["pregnancy", "breastfeed"].includes(option.id),
  ),
  female: STATUS_OPTIONS,
};

export const normalizeSex = (value) =>
  String(value ?? "MALE")
    .trim()
    .toUpperCase();

export const getStatusOptionsForProfile = (profile = {}) =>
  normalizeSex(profile.sex) === "FEMALE"
    ? STATUS_OPTIONS_BY_GENDER.female
    : STATUS_OPTIONS_BY_GENDER.male;

export const getStatusBlockReason = (optionId, profile = {}) => {
  const allowedIds = new Set(
    getStatusOptionsForProfile(profile).map((option) => option.id),
  );

  if (!allowedIds.has(optionId)) {
    return "Not available for this profile gender.";
  }

  return "";
};

export const statusToOptionId = (status) => {
  const text = String(status ?? "").toLowerCase();
  if (!text) return "none";
  const direct = STATUS_OPTIONS.find((option) => option.id === text);
  if (direct) return direct.id;
  if (text.includes("surgery") || text.includes("recovery")) return "surgery";
  if (text.includes("diabetes")) return "diabetes";
  if (text.includes("pressure") || text.includes("hypertension"))
    return "hypertension";
  if (text.includes("pregnant") || text.includes("pregnancy"))
    return "pregnancy";
  if (text.includes("breast")) return "breastfeed";
  if (text.includes("weight loss")) return "weightloss";
  if (text.includes("muscle")) return "musclegain";
  if (text.includes("keto") || text.includes("carb")) return "keto";
  if (text.includes("vegan") || text.includes("plant")) return "vegan";
  if (text.includes("fast")) return "fasting";
  if (text.includes("kidney")) return "kidney";
  return "none";
};
