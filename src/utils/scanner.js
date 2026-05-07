import {
  BrowserMultiFormatReader,
  DecodeHintType,
  BarcodeFormat,
} from "@zxing/library";

export const buildProfileTargets = (profile = {}) => {
  const weightKg = Number(profile.weightKg) || 60;
  const healthText = [
    profile.healthGoal,
    profile.healthContext?.status,
    profile.healthContext?.notes,
    profile.healthContext?.customRestriction,
    ...(profile.dietRestrictions ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const calorieTarget = Math.round(
    22 * weightKg +
      650 +
      (healthText.includes("pregnant") ? 300 : 0) +
      (healthText.includes("breast") ? 500 : 0),
  );
  const lowSodium = [
    ...(profile.dietRestrictions ?? []),
    profile.healthGoal,
    profile.healthContext?.status,
    profile.healthContext?.notes,
    profile.healthContext?.customRestriction,
  ].some((item) =>
    String(item ?? "")
      .toLowerCase()
      .includes("low sodium"),
  );
  const diabetesMode =
    healthText.includes("diabetes") ||
    healthText.includes("blood sugar") ||
    healthText.includes("low sugar");

  return {
    dailyKcalTarget: calorieTarget,
    dailySodiumTarget:
      lowSodium ||
      healthText.includes("high blood pressure") ||
      healthText.includes("hypertension") ||
      healthText.includes("kidney")
        ? 1500
        : 2300,
    dailyProteinTarget: Math.max(1, Math.round(weightKg * 1.2)),
    dailySugarTarget: diabetesMode
      ? 25
      : Math.max(1, Math.round((calorieTarget * 0.1) / 4)),
  };
};

export const profilePlanLabel = (profile = {}) => {
  const restrictions = Array.isArray(profile.dietRestrictions)
    ? profile.dietRestrictions
    : [];
  if (
    [...restrictions, profile.healthGoal].some((item) =>
      String(item ?? "")
        .toLowerCase()
        .includes("low sodium"),
    )
  ) {
    return "low-sodium plan";
  }
  return profile.healthContext?.status ?? profile.healthGoal ?? "your profile";
};

export const normalizeBarcodeValue = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\D/g, "");

export const normalizeFoodName = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const isSameFoodScan = (scan, { productName, barcode } = {}) => {
  const nextBarcode = normalizeBarcodeValue(barcode);
  if (nextBarcode && normalizeBarcodeValue(scan.barcode) === nextBarcode) {
    return true;
  }
  const nextName = normalizeFoodName(productName);
  const scanName = normalizeFoodName(scan.productName);
  return Boolean(nextName && scanName && nextName === scanName);
};

export const nonFoodTerms = new Set([
  "laptop",
  "computer",
  "phone",
  "tablet",
  "keyboard",
  "mouse",
  "charger",
  "monitor",
  "chair",
  "desk",
  "shoe",
  "shirt",
  "pants",
  "bag",
]);

export const isClearlyNonFoodInput = (value) => {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  return nonFoodTerms.has(text);
};

export const mealPeriodOptions = [
  ["morning", "Morning"],
  ["afternoon", "Afternoon"],
  ["evening", "Evening"],
  ["night", "Night"],
  ["midnight", "Midnight"],
];

export const mealPeriodHour = {
  midnight: 0,
  morning: 8,
  afternoon: 13,
  evening: 18,
  night: 21,
};

export const inputDateTimeValue = (date = new Date()) => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

export const getLocalDateTimeParts = (value = inputDateTimeValue()) => {
  const fallback = inputDateTimeValue();
  const safeValue =
    typeof value === "string" && value.includes("T")
      ? value
      : inputDateTimeValue(value instanceof Date ? value : new Date(value));
  const [datePart = fallback.slice(0, 10), timePart = fallback.slice(11)] =
    safeValue.split("T");
  const [hour = "00", minute = "00"] = timePart.split(":");
  return {
    datePart,
    hour: Number(hour) || 0,
    minute: String(minute).padStart(2, "0").slice(0, 2),
  };
};

export const inferMealPeriod = (value = new Date()) => {
  const { hour } = getLocalDateTimeParts(value);
  if (hour < 5) return "midnight";
  if (hour < 11) return "morning";
  if (hour < 15) return "afternoon";
  if (hour < 19) return "evening";
  return "night";
};

export const setMealPeriodOnDateTime = (value, period) => {
  const { datePart, minute } = getLocalDateTimeParts(value);
  const hour = mealPeriodHour[period] ?? mealPeriodHour.morning;
  return `${datePart}T${String(hour).padStart(2, "0")}:${minute}`;
};

const imageFileToImg = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      img.dataset.objectUrl = objectUrl;
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image load failed"));
    };
    img.src = objectUrl;
  });

