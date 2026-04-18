"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";

interface AddressSuggestion {
  value: string;
  unrestricted_value?: string;
  geoLat?: number | null;
  geoLon?: number | null;
}

interface AddressInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onPick?: (suggestion: AddressSuggestion) => void;
  required?: boolean;
  className?: string;
  error?: string;
  inputClassName?: string;
}

export function AddressInput({
  label,
  placeholder = "Город, улица, дом",
  value,
  onChange,
  onPick,
  required,
  className = "",
  error,
  inputClassName = "",
}: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const fetchSuggestions = (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    api<{ suggestions: AddressSuggestion[] }>(
      `/public/address-suggest?q=${encodeURIComponent(q.trim())}`,
    )
      .then((res) => {
        setSuggestions(Array.isArray(res?.suggestions) ? res.suggestions : []);
        setOpen(true);
        setActiveIdx(-1);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  };

  const handleChange = (v: string) => {
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 250);
  };

  const pick = (s: AddressSuggestion) => {
    onChange(s.value);
    onPick?.(s);
    setSuggestions([]);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(suggestions.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      pick(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-[#303030] mb-1.5">
          {label}
        </label>
      )}
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => value && value.trim().length >= 2 && fetchSuggestions(value)}
        onKeyDown={handleKeyDown}
        required={required}
        autoComplete="off"
        className={`w-full h-[49px] px-4 border rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none transition-colors
          ${error ? "border-[#FA6868]" : "border-[#E5E5E5] focus:border-[#303030]"}
          ${inputClassName}`}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-[#E5E5E5] rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={`${s.value}-${i}`}
              type="button"
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                i === activeIdx ? "bg-[#F3F1E7]" : "hover:bg-gray-50"
              }`}
              onClick={() => pick(s)}
              onMouseEnter={() => setActiveIdx(i)}
            >
              {s.value}
            </button>
          ))}
        </div>
      )}
      {open && !loading && value.trim().length >= 2 && suggestions.length === 0 && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-[#E5E5E5] rounded-lg shadow-sm px-4 py-3 text-xs text-[#A1A1A1]">
          Подсказок нет. Введите адрес вручную.
        </div>
      )}
      {error && <p className="mt-1 text-[10px] text-[#FA6868]">{error}</p>}
    </div>
  );
}
