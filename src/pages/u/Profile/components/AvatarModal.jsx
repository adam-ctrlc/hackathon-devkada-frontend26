import { useState } from "react";
import { Modal } from "../../../../components/ui/Modal.jsx";
import { Button } from "../../../../components/ui/Button.jsx";
import { Check } from "@phosphor-icons/react";

export function AvatarModal({ initials, onClose }) {
  const colors = [
    "bg-brand-600",
    "bg-emerald-600",
    "bg-violet-600",
    "bg-amber-500",
    "bg-rose-500",
    "bg-slate-700",
  ];
  const [picked, setPicked] = useState(0);
  return (
    <Modal
      title="Profile photo"
      width="max-w-[340px]"
      onClose={onClose}
      footer={
        <div className="flex justify-start sm:justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            <Check size={13} /> Done
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className={`w-20 h-20 rounded-full ${colors[picked]} grid place-items-center font-display text-[28px] text-white`}
        >
          {initials}
        </div>
        <div className="flex gap-2">
          {colors.map((c, i) => (
            <button
              key={c}
              onClick={() => setPicked(i)}
              className={`w-8 h-8 rounded-full ${c} transition ${picked === i ? "ring-2 ring-offset-2 ring-brand-500" : "hover:scale-110"}`}
            />
          ))}
        </div>
        <p className="text-[12px] text-slate-500 text-center">
          Photo upload coming soon — pick an avatar colour for now.
        </p>
      </div>
    </Modal>
  );
}