const decodeWithZxing = async (file) => {
  let img;
  try {
    img = await imageFileToImg(file);
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
      BarcodeFormat.QR_CODE,
    ]);
    const reader = new BrowserMultiFormatReader(hints);
    const result = await reader.decodeFromImageElement(img);
    const text = result?.getText();
    console.log("[scanner] ZXing decoded:", text);
    return normalizeBarcodeValue(text);
  } catch (err) {
    console.log("[scanner] ZXing failed:", err?.message ?? err);
    return null;
  } finally {
    if (img?.dataset?.objectUrl) URL.revokeObjectURL(img.dataset.objectUrl);
  }
};

export const decodeBarcodeFromFile = async (file) => {
  if (!file?.type?.startsWith("image/")) return null;
  return decodeWithZxing(file);
};

export const fetchOpenFoodFacts = async (barcode) => {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 1 || !json.product) return null;
    const p = json.product;
    const n = p.nutriments ?? {};
    return {
      productName: p.product_name || p.generic_name || null,
      brand: p.brands || null,
      ingredients: p.ingredients_text || null,
      allergens: p.allergens_tags?.map((a) => a.replace(/^en:/, "")) ?? [],
      servingSize: p.serving_size || null,
      nutrition: {
        calories: n["energy-kcal_serving"] ?? n["energy-kcal_100g"] ?? null,
        fatGrams: n.fat_serving ?? n.fat_100g ?? null,
        sugarGrams: n.sugars_serving ?? n.sugars_100g ?? null,
        sodiumMg:
          n.sodium_serving != null
            ? Math.round(n.sodium_serving * 1000)
            : n.sodium_100g != null
              ? Math.round(n.sodium_100g * 1000)
              : null,
        proteinGrams: n.proteins_serving ?? n.proteins_100g ?? null,
        fiberGrams: n.fiber_serving ?? n.fiber_100g ?? null,
      },
    };
  } catch {
    return null;
  }
};

export const numberValue = (value) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

export const normalizeFlags = (notes = []) =>
  (Array.isArray(notes) ? notes : [])
    .map((note) => {
      if (typeof note === "object" && note !== null) {
        return {
          tone: note.tone ?? "slate",
          label: note.label ?? String(note.detail ?? "Note"),
          detail: note.detail ?? note.label ?? "",
        };
      }
      return {
        tone: String(note).toLowerCase().includes("high") ? "amber" : "slate",
        label: String(note),
        detail: "",
      };
    })
    .filter((note) => note.label);

