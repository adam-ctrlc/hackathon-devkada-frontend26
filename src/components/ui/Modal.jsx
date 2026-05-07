import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";

/**
 * Modal — backdrop + centered panel.
 *
 * Props:
 *   onClose   () => void          — called on backdrop click or close button
 *   title     string (optional)   — header title
 *   subtitle  string (optional)   — small text below title
 *   width     string (optional)   — max-width class, default 'max-w-[480px]'
 *   noPadding bool (optional)     — skip default px-6 py-5 padding on body
 *   children  ReactNode
 *   footer    ReactNode (optional) — rendered in a border-t footer strip
 */
export function Modal({
  onClose,
  title,
  subtitle,
  width = "max-w-[480px]",
  noPadding = false,
  children,
  footer,
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl ring-1 ring-slate-200 w-full ${width} max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {title != null && (
          <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-[20px] text-slate-900 leading-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-[12px] text-slate-500 mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 grid place-items-center text-slate-500 hover:bg-slate-200 transition shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className={`${noPadding ? "" : "px-6 py-5"} overflow-y-auto`}>
          {children}
        </div>

        {footer && (
          <div className="px-6 py-4 border-t border-slate-200 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
