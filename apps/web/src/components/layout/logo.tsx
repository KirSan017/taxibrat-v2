"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface LogoProps {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg" | "home";
  variant?: "auto" | "light" | "dark";
}

const SIZE_MAP = {
  sm: { icon: 36, text: "text-[18px]" },
  md: { icon: 44, text: "text-[22px] md:text-[24px]" },
  lg: { icon: 56, text: "text-[28px]" },
  home: { icon: 46, text: "text-[19.6px]" },
};

export function Logo({
  className = "",
  href = "/",
  size = "md",
  variant = "auto",
}: LogoProps) {
  const { icon, text } = SIZE_MAP[size];
  const pathname = usePathname();

  // Auto: detect dark header pages (home has dark hero)
  const isDarkHeader = variant === "dark" || (variant === "auto" && pathname === "/");
  const textColor = isDarkHeader ? "text-[#F8D62E]" : "text-[#1F1F1F]";

  return (
    <Link href={href} className={`inline-flex items-center gap-[10px] ${className}`}>
      <Image
        src="/figma/logo-icon.png"
        alt=""
        width={icon}
        height={icon}
        priority
        style={{ width: icon, height: icon }}
        className="shrink-0"
      />
      <span className={`${text} font-semibold leading-none tracking-[-0.01em] ${textColor}`}>
        Таксибрат
      </span>
    </Link>
  );
}
