interface BadgeProps {
  children: React.ReactNode;
  variant?: "yellow" | "gray" | "red" | "green";
  className?: string;
}

export function Badge({ children, variant = "yellow", className = "" }: BadgeProps) {
  const variants = {
    yellow: "bg-[#F8D62E] text-[#303030]",
    gray: "bg-gray-100 text-[#A1A1A1]",
    red: "bg-[#FA6868]/10 text-[#FA6868]",
    green: "bg-green-100 text-green-700",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
