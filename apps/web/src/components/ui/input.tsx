import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#303030] mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full h-[49px] px-4 border rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none transition-colors
            ${error ? "border-[#FA6868]" : "border-[#E5E5E5] focus:border-[#303030]"}
            ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-[10px] text-[#FA6868]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
