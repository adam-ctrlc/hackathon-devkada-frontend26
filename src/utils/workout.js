import {
  Barbell,
  Butterfly,
  FirstAid,
  Lightning,
  Footprints,
} from "@phosphor-icons/react";

export const typeIcon = {
  cardio: Barbell,
  flexibility: Butterfly,
  recovery: FirstAid,
  gym: Barbell,
  weightlifting: Barbell,
  bodyweight: Lightning,
  calisthenics: Lightning,
  push: Barbell,
  pull: Barbell,
  legs: Footprints,
};

export const typeTone = {
  cardio: "brand",
  flexibility: "green",
  recovery: "amber",
  gym: "brand",
  weightlifting: "brand",
  bodyweight: "green",
  calisthenics: "green",
  push: "brand",
  pull: "brand",
  legs: "amber",
};

export const typeLabel = {
  cardio: "Cardio",
  flexibility: "Flexibility",
  recovery: "Recovery",
  gym: "Gym",
  weightlifting: "Weightlifting",
  bodyweight: "Bodyweight",
  calisthenics: "Calisthenics",
  push: "Push",
  pull: "Pull",
  legs: "Legs",
};

export const intensityPct = { low: 33, moderate: 66, high: 100 };
export const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

export const workoutTypes = [
  ["cardio", "Cardio"],
  ["gym", "Gym"],
  ["weightlifting", "Weightlifting"],
  ["bodyweight", "Bodyweight"],
  ["calisthenics", "Calisthenics"],
  ["push", "Push"],
  ["pull", "Pull"],
  ["legs", "Legs"],
  ["flexibility", "Flexibility"],
  ["recovery", "Recovery"],
];

export const sessionTimes = ["morning", "afternoon", "evening"];

export const waterPeriods = [
  ["morning", "Morning"],
  ["afternoon", "Afternoon"],
  ["evening", "Evening"],
  ["night", "Night"],
  ["midnight", "Midnight"],
];

export const fallbackSuggestions = [
  {
    title: "20-min gentle walk",
    type: "cardio",
    duration: 20,
    reason: "Daily step target — keeps circulation active during recovery.",
  },
  {
    title: "Hip flexor stretch",
    type: "flexibility",
    duration: 10,
    reason: "Counters sitting time. Safe post-surgery with your current range.",
  },
  {
    title: "Box breathing",
    type: "recovery",
    duration: 5,
    reason: "Stress was high yesterday — breathing resets your nervous system.",
  },
];

export function formatDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const time = d.toTimeString().slice(0, 5);
  if (d.toDateString() === today.toDateString()) return `Today · ${time}`;
  if (d.toDateString() === yest.toDateString()) return `Yesterday · ${time}`;
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    ` · ${time}`
  );
}

export function fmtSecs(s) {
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export function getInputDateTimeValue(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const offsetMs = safeDate.getTimezoneOffset() * 60 * 1000;
  return new Date(safeDate.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function getLocalDateTimeParts(value) {
  const localValue =
    typeof value === "string" && value.includes("T")
      ? value
      : getInputDateTimeValue(value);
  const [datePart, timePart = "00:00"] = localValue.split("T");
  const [hour = "00", minute = "00"] = timePart.split(":");
  return {
    datePart: datePart || getInputDateTimeValue().split("T")[0],
    hour: Number(hour),
    minute: String(minute).padStart(2, "0").slice(0, 2),
  };
}

export function inferWaterPeriod(value = new Date()) {
  const { hour } = getLocalDateTimeParts(value);
  if (hour < 5) return "midnight";
  if (hour < 11) return "morning";
  if (hour < 15) return "afternoon";
  if (hour < 19) return "evening";
  return "night";
}

export function setWaterPeriodOnDateTime(value, period) {
  const { datePart, minute } = getLocalDateTimeParts(value);
  const hourByPeriod = {
    midnight: 0,
    morning: 8,
    afternoon: 13,
    evening: 17,
    night: 21,
  };
  const hour = String(hourByPeriod[period] ?? 8).padStart(2, "0");
  return `${datePart}T${hour}:${minute}`;
}

export function normalizeWorkoutType(value) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("weight") || text.includes("lift")) return "weightlifting";
  if (text.includes("bodyweight")) return "bodyweight";
  if (text.includes("calisthenics")) return "calisthenics";
  if (text.includes("push")) return "push";
  if (text.includes("pull")) return "pull";
  if (text.includes("leg")) return "legs";
  if (text.includes("gym")) return "gym";
  if (text.includes("stretch") || text.includes("flex")) return "flexibility";
  if (text.includes("recover") || text.includes("breath")) return "recovery";
  return "cardio";
}

export function mapWorkoutLog(log) {
  return {
    ...log,
    workoutType: normalizeWorkoutType(log.workoutType),
    durationMinutes: Number(log.durationMinutes ?? 0),
    caloriesBurned:
      log.caloriesBurned == null ? null : Number(log.caloriesBurned),
    distanceKm: log.distanceKm == null ? null : Number(log.distanceKm),
    notes: log.notes ?? {},
    aiAnalysis: log.aiAnalysis ?? null,
  };
}

export function mapWaterLog(log) {
  const amountMl = Number(log.amountMl ?? 0);
  const glassSizeMl = Number(log.glassSizeMl ?? 250) || 250;
  return {
    ...log,
    amountMl,
    glassCount:
      log.glassCount == null
        ? Math.max(1, Math.round(amountMl / glassSizeMl))
        : Number(log.glassCount),
    glassSizeMl,
    waterPeriod:
      log.waterPeriod ?? inferWaterPeriod(log.drankAt ?? log.createdAt),
    drankAt: log.drankAt ?? log.createdAt,
    note: log.note ?? "",
  };
}

export function mapSuggestion(item, index) {
  const muscle = Array.isArray(item.muscles) ? item.muscles[0]?.name : null;
  const title =
    item.title ??
    item.name ??
    item.exercise?.name ??
    item.workoutName ??
    (item.category ? `${item.category} session` : null) ??
    (muscle ? `${muscle} mobility` : null) ??
    fallbackSuggestions[index % fallbackSuggestions.length].title;
  const type = normalizeWorkoutType(
    item.type ?? item.workoutType ?? item.category ?? title,
  );
  const duration = Number(
    item.duration ?? item.durationMinutes ?? item.minutes ?? 15,
  );
  return {
    title,
    type,
    duration: Number.isFinite(duration) && duration > 0 ? duration : 15,
    reason:
      item.reason ??
      item.why ??
      item.description ??
      item.notes ??
      "Recommended from your current profile and available exercise library.",
  };
}
