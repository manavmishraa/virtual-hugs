"use client";

import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "destructive";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-powder-blue text-text-primary hover:bg-powder-blue-hover active:bg-powder-blue-pressed",
  secondary:
    "bg-transparent border border-powder-blue text-powder-blue hover:bg-powder-blue-10",
  destructive:
    "bg-destructive text-white hover:opacity-90 active:opacity-80",
};

export default function Button({
  variant = "primary",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        rounded-[12px] px-6 py-3 text-base font-medium
        transition-all duration-200 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed
        min-h-[48px] cursor-pointer
        ${variantStyles[variant]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
