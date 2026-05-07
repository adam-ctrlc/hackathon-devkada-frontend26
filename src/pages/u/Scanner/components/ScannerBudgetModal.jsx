import { useState } from "react";
import { Modal } from "../../../../components/ui/Modal.jsx";
import { Button } from "../../../../components/ui/Button.jsx";
import { Basket, Plus } from "@phosphor-icons/react";

export function ScannerBudgetModal({
  logs = [],
  loading = false,
  scanning = false,
  onClose,
  onScan,
  onCreateBudgetLog,
}) {
  const [selectedLogId, setSelectedLogId] = useState("");
  const [selectedItems, setSelectedItems] = useState({});
  const selectedLog = logs.find((log) => log.id === selectedLogId) ?? logs[0];
  const items = Array.isArray(selectedLog?.items)
    ? selectedLog.items
        .map((item, index) => ({
          key: `${selectedLog.id}-${index}`,
          name:
            typeof item === "object"
              ? String(item.name ?? item.title ?? "").trim()
              : String(item ?? "").trim(),
          amount:
            typeof item === "object" && item.amount != null
              ? Number(item.amount)
              : null,
        }))
        .filter((item) => item.name)
    : [];
  const activeItems = items.filter((item) => selectedItems[item.key] ?? true);

  const toggleItem = (key) => {
    setSelectedItems((current) => ({
      ...current,
      [key]: !(current[key] ?? true),
    }));
  };

  return (
    <Modal
      title="Ready to scan your budget logs?"
      subtitle="Pick a saved budget title, then KainWise will scan its food items."
      width="max-w-[620px]"
      onClose={scanning ? () => {} : onClose}
      footer={
        <div className="flex justify-start sm:justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={scanning}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={
              loading || scanning || !selectedLog || !activeItems.length
            }
            onClick={() => onScan(selectedLog, activeItems)}
          >
            <Basket size={13} />
            {scanning ? "Scanning..." : "Scan selected items"}
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="rounded-2xl bg-slate-50 p-6 text-center text-[14px] text-slate-500 ring-1 ring-slate-200">
          Loading budget logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl bg-brand-50 p-6 text-center ring-1 ring-brand-100">
          <div className="font-display text-[19px] text-slate-900">
            No budget logs yet
          </div>
          <p className="mx-auto mt-1 max-w-[360px] text-[13px] text-slate-600">
            Create a budget log first, then scanner can analyse the foods listed
            in it.
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-4"
            onClick={onCreateBudgetLog}
          >
            <Plus size={13} /> Create budget log
          </Button>
        </div>
      ) : (
        <>
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
            Budget title
          </label>
          <select
            value={selectedLog?.id ?? ""}
            onChange={(event) => {
              setSelectedLogId(event.target.value);
              setSelectedItems({});
            }}
            disabled={scanning}
            className="h-10 w-full rounded-xl bg-slate-50 px-3 text-[14px] ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
          >
            {logs.map((log) => (
              <option key={log.id} value={log.id}>
                {log.title}
              </option>
            ))}
          </select>

          <div className="mt-5 rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Items from this log
                </div>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  These names will be sent to Gemini Live and saved as scanner
                  results.
                </p>
              </div>
              <div className="text-[12px] text-slate-500">
                {activeItems.length}/{items.length} selected
              </div>
            </div>
            {items.length ? (
              <div className="space-y-2">
                {items.map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-[13px] text-slate-700 ring-1 ring-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems[item.key] ?? true}
                      onChange={() => toggleItem(item.key)}
                      disabled={scanning}
                      className="h-4 w-4 accent-brand-600"
                    />
                    <span className="flex-1">{item.name}</span>
                    {item.amount != null && Number.isFinite(item.amount) && (
                      <span className="font-mono text-[12px] text-slate-500">
                        {selectedLog.currency} {item.amount.toFixed(0)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-white px-4 py-5 text-center text-[13px] text-slate-500 ring-1 ring-slate-200">
                This budget log has no food items to scan.
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
