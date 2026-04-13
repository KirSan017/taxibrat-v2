import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ru">
      <body className="min-h-screen bg-[#F3F1E7] text-[#1A1A1A] antialiased">
        {children}
      </body>
    </html>
  );
}
