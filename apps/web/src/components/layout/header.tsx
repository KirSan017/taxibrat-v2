"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "../ui/button";
import { AuthModal } from "../auth/auth-modal";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <header className="w-full border-b border-[#E5E5E5]">
        <div className="max-w-[1600px] mx-auto px-6 h-[72px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-medium text-[#303030]">Таксибрат</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-[#303030] hover:text-[#A1A1A1] transition-colors">
              Главная
            </Link>
            <Link href="/parks" className="text-sm font-medium text-[#303030] hover:text-[#A1A1A1] transition-colors">
              Таксопарки
            </Link>
            <Link href="/no9" className="text-sm font-medium text-[#303030] hover:text-[#A1A1A1] transition-colors">
              По делам, без 9%
            </Link>
            <Link href="/buyout" className="text-sm font-medium text-[#303030] hover:text-[#A1A1A1] transition-colors">
              Выкуп
            </Link>
          </nav>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setAuthOpen(true)}>
              Войти
            </Button>
            <Button size="sm" onClick={() => setAuthOpen(true)}>
              Регистрация
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#303030" strokeWidth="2">
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E5E5E5] bg-white">
            <nav className="flex flex-col p-4 gap-4">
              <Link href="/" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Главная</Link>
              <Link href="/parks" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Таксопарки</Link>
              <Link href="/no9" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>По делам, без 9%</Link>
              <Link href="/buyout" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Выкуп</Link>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { setMobileMenuOpen(false); setAuthOpen(true); }}>Войти</Button>
                <Button size="sm" className="flex-1" onClick={() => { setMobileMenuOpen(false); setAuthOpen(true); }}>Регистрация</Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
