import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const SIZE_MAP = {
  sm: { icon: 32, textClass: "text-lg" },
  md: { icon: 40, textClass: "text-xl md:text-2xl" },
  lg: { icon: 48, textClass: "text-2xl md:text-3xl" },
};

export function Logo({
  className = "",
  href = "/",
  size = "md",
  showText = true,
}: LogoProps) {
  const { icon, textClass } = SIZE_MAP[size];
  return (
    <Link href={href} className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/figma/logo.svg"
        alt="Таксибрат"
        width={icon}
        height={icon}
        priority
        className="shrink-0"
        style={{ width: icon, height: icon }}
      />
      {showText && (
        <span className={`${textClass} font-medium text-[#303030] leading-none`}>
          Таксибрат
        </span>
      )}
    </Link>
  );
}
