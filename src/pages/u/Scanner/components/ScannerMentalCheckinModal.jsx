import { useMemo, useState } from "react";
import { Modal } from "../../../../components/ui/Modal.jsx";
import { Button } from "../../../../components/ui/Button.jsx";
import { Sparkle } from "@phosphor-icons/react";

const defaultQuestion = {
  question: "How have you been feeling after meals lately?",
  options: [
    { id: "good", label: "Good and steady" },
    { id: "okay", label: "Okay but up and down" },
    { id: "low_energy", label: "Low energy" },
    { id: "stressed", label: "Stressed or overwhelmed" },
  ],
  troubleOptions: [
    { id: "sleep_trouble", label: "Sleep trouble" },
    { id: "anxious", label: "Anxious thoughts" },
    { id: "overthinking", label: "Overthinking" },
    { id: "low_motivation", label: "Low motivation" },
  ],
};

export function ScannerMentalCheckinModal({
  questionData = null,
  resultName = "this meal",
  onClose,
  onSkip,
  onSubmit,
  saving = false,
}) {
  const prompt = questionData?.question ?? defaultQuestion.question;
  const options = questionData?.options?.length
    ? questionData.options
    : defaultQuestion.options;
  const troubleOptions = questionData?.troubleOptions?.length
    ? questionData.troubleOptions
    : defaultQuestion.troubleOptions;

  const [selectedState, setSelectedState] = useState(options[0]?.id ?? "okay");
  const [selectedTroubles, setSelectedTroubles] = useState([]);
  const [note, setNote] = useState("");

  const canSubmit = useMemo(() => Boolean(selectedState), [selectedState]);

  const toggleTrouble = (id) => {
    setSelectedTroubles((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  return (
    <Modal
      title="Quick wellness check-in"
      subtitle={`After scanning ${resultName}, this helps tailor support suggestions.`}
      width="max-w-[620px]"
      onClose={saving ? () => {} : onClose}
      footer={
        <div className="flex justify-start sm:justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onSkip} disabled={saving}>
            Skip for now
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!canSubmit || saving}
            onClick={() =>
              onSubmit({
                state: selectedState,
                troubles: selectedTroubles,
                note: note.trim(),
              })
            }
          >
            <Sparkle size={13} />
            {saving ? "Saving..." : "Save check-in"}
          </Button>
        </div>
      }
    >
      <div>
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
          {prompt}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={saving}
              onClick={() => setSelectedState(option.id)}
              className={`h-10 px-3 rounded-xl text-[13px] text-left transition ring-1 ${
                selectedState === option.id
                  ? "bg-brand-50 text-brand-700 ring-brand-200"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-4 text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
          Any trouble today? (optional)
        </div>
        <div className="flex flex-wrap gap-2">
          {troubleOptions.map((item) => {
            const selected = selectedTroubles.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                disabled={saving}
                onClick={() => toggleTrouble(item.id)}
                className={`h-8 px-3 rounded-full text-[12px] font-medium transition ring-1 ${
                  selected
                    ? "bg-amber-50 text-amber-700 ring-amber-200"
                    : "bg-slate-50 text-slate-600 ring-slate-200 hover:bg-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mt-4 mb-1.5">
          Optional note
        </label>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          disabled={saving}
          placeholder="Share anything else about your mood, stress, sleep, or motivation."
          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-brand-500 resize-none disabled:opacity-60"
        />
      </div>
    </Modal>
  );
}
