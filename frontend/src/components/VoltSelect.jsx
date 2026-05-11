// Reusable yellow dropdown for Smart Control filters and form selects.
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function VoltSelect({
  value,
  onChange,
  options,
  ariaLabel,
  title,
  className = "",
  buttonClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        title={title}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-10 w-full items-center justify-between rounded-xl border border-[var(--volt-yellow-border)] bg-black/55 px-3 pr-9 text-left text-sm font-bold text-white outline-none transition-colors hover:border-[var(--volt-yellow)] focus:border-[var(--volt-yellow)] ${buttonClassName}`}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown
          size={16}
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-[var(--volt-yellow)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-xl border border-[var(--volt-yellow-border)] bg-zinc-950 shadow-[0_18px_40px_rgba(0,0,0,0.48)]">
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold transition-colors ${
                  selected
                    ? "bg-[var(--volt-yellow)] text-black"
                    : "text-white hover:bg-[var(--volt-yellow-soft)] hover:text-[var(--volt-yellow)]"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {option.meta ? (
                  <span className={selected ? "text-xs text-black/70" : "text-xs text-zinc-500"}>
                    {option.meta}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
