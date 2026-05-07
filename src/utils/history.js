export const PAGE_SIZE = 8;

export const formatDate = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const yest = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const time = d.toTimeString().slice(0, 5);
  if (d.toDateString() === now.toDateString()) return `Today ${time}`;
  if (d.toDateString() === yest.toDateString()) return `Yesterday ${time}`;
  return `May ${d.getDate()} ${time}`;
};

export const scoreTone = (score) =>
  score >= 70 ? "green" : score >= 50 ? "amber" : "red";

export const numberValue = (value) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

export const buildTargets = (profile = {}) => {
  const weightKg = Number(profile.weightKg) || 60;
  return {
    calories: Math.round(22 * weightKg + 650),
    sodium: (profile.dietRestrictions ?? []).some((item) =>
      String(item).toLowerCase().includes("low sodium"),
    )
      ? 1500
      : 2300,
    protein: Math.max(1, Math.round(weightKg * 1.2)),
    sugar: 50,
  };
};
