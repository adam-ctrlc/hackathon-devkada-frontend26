import {
  SmileyWink,
  Smiley,
  Star,
  SmileyBlank,
  SmileyNervous,
  SmileyMeh,
  SmileySad,
  SmileyAngry,
} from "@phosphor-icons/react";

export const moods = [
  { k: "happy", label: "Happy", Icon: SmileyWink },
  { k: "calm", label: "Calm", Icon: Smiley },
  { k: "focused", label: "Focused", Icon: Star },
  { k: "tired", label: "Tired", Icon: SmileyBlank },
  { k: "stressed", label: "Stressed", Icon: SmileyNervous },
  { k: "anxious", label: "Anxious", Icon: SmileyMeh },
  { k: "sad", label: "Sad", Icon: SmileySad },
  { k: "angry", label: "Angry", Icon: SmileyAngry },
];

export const moodBg = {
  happy: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  calm: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  focused: "bg-brand-50 text-brand-700 ring-brand-200",
  tired: "bg-amber-50 text-amber-700 ring-amber-200",
  stressed: "bg-amber-50 text-amber-700 ring-amber-200",
  anxious: "bg-red-50 text-red-700 ring-red-200",
  sad: "bg-red-50 text-red-700 ring-red-200",
  angry: "bg-red-50 text-red-700 ring-red-200",
};

export const moodLevels = {
  happy: { energy: 4, stress: 1 },
  calm: { energy: 3, stress: 1 },
  focused: { energy: 4, stress: 2 },
  tired: { energy: 1, stress: 2 },
  stressed: { energy: 2, stress: 4 },
  anxious: { energy: 2, stress: 5 },
  sad: { energy: 1, stress: 3 },
  angry: { energy: 3, stress: 5 },
};

export function deriveMoodKey(energy, stress) {
  if (stress >= 5) return energy >= 3 ? "angry" : "anxious";
  if (stress >= 4) return energy >= 3 ? "stressed" : "anxious";
  if (energy <= 1) return stress >= 3 ? "sad" : "tired";
  if (energy <= 2) return stress >= 3 ? "stressed" : "tired";
  if (energy >= 4) return stress <= 1 ? "happy" : "focused";
  return stress <= 1 ? "calm" : "focused";
}

export const labelizeMood = (k) => k.charAt(0).toUpperCase() + k.slice(1);

export const moodTone = {
  happy: "green",
  calm: "green",
  focused: "brand",
  tired: "amber",
  stressed: "amber",
  anxious: "red",
  sad: "red",
  angry: "red",
};

export function makeId() {
  return "entry-" + Date.now();
}

export function nowIso() {
  return new Date().toISOString();
}

export function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function fmtTime(iso) {
  return new Date(iso).toTimeString().slice(0, 5);
}

export function createDraftEntry() {
  return {
    id: makeId(),
    createdAt: nowIso(),
    moodKey: "calm",
    mood: "Calm",
    text: "",
    ai: "Write a few words, then save — your reflection appears here.",
    energy: 3,
    stress: 2,
    waterIntakeMl: 0,
    persisted: false,
  };
}

export function mapDiaryEntry(entry) {
  const moodKey = entry.moodTag ?? "calm";
  return {
    id: entry.id,
    createdAt: entry.createdAt,
    moodKey,
    mood: moodKey.charAt(0).toUpperCase() + moodKey.slice(1),
    text: entry.entry ?? "",
    ai: entry.aiReflection ?? "No reflection yet.",
    energy: Number(entry.energyLevel ?? 3),
    stress: Number(entry.stressLevel ?? 2),
    waterIntakeMl: Number(entry.waterIntakeMl ?? 0),
    persisted: true,
  };
}
