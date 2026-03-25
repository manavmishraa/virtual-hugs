import { type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  className = "",
  id,
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm text-text-secondary font-medium">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`
          w-full rounded-[12px] border border-surface-border bg-surface
          px-4 py-3 text-text-primary placeholder:text-text-secondary/50
          focus:outline-none focus:ring-2 focus:ring-powder-blue focus:border-transparent
          transition-all duration-200
          ${error ? "border-destructive" : ""}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
