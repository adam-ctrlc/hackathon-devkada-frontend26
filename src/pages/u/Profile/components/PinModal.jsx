import { useState } from "react";
import { Modal } from "../../../../components/ui/Modal.jsx";
import { Button } from "../../../../components/ui/Button.jsx";
import { Input, Field } from "../../../../components/ui/Input.jsx";
import { Check } from "@phosphor-icons/react";
import { apiRequest, formatApiError } from "../../../../lib/api.js";

export function PinModal({ profileId, diaryLocked, onSaved, onClose }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isUpdating = Boolean(diaryLocked);

  const submit = async () => {
    const normalizedPin = pin.trim();
    if (normalizedPin.length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }
    if (normalizedPin !== confirm.trim()) {
      setError("PINs don't match.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = await apiRequest(`/profiles/${profileId}/diary-lock`, {
        method: isUpdating ? "PUT" : "POST",
        body: { pin: normalizedPin },
        timeoutMs: 10000,
      });
      onSaved(data?.profile ?? null, Boolean(data?.diaryLocked));
      onClose();
    } catch (err) {
      setError(formatApiError(err, "Couldn't save the diary PIN."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isUpdating ? "Change diary PIN" : "Create diary PIN"}
      subtitle={
        isUpdating
          ? "Update the PIN that protects your diary entries."
          : "Set a PIN so your diary stays private."
      }
      width="max-w-[360px]"
      onClose={saving ? () => {} : onClose}
      footer={
        <div className="flex justify-start sm:justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={submit}
            disabled={
              saving || pin.trim().length < 4 || pin.trim() !== confirm.trim()
            }
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <Check size={13} />
                {isUpdating ? "Update PIN" : "Create PIN"}
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label="New PIN (min 4 digits)">
          <Input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            disabled={saving}
          />
        </Field>
        <Field label="Confirm PIN">
          <Input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••"
            disabled={saving}
          />
        </Field>
        {error && <p className="text-[12px] text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