export function buildResult(raw, scans = [], targets = buildProfileTargets()) {
  if (!raw) return null;
  const avgScore = scans.length
    ? Math.round(scans.reduce((a, s) => a + (s.score ?? 0), 0) / scans.length)
    : raw.score;
  const diff = raw.score - avgScore;
  const calories = numberValue(raw.calories);
  const sodiumMg = numberValue(raw.sodiumMg);
  const sugarGrams = numberValue(raw.sugarGrams);
  const fatGrams = numberValue(raw.fatGrams);
  const proteinGrams = numberValue(raw.proteinGrams);
  const fiberGrams = numberValue(raw.fiberGrams);

  return {
    id: raw.id,
    name: raw.productName,
    variant: raw.variant ?? raw.foodType,
    barcode: raw.barcode ?? "manual",
    score: raw.score,
    serving: raw.serving ?? "1 serving",
    avgScore,
    diff,
    macros: [
      {
        k: "Calories",
        v: calories.toString(),
        u: "kcal",
        pct: Math.min(
          Math.round(calories / (targets.dailyKcalTarget / 100)),
          100,
        ),
      },
      {
        k: "Sodium",
        v: sodiumMg.toLocaleString(),
        u: "mg",
        pct: Math.min(
          Math.round(sodiumMg / (targets.dailySodiumTarget / 100)),
          100,
        ),
        flag: sodiumMg > 800 ? "high" : sodiumMg > 400 ? "med" : undefined,
      },
      {
        k: "Sugar",
        v: sugarGrams.toString(),
        u: "g",
        pct: Math.min(
          Math.round(sugarGrams / (targets.dailySugarTarget / 100)),
          100,
        ),
        flag: sugarGrams > 15 ? "high" : sugarGrams > 8 ? "med" : undefined,
      },
      {
        k: "Fat",
        v: fatGrams.toString(),
        u: "g",
        pct: Math.min(Math.round(fatGrams / (65 / 100)), 100),
        flag: fatGrams > 20 ? "high" : fatGrams > 10 ? "med" : undefined,
      },
      {
        k: "Protein",
        v: proteinGrams.toString(),
        u: "g",
        pct: Math.min(
          Math.round(proteinGrams / (targets.dailyProteinTarget / 100)),
          100,
        ),
        flag: proteinGrams < 5 ? "low" : undefined,
      },
      {
        k: "Fiber",
        v: fiberGrams.toString(),
        u: "g",
        pct: Math.min(Math.round(fiberGrams / (28 / 100)), 100),
        flag: fiberGrams < 2 ? "low" : undefined,
      },
    ],
    flags: normalizeFlags(raw.notes),
    allergens: raw.allergens ?? [],
    ingredients:
      raw.ingredients ??
      raw.aiAnalysis?.ingredients ??
      "The exact recipe is not public, so KainWise could not infer the ingredient list yet.",
    wellnessImpact: raw.wellnessImpact ?? "",
    supportLevel: raw.supportLevel,
    estimatedPricePhp: raw.estimatedPricePhp ?? null,
    estimatedPriceCurrency: raw.estimatedPriceCurrency ?? "PHP",
    betterAlternatives: Array.isArray(raw.betterAlternatives)
      ? raw.betterAlternatives
      : [],
    aiAnalysis: raw.aiAnalysis ?? null,
    calories,
    sodiumMg,
    sugarGrams,
    fatGrams,
    proteinGrams,
    fiberGrams,
  };
}

export function timeAgo(iso) {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return `May ${new Date(iso).getDate()}`;
}

export const macroNumber = (result, key) => {
  const item = result?.macros?.find((macro) => macro.k === key);
  return Number(String(item?.v ?? "0").replace(/,/g, "")) || 0;
};

