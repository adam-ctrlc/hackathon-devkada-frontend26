import { useState } from "react";
import { Lock, Check, Key, ArrowLeft } from "@phosphor-icons/react";
import { Button } from "../../../../components/ui/Button.jsx";
import { Field, Input } from "../../../../components/ui/Input.jsx";
import { Modal } from "../../../../components/ui/Modal.jsx";
import { formatApiError, getApiFieldError } from "../../../../lib/api.js";

export function DiaryLockModal({
  mode,
  loading,
  error,
  onCreate,
  onUnlock,
  onReset,
  onCancel,
}) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPin, setResetPin] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [flow, setFlow] = useState("pin");
  const isCreate = mode === "create";
  const isReset = !isCreate && flow === "reset";
  const pinFieldError = getApiFieldError(error, "pin");
  const passwordFieldError = getApiFieldError(error, "password");
  const displayError =
    typeof error === "string"
      ? error
      : error
        ? formatApiError(error, "Request failed")
        : null;
  const pinReady = pin.trim().length >= 4;
  const resetReady =
    resetPassword.trim().length > 0 &&
    resetPin.trim().length >= 4 &&
    resetPin.trim() === resetConfirm.trim();
  const canSubmit = isReset
    ? resetReady
    : isCreate
      ? pinReady && pin.trim() === confirm.trim()
      : pinReady;

  const submit = () => {
    if (!canSubmit || loading) return;
    if (isReset) {
      onReset({
        password: resetPassword,
        pin: resetPin.trim(),
      });
      return;
    }
    if (isCreate) {
      onCreate(pin.trim());
      return;
    }
    onUnlock(pin.trim());
  };

  return (
    <Modal
      title={
        isReset
          ? "Reset diary PIN"
          : isCreate
            ? "Create diary PIN"
            : "Unlock AI Diary"
      }
      subtitle={
        isReset
          ? "Use your account password to set a new diary PIN."
          : isCreate
            ? "Set a PIN before writing private diary entries."
            : "Enter your PIN to view your private diary."
      }
      width="max-w-[380px]"
      onClose={loading ? () => {} : onCancel}
      footer={
        <div className="flex justify-start sm:justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={submit}
            disabled={!canSubmit || loading}
          >
            {loading ? (
              isReset ? (
                "Resetting..."
              ) : (
                "Checking..."
              )
            ) : (
              <>
                {isReset ? (
                  <Key size={13} />
                ) : isCreate ? (
                  <Check size={13} />
                ) : (
                  <Lock size={13} />
                )}
                {isReset ? "Reset PIN" : isCreate ? "Create PIN" : "Unlock"}
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {isReset ? (
          <>
            <button
              type="button"
              onClick={() => {
                if (!loading) setFlow("pin");
              }}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-brand-700"
              disabled={loading}
            >
              <ArrowLeft size={12} /> Back to unlock
            </button>
            <Field label="Account password">
              <Input
                type="password"
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit();
                }}
                placeholder="Enter your password"
                disabled={loading}
                autoFocus
              />
            </Field>
            {passwordFieldError && (
              <p className="text-[12px] text-red-600">{passwordFieldError}</p>
            )}
            <Field label="New PIN (min 4 digits)">
              <Input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={resetPin}
                onChange={(event) => setResetPin(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit();
                }}
                placeholder="••••"
                disabled={loading}
              />
            </Field>
            {pinFieldError && (
              <p className="text-[12px] text-red-600">{pinFieldError}</p>
            )}
            <Field label="Confirm new PIN">
              <Input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={resetConfirm}
                onChange={(event) => setResetConfirm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit();
                }}
                placeholder="••••"
                disabled={loading}
              />
            </Field>
          </>
        ) : (
          <Field label={isCreate ? "New PIN (min 4 digits)" : "Diary PIN"}>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
              placeholder="••••"
              disabled={loading}
              autoFocus
            />
          </Field>
        )}
        {isCreate && (
          <Field label="Confirm PIN">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
              placeholder="••••"
              disabled={loading}
            />
          </Field>
        )}
        {isCreate &&
          pin.trim() &&
          confirm.trim() &&
          pin.trim() !== confirm.trim() && (
            <p className="text-[12px] text-red-600">PINs don't match.</p>
          )}
        {isReset &&
          resetPin.trim() &&
          resetConfirm.trim() &&
          resetPin.trim() !== resetConfirm.trim() && (
            <p className="text-[12px] text-red-600">PINs don't match.</p>
          )}
        {!isCreate && !isReset && (
          <button
            type="button"
            onClick={() => setFlow("reset")}
            disabled={loading}
            className="text-[12px] font-medium text-brand-700 hover:text-brand-800 disabled:opacity-60"
          >
            Forgot PIN?
          </button>
        )}
        {displayError && (
          <p className="text-[12px] text-red-600">{displayError}</p>
        )}
      </div>
    </Modal>
  );
}
