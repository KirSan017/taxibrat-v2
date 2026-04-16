import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", children, ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary: "bg-[#303030] text-white hover:bg-[#404040]",
      outline: "border border-[#303030] text-[#303030] hover:bg-[#303030] hover:text-white",
      ghost: "text-[#303030] hover:bg-gray-100",
    };

    const sizes = {
      sm: "h-[42px] px-5 text-sm",
      md: "h-[49px] px-8 text-sm",
      lg: "h-[56px] px-10 text-base",
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