export const buildScoreReasons = (result, targets) => {
  if (!result) return [];
  const calories = macroNumber(result, "Calories");
  const sodium = macroNumber(result, "Sodium");
  const sugar = macroNumber(result, "Sugar");
  const protein = macroNumber(result, "Protein");
  const fiber = macroNumber(result, "Fiber");
  const reasons = [];

  if (sodium > 0) {
    const pct = Math.round((sodium / targets.dailySodiumTarget) * 100);
    reasons.push({
      tone: sodium > 800 ? "red" : sodium > 400 ? "amber" : "green",
      label: "Sodium load",
      detail: `${sodium.toLocaleString()} mg sodium is ${pct}% of your ${targets.dailySodiumTarget.toLocaleString()} mg daily target.`,
    });
  }
  if (sugar > 0) {
    const pct = Math.round((sugar / targets.dailySugarTarget) * 100);
    reasons.push({
      tone: sugar > 15 ? "red" : sugar > 8 ? "amber" : "green",
      label: "Sugar impact",
      detail: `${sugar} g sugar is ${pct}% of your ${targets.dailySugarTarget} g daily sugar target.`,
    });
  }
  if (calories > 0) {
    const pct = Math.round((calories / targets.dailyKcalTarget) * 100);
    reasons.push({
      tone: calories > 700 ? "amber" : "green",
      label: "Energy density",
      detail: `${calories} kcal is ${pct}% of your estimated ${targets.dailyKcalTarget.toLocaleString()} kcal daily target.`,
    });
  }
  if (protein > 0) {
    const pct = Math.round((protein / targets.dailyProteinTarget) * 100);
    reasons.push({
      tone: protein >= 15 ? "green" : protein >= 5 ? "amber" : "slate",
      label: "Protein support",
      detail: `${protein} g protein gives about ${pct}% of your ${targets.dailyProteinTarget} g daily protein target.`,
    });
  }
  if (fiber > 0) {
    reasons.push({
      tone: fiber >= 5 ? "green" : fiber >= 2 ? "amber" : "slate",
      label: "Fiber balance",
      detail: `${fiber} g fiber ${fiber < 2 ? "is low, so it may be less filling and less helpful for glucose stability." : "adds some satiety support."}`,
    });
  }
  return reasons;
};

const normalizeActivityLevel = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const estimateWaterTargetMl = (profile = {}) => {
  const weightKg = Number(profile.weightKg);
  if (!weightKg) return 2000;
  const baseline = Math.round(weightKg * 30);
  const activity = normalizeActivityLevel(profile.activityLevel);
  let bonus = 0;
  if (activity === "moderate") bonus = 150;
  if (activity === "active" || activity === "very active") bonus = 300;
  return Math.max(1500, baseline + bonus);
};

const lowerSupportPredicate = (entry = {}) => {
  const level = String(entry.supportLevel ?? "").toLowerCase();
  return level === "low" || level === "medium" || Number(entry.score ?? 0) < 70;
};

const lowerSupportFoodPredicate = (entry = {}) =>
  lowerSupportPredicate(entry) ||
  Number(entry.sodiumMg ?? 0) >= 600 ||
  Number(entry.sugarGrams ?? 0) >= 12;

