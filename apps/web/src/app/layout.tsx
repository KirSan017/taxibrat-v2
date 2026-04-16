import type { Metadata } from "next";
import { Onest } from "next/font/google";
import "./globals.css";

const onest = Onest({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-onest",
});

export const metadata: Metadata = {
  title: "ТаксиБрат — честный рейтинг таксопарков",
  description: "Подбор таксопарков для сотрудничества с независимым рейтингом",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={onest.variable}>
      <body className="min-h-screen bg-white text-[#303030] font-[family-name:var(--font-onest)] antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}
