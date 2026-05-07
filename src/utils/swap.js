export const deltaColor = {
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  amber: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
  slate: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
};

export const PAGE_SIZE = 6;

export const mapStoredSwaps = (rows = []) =>
  rows.map((row) => ({
    id: row.id,
    from: row.from,
    to: row.to,
    reason: row.reason,
    delta: Array.isArray(row.delta) ? row.delta : [],
    groceries: Array.isArray(row.groceries) ? row.groceries : [],
    supportLevel: row.supportLevel ?? "Medium",
    status: row.status ?? "suggested",
    profileSnapshot: row.profileSnapshot ?? null,
  }));

export const statusLabel = {
  all: "All",
  suggested: "Suggested",
  accepted: "Accepted",
  dismissed: "Dismissed",
};
