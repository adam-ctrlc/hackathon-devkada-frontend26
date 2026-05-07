import { useEffect, useRef, useState } from "react";
import { Camera as CameraIcon } from "@phosphor-icons/react";
import {
  BrowserMultiFormatReader,
  DecodeHintType,
  BarcodeFormat,
} from "@zxing/library";
import { Modal } from "../../../../components/ui/Modal.jsx";
import { Button } from "../../../../components/ui/Button.jsx";

const buildHints = () => {
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
  return hints;
};

const captureFrameAsFile = async (video) => {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        resolve(
          new File([blob], `barcode-${Date.now()}.jpg`, {
            type: "image/jpeg",
          }),
        );
      },
      "image/jpeg",
      0.9,
    );
  });
};

export default function CameraScanModal({ open, onClose, onDetect }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const detectedRef = useRef(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    detectedRef.current = false;
    setError("");
    setStarting(true);

    const reader = new BrowserMultiFormatReader(buildHints());
    readerRef.current = reader;

    let cancelled = false;

    (async () => {
      try {
        await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          async (result, _err, controls) => {
            if (cancelled || detectedRef.current) return;
            if (!result) return;
            const text = String(result.getText() ?? "").trim();
            if (!text) return;
            detectedRef.current = true;
            controls?.stop();
            const file = await captureFrameAsFile(videoRef.current);
            onDetect({ barcode: text, file });
          },
        );
        if (!cancelled) setStarting(false);
      } catch (err) {
        if (!cancelled) {
          setStarting(false);
          setError(
            err?.name === "NotAllowedError"
              ? "Camera permission denied. Allow camera access and try again."
              : err?.message || "Could not start camera",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        reader.reset();
      } catch {
        // ignore
      }
      readerRef.current = null;
    };
  }, [open, onDetect]);

  if (!open) return null;

  return (
    <Modal
      title="Scan barcode"
      subtitle="Point your camera at a barcode — detection happens automatically."
      width="max-w-[520px]"
      onClose={onClose}
      noPadding
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] text-slate-500 inline-flex items-center gap-1.5">
            <CameraIcon size={14} weight="duotone" className="text-brand-600" />
            Hold steady on the barcode.
          </p>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      }
    >
      <div className="relative aspect-[4/3] bg-slate-900">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[78%] h-[28%] rounded-xl ring-2 ring-white/85 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]" />
        </div>
        {starting && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-white/90 px-3 py-1.5 text-[12px] text-slate-700 ring-1 ring-slate-200 shadow-sm">
              Starting camera…
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-x-4 top-4 rounded-xl bg-red-50 ring-1 ring-red-100 px-3 py-2 text-[12.5px] text-red-700 leading-snug">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