export const buildScannerPatternNotice = ({
  result,
  scans = [],
  calendar = null,
  profile = {},
  targets = buildProfileTargets(profile),
}) => {
  if (!result) return null;

  const calendarRows = Array.isArray(calendar?.calendar)
    ? calendar.calendar
    : [];
  const recordedDays = calendarRows.filter((row) => {
    const support = String(row?.supportLevel ?? "");
    const foodCount = Number(
      row?.foodEntryCount ??
        (Array.isArray(row?.foodEntries) ? row.foodEntries.length : 0),
    );
    const waterTotal = Number(row?.waterTotalMl ?? 0);
    return support !== "No Data" || foodCount > 0 || waterTotal > 0;
  });
  const recentDays = recordedDays.slice(-14);
  const lowSupportDays = recentDays.filter(lowerSupportPredicate).length;
  const avgWaterMl = recentDays.length
    ? Math.round(
        recentDays.reduce(
          (sum, row) => sum + Number(row.waterTotalMl ?? 0),
          0,
        ) / recentDays.length,
      )
    : null;
  const recurringLowerSupportFoods = recentDays.reduce((sum, row) => {
    const foods = Array.isArray(row.foodEntries) ? row.foodEntries : [];
    return sum + foods.filter(lowerSupportFoodPredicate).length;
  }, 0);
  const recentScanSlice = scans.slice(0, 7);
  const recentLowSupportScans = recentScanSlice.filter(
    lowerSupportPredicate,
  ).length;

  const waterTargetMl = estimateWaterTargetMl(profile);
  const sodiumPct = Math.round(
    (Number(result.sodiumMg ?? 0) /
      Math.max(1, Number(targets.dailySodiumTarget ?? 2300))) *
      100,
  );
  const sugarPct = Math.round(
    (Number(result.sugarGrams ?? 0) /
      Math.max(1, Number(targets.dailySugarTarget ?? 50))) *
      100,
  );
  const fatPct = Math.round((Number(result.fatGrams ?? 0) / 65) * 100);
  const pressureNow = [
    sodiumPct >= 35 ? "sodium" : null,
    sugarPct >= 30 ? "sugar" : null,
    fatPct >= 35 ? "fat" : null,
  ].filter(Boolean);

  const trendLine = recentDays.length
    ? `${lowSupportDays}/${recentDays.length} recent recorded days landed in lower wellness support.`
    : recentScanSlice.length
      ? `${recentLowSupportScans}/${recentScanSlice.length} recent scans were lower support.`
      : "Log more days in Calendar to unlock stronger pattern coaching.";
  const hydrationLine =
    avgWaterMl != null
      ? `Average water was ${avgWaterMl.toLocaleString()}ml/day vs ~${waterTargetMl.toLocaleString()}ml target.`
      : "Hydration trend appears once water logs are saved.";

  const behavioralSuggestions = [
    lowSupportDays >= 3 || recurringLowerSupportFoods >= 4
      ? "Your calendar trend shows repeated lower-support meals. Plan one simple upgrade daily: lean protein + vegetables + high-fiber carb."
      : null,
    avgWaterMl != null && avgWaterMl < waterTargetMl * 0.8
      ? "Hydration is behind target. Add one 350-500ml glass with every main meal."
      : null,
    pressureNow.length
      ? `This serving is heavy on ${pressureNow.join(", ")}. Pair it with water and a high-fiber side to soften the impact.`
      : "This serving is relatively balanced; keep this pattern for your next meals.",
  ].filter(Boolean);
  const hasMilkAllergy = (result.allergens ?? []).some((allergen) => {
    const value = String(allergen ?? "").toLowerCase();
    return value.includes("milk") || value.includes("dairy");
  });
  const concreteSuggestions = [
    pressureNow.includes("sodium") || pressureNow.includes("fat")
      ? "Try this next plate: grilled fish or skinless chicken, 1 cup vegetables, and 1/2 cup brown rice."
      : null,
    pressureNow.includes("sugar")
      ? "Try this sweet swap: water or unsweetened tea + whole fruit with unsalted nuts."
      : null,
    Number(result.fiberGrams ?? 0) < 5
      ? "Add one fiber booster in your next meal: oats, monggo/beans, or leafy vegetables."
      : null,
    hasMilkAllergy
      ? "Milk allergy note: choose dairy-free options and avoid cheese or cream-based sauces."
      : null,
    !pressureNow.length
      ? "Balanced sample meal: grilled tofu or fish, mixed vegetables, fruit, and water."
      : null,
  ].filter(Boolean);
  const suggestions = [
    ...new Set([...behavioralSuggestions, ...concreteSuggestions]),
  ];

  const tone =
    (lowSupportDays >= 5 &&
      avgWaterMl != null &&
      avgWaterMl < waterTargetMl * 0.75) ||
    pressureNow.length >= 2
      ? "red"
      : lowSupportDays >= 3 ||
          (avgWaterMl != null && avgWaterMl < waterTargetMl * 0.9) ||
          pressureNow.length === 1
        ? "amber"
        : "green";

  return {
    title: tone === "red" ? "Pattern alert" : "Pattern notice",
    trendLine,
    hydrationLine,
    suggestions: suggestions.slice(0, 5),
    tone,
  };
};

const checkinStateMeta = {
  good: {
    moodTag: "calm",
    energyLevel: 4,
    stressLevel: 2,
    text: "felt pretty steady",
  },
  okay: {
    moodTag: "okay",
    energyLevel: 3,
    stressLevel: 3,
    text: "felt okay but a bit up and down",
  },
  low_energy: {
    moodTag: "tired",
    energyLevel: 2,
    stressLevel: 3,
    text: "felt low on energy",
  },
  stressed: {
    moodTag: "stressed",
    energyLevel: 2,
    stressLevel: 4,
    text: "felt stressed and mentally heavy",
  },
};

