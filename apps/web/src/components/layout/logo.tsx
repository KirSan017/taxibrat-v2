import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
}

const SIZE_MAP = {
  sm: { width: 120, height: 40 },
  md: { width: 150, height: 50 },
  lg: { width: 180, height: 60 },
};

export function Logo({
  className = "",
  href = "/",
  size = "md",
}: LogoProps) {
  const { width, height } = SIZE_MAP[size];
  return (
    <Link href={href} className={`inline-flex items-center ${className}`}>
      <Image
        src="/figma/logo.png"
        alt="Таксибрат"
        width={width}
        height={height}
        priority
        style={{ width: "auto", height: height }}
        className="shrink-0"
      />
    </Link>
  );
}
