"use client";

import { useState } from "react";
import { HUG_CONFIG, type HugType } from "@/lib/types";

interface HugTypeSelectorProps {
  onSelect: (type: HugType) => void;
  disabled?: boolean;
  defaultType?: HugType;
}

const hugIcons: Record<HugType, React.ReactNode> = {
  warm: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <circle cx="16" cy="12" r="4" />
      <path d="M8 26c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      <path d="M12 18s-2 1-4 4" />
      <path d="M20 18s2 1 4 4" />
    </svg>
  ),
  tight: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <circle cx="11" cy="10" r="3" />
      <circle cx="21" cy="10" r="3" />
      <path d="M6 26c0-3.3 2.2-6 5-6c1.5 0 2.8.7 3.7 1.7" />
      <path d="M26 26c0-3.3-2.2-6-5-6c-1.5 0-2.8.7-3.7 1.7" />
      <path d="M14 20s1 2 2 2 2-2 2-2" />
    </svg>
  ),
  nudge: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M16 6v4" />
      <path d="M22 8l-2 3" />
      <path d="M10 8l2 3" />
      <circle cx="16" cy="18" r="6" />
      <path d="M14 17l2 2 2-2" />
    </svg>
  ),
};

export default function HugTypeSelector({ onSelect, disabled, defaultType }: HugTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<HugType | null>(defaultType || null);
  const [sentType, setSentType] = useState<HugType | null>(null);

  function handleSelect(type: HugType) {
    setSelectedType(type);
  }

  function handleSend() {
    if (!selectedType) return;
    setSentType(selectedType);
    onSelect(selectedType);
    // Reset sent animation after 2s
    setTimeout(() => setSentType(null), 2000);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(HUG_CONFIG) as [HugType, typeof HUG_CONFIG[HugType]][]).map(
          ([type, config]) => {
            const isSelected = selectedType === type;
            const wasSent = sentType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleSelect(type)}
                disabled={disabled}
                className={`
                  flex flex-col items-center gap-2 p-4
                  rounded-[14px] border bg-surface
                  active:scale-95
                  transition-all duration-200 cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    isSelected
                      ? "border-powder-blue ring-2 ring-powder-blue/30 bg-powder-blue-10"
                      : "border-surface-border hover:border-powder-blue hover:bg-powder-blue-10"
                  }
                  ${wasSent ? "scale-95" : ""}
                `}
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-300 ${
                    isSelected ? "scale-110" : ""
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
                  }}
                >
                  <span className="text-white">{hugIcons[type]}</span>
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {config.label}
                </span>
                <span className="text-xs text-text-secondary leading-tight text-center">
                  {config.description}
                </span>
                {isSelected && (
                  <span className="text-xs text-powder-blue-hover font-medium">Selected</span>
                )}
              </button>
            );
          }
        )}
      </div>

      {/* Send button */}
      <button
        type="button"
        onClick={handleSend}
        disabled={!selectedType || disabled}
        className={`
          w-full py-3.5 rounded-[14px] text-sm font-medium
          transition-all duration-200 cursor-pointer
          ${
            selectedType
              ? "text-text-primary hover:opacity-90 active:scale-[0.98]"
              : "bg-surface-border text-text-secondary cursor-not-allowed"
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        style={
          selectedType
            ? {
                background: `linear-gradient(135deg, ${HUG_CONFIG[selectedType].gradient[0]}, ${HUG_CONFIG[selectedType].gradient[1]})`,
                color: "#FFFFFF",
              }
            : undefined
        }
      >
        {sentType
          ? "Sent!"
          : selectedType
          ? `Send ${HUG_CONFIG[selectedType].label}`
          : "Select a hug type"}
      </button>
    </div>
  );
}