const checkinTroubleLabels = {
  sleep_trouble: "sleep trouble",
  anxious: "anxious thoughts",
  overthinking: "overthinking",
  low_motivation: "low motivation",
};

export const buildScannerCheckinDiaryPayload = ({ result, checkIn }) => {
  const stateId = String(checkIn?.state ?? "okay");
  const state = checkinStateMeta[stateId] ?? checkinStateMeta.okay;
  const troubles = Array.isArray(checkIn?.troubles) ? checkIn.troubles : [];
  const troubleText = troubles
    .map((item) => checkinTroubleLabels[item] ?? String(item))
    .join(", ");
  const note = String(checkIn?.note ?? "").trim();
  const productName = String(result?.name ?? "this meal");
  const entry = [
    `I ate ${productName} today.`,
    `After eating, I ${state.text}.`,
    troubleText ? `Lately I've also been dealing with ${troubleText}.` : null,
    note ? `Extra note: ${note}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    entry,
    moodTag: state.moodTag,
    energyLevel: state.energyLevel,
    stressLevel: state.stressLevel,
    symptoms: troubles,
  };
};

export const buildScannerMentalSupport = ({ result, context, checkIn }) => {
  if (!result) return null;
  const lowSupportRatio = Number(context?.food?.lowSupportRatio ?? 0);
  const hydrationRatio = Number(context?.hydration?.ratio ?? 0);
  const workoutDays14 = Number(context?.workout?.activeDays14d ?? 0);
  const avgStress = Number(context?.diary?.avgStress ?? 0);
  const avgEnergy = Number(context?.diary?.avgEnergy ?? 0);
  const diaryEntries14 = Number(context?.diary?.entries14d ?? 0);
  const foodEntries = Number(context?.food?.entries ?? 0);
  const sodium = Number(result.sodiumMg ?? 0);
  const sugar = Number(result.sugarGrams ?? 0);
  const fat = Number(result.fatGrams ?? 0);

  const contributors = [];
  if (sodium >= 700)
    contributors.push(
      "This serving is high in sodium, which can make recovery feel harder.",
    );
  if (sugar >= 14)
    contributors.push(
      "Sugar load is elevated, which may lead to an energy crash later.",
    );
  if (fat >= 24)
    contributors.push(
      "Higher fat density may feel heavy and reduce alertness for some people.",
    );
  if (lowSupportRatio >= 0.6)
    contributors.push(
      "Your recent food pattern is mostly lower-support, so mood and focus may feel less stable.",
    );
  if (hydrationRatio > 0 && hydrationRatio < 0.8)
    contributors.push(
      "Hydration trend is behind target, which can affect concentration and energy.",
    );
  if (workoutDays14 <= 1)
    contributors.push(
      "Movement has been limited lately, so stress release and energy support may be lower.",
    );
  if (avgStress >= 3.8)
    contributors.push(
      "Recent check-ins suggest stress is running high, so gentle support habits matter more.",
    );
  if (avgEnergy > 0 && avgEnergy <= 2.7)
    contributors.push(
      "Recent energy trend is low, so steady meals and hydration can help stabilize your day.",
    );

  const checkInTroubles = Array.isArray(checkIn?.troubles)
    ? checkIn.troubles
    : [];
  if (checkIn?.state === "stressed" || checkInTroubles.includes("anxious")) {
    contributors.push(
      "You reported stress/anxious feelings, so calmer meal and hydration choices are recommended.",
    );
  }

  const actions = [
    sodium >= 700 || fat >= 24
      ? "Next meal idea: grilled fish/chicken or tofu + vegetables + 1/2 cup brown rice."
      : null,
    sugar >= 14
      ? "Swap sweet drinks for water or unsweetened tea, then add fruit + nuts for steadier energy."
      : null,
    hydrationRatio > 0 && hydrationRatio < 0.85
      ? "Hydration step: drink 350-500ml water now and another glass with your next meal."
      : null,
    workoutDays14 <= 1
      ? "Movement step: 10-20 minutes light walk or stretching today to support stress and focus."
      : null,
    checkInTroubles.includes("sleep_trouble")
      ? "Sleep-support step: keep tonight's meal lighter and avoid caffeinated drinks late."
      : null,
    checkInTroubles.includes("low_motivation")
      ? "Motivation step: pick one tiny win (water + one balanced snack) instead of trying to change everything."
      : null,
  ].filter(Boolean);

  const dataSignals = [
    foodEntries >= 10,
    Number(context?.hydration?.avgDailyMl ?? 0) > 0,
    diaryEntries14 >= 3,
    Number(context?.workout?.sessions14d ?? 0) > 0,
  ].filter(Boolean).length;
  const confidence =
    dataSignals >= 3 ? "high" : dataSignals === 2 ? "medium" : "low";

  const riskCount = contributors.length;
  const tone = riskCount >= 4 ? "red" : riskCount >= 2 ? "amber" : "green";
  const summary =
    tone === "red"
      ? "This meal plus your recent pattern may make mood and energy less steady today."
      : tone === "amber"
        ? "This meal may affect energy or focus today, but a few support habits can help."
        : "This meal looks relatively supportive for mood and energy right now.";

  return {
    title: "Mind & energy impact",
    summary,
    confidence,
    tone,
    contributors: contributors.slice(0, 4),
    actions: actions.length
      ? actions.slice(0, 4)
      : [
          "Keep meals balanced, hydrate steadily, and continue logging how you feel after meals.",
        ],
    motivation:
      context?.motivationText ??
      "Small daily improvements count. A steadier next choice can improve your trend over time.",
  };
};

export const shouldSuggestSwap = (result) => {
  if (!result) return false;
  const support = String(result.supportLevel ?? "").toLowerCase();
  return support === "low" || support === "medium" || Number(result.score) < 70;
};

export const buildScannerSwapSuggestion = (result, scan = null) => {
  if (!shouldSuggestSwap(result)) return null;
  const alternatives = result.betterAlternatives ?? [];
  const firstAlternative = alternatives.find(Boolean);
  const to =
    typeof firstAlternative === "string"
      ? firstAlternative
      : firstAlternative?.name || firstAlternative?.to;
  if (!to) return null;

  const action = `Choose ${to} next time instead of ${result.name}.`;
  const delta = [
    result.sodiumMg > 600
      ? {
          k: "Sodium",
          v: `${Math.round(result.sodiumMg).toLocaleString()}mg now`,
          tone: "amber",
        }
      : null,
    result.sugarGrams > 8
      ? {
          k: "Sugar",
          v: `${Math.round(result.sugarGrams)}g now`,
          tone: "amber",
        }
      : null,
    result.proteinGrams < 10
      ? {
          k: "Protein",
          v: `${Math.round(result.proteinGrams)}g now`,
          tone: "slate",
        }
      : null,
  ].filter(Boolean);

  return {
    from: result.name,
    to,
    reason:
      result.wellnessImpact ||
      `${result.name} scored ${result.score}/100, so KainWise suggests a steadier alternative for your current profile.`,
    supportLevel: "High",
    status: "suggested",
    source: "scanner-swap",
    nutrition: {
      calories: result.calories,
      sodiumMg: result.sodiumMg,
      sugarGrams: result.sugarGrams,
      fatGrams: result.fatGrams,
      proteinGrams: result.proteinGrams,
      fiberGrams: result.fiberGrams,
    },
    action,
    delta: delta.length
      ? delta
      : [{ k: "Score", v: `${result.score}/100 now`, tone: "amber" }],
    groceries: [to],
    aiPayload: {
      scanId: result.id,
      score: result.score,
      supportLevel: result.supportLevel,
      alternatives,
      action,
      recommendationMode: "next_time",
      scanContext: {
        scanId: scan?.id ?? result.id,
        mealPeriod: scan?.mealPeriod ?? null,
        eatenAt: scan?.eatenAt ?? null,
      },
    },
  };
};
