/* ── Admin design system constants ────────────────────────
 * Shared className constants for the admin panel.
 * Based on the Figma design (file wcCCZPRNFfIs6XoCxFZcOu).
 * ─────────────────────────────────────────────────────── */

// ── containers / cards ──────────────────────────────
export const ADMIN_CARD =
  "bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EFEFEF]";

export const ADMIN_CARD_HOVER =
  "bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EFEFEF] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-[#E5E5E5] transition-all";

// ── tables ──────────────────────────────────────────
export const ADMIN_TABLE_HEADER =
  "text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider px-5 py-3 bg-[#FAFAFA] text-left";

export const ADMIN_TABLE_CELL = "px-5 py-4 text-sm text-[#303030] align-middle";

export const ADMIN_TABLE_ROW =
  "border-b border-[#F2F2F2] last:border-b-0 hover:bg-[#FAFAFA] transition-colors";

// ── buttons ─────────────────────────────────────────
export const ADMIN_PRIMARY_BTN =
  "inline-flex items-center justify-center gap-2 h-[44px] px-6 rounded-[10px] bg-[#F8D62E] text-[#1F1F1F] text-sm font-medium hover:bg-[#F8D62E]/90 active:bg-[#E5C42A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const ADMIN_OUTLINE_BTN =
  "inline-flex items-center justify-center gap-2 h-[44px] px-6 rounded-[10px] border border-[#E5E5E5] bg-white text-[#1F1F1F] text-sm font-medium hover:bg-[#F5F5F5] active:bg-[#EFEFEF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const ADMIN_DANGER_BTN =
  "inline-flex items-center justify-center gap-2 h-[44px] px-6 rounded-[10px] bg-[#FA6868] text-white text-sm font-medium hover:bg-[#E85555] active:bg-[#D84444] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const ADMIN_GHOST_BTN =
  "inline-flex items-center justify-center gap-2 h-[36px] px-3 rounded-[8px] text-sm text-[#303030] hover:bg-[#F5F5F5] transition-colors";

// ── inputs ──────────────────────────────────────────
export const ADMIN_INPUT =
  "w-full h-[44px] px-4 rounded-[10px] border border-[#E5E5E5] bg-white text-sm text-[#303030] placeholder:text-[#A1A1A1] focus:border-[#F8D62E] focus:outline-none transition-colors";

export const ADMIN_TEXTAREA =
  "w-full px-4 py-3 rounded-[10px] border border-[#E5E5E5] bg-white text-sm text-[#303030] placeholder:text-[#A1A1A1] focus:border-[#F8D62E] focus:outline-none transition-colors resize-vertical min-h-[100px]";

export const ADMIN_SELECT =
  "w-full h-[44px] px-4 pr-10 rounded-[10px] border border-[#E5E5E5] bg-white text-sm text-[#303030] focus:border-[#F8D62E] focus:outline-none transition-colors appearance-none bg-[url('data:image/svg+xml;utf8,<svg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23A1A1A1%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_14px_center]";

export const ADMIN_LABEL =
  "block text-xs font-medium text-[#A1A1A1] uppercase tracking-wider mb-2";

// ── headings ────────────────────────────────────────
export const ADMIN_PAGE_TITLE =
  "text-[28px] font-semibold text-[#1F1F1F] tracking-tight leading-[1.15]";

export const ADMIN_PAGE_SUBTITLE = "text-sm text-[#A1A1A1] mt-1.5";

export const ADMIN_SECTION_TITLE = "text-[18px] font-semibold text-[#1F1F1F]";

export const ADMIN_BLOCK_TITLE = "text-sm font-semibold text-[#1F1F1F]";

// ── filter pills ────────────────────────────────────
export const ADMIN_PILL_BASE =
  "inline-flex items-center gap-1.5 h-[36px] px-4 rounded-full text-sm font-medium transition-colors whitespace-nowrap";

export const ADMIN_PILL_ACTIVE =
  "bg-[#1F1F1F] text-white";

export const ADMIN_PILL_INACTIVE =
  "bg-white border border-[#E5E5E5] text-[#1F1F1F] hover:bg-[#F5F5F5]";

// ── status badges (rounded pills with topic-specific colors) ──
export const STATUS_BADGE_BASE =
  "inline-flex items-center gap-1.5 px-3 h-[26px] rounded-full text-xs font-medium whitespace-nowrap";

export const STATUS_BADGE_GREEN =
  "bg-[#E8F7EE] text-[#3BB560]";

export const STATUS_BADGE_YELLOW =
  "bg-[#FEF7DA] text-[#9A7C00]";

export const STATUS_BADGE_RED =
  "bg-[#FDE8E8] text-[#FA6868]";

export const STATUS_BADGE_GREY =
  "bg-[#F2F2F2] text-[#A1A1A1]";

export const STATUS_BADGE_BLUE =
  "bg-[#E8F0FE] text-[#3D7BD9]";

export const STATUS_BADGE_DARK =
  "bg-[#1F1F1F] text-white";

// ── KPI / stat cards ────────────────────────────────
export const ADMIN_KPI_CARD =
  "bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EFEFEF] p-5 flex flex-col gap-2";

export const ADMIN_KPI_LABEL =
  "text-xs font-medium text-[#A1A1A1] uppercase tracking-wider";

export const ADMIN_KPI_VALUE =
  "text-[32px] font-semibold text-[#1F1F1F] leading-none tracking-tight";

export const ADMIN_KPI_DELTA = "text-xs text-[#3BB560] font-medium";

// ── helpers ─────────────────────────────────────────
export function statusBadgeClass(
  variant: "green" | "yellow" | "red" | "grey" | "blue" | "dark" = "grey",
) {
  const map = {
    green: STATUS_BADGE_GREEN,
    yellow: STATUS_BADGE_YELLOW,
    red: STATUS_BADGE_RED,
    grey: STATUS_BADGE_GREY,
    blue: STATUS_BADGE_BLUE,
    dark: STATUS_BADGE_DARK,
  };
  return `${STATUS_BADGE_BASE} ${map[variant]}`;
}

// ── dot indicator ───────────────────────────────────
export function statusDotClass(
  variant: "green" | "yellow" | "red" | "grey" | "blue" = "grey",
) {
  const map = {
    green: "bg-[#3BB560]",
    yellow: "bg-[#F8D62E]",
    red: "bg-[#FA6868]",
    grey: "bg-[#A1A1A1]",
    blue: "bg-[#3D7BD9]",
  };
  return `inline-block w-2 h-2 rounded-full shrink-0 ${map[variant]}`;
}
