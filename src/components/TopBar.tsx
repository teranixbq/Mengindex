import { ChevronDown, Globe, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LANGUAGE_OPTIONS, type Language, type Translations } from '../lib/i18n';
import type { ActiveView } from '../types/idb';

interface TopBarProps {
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  t: Translations;
  isRefreshing: boolean;
  onRefresh: () => void;
}

function MengindexCatMark() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M4.5 9.5L5.5 3.5L10 6.8C10.6 6.6 11.3 6.5 12 6.5C12.7 6.5 13.4 6.6 14 6.8L18.5 3.5L19.5 9.5C20.4 10.7 21 12.2 21 13.8C21 18 17 20.5 12 20.5C7 20.5 3 18 3 13.8C3 12.2 3.6 10.7 4.5 9.5Z"
        stroke="#38BDF8"
        strokeWidth="1.65"
        strokeLinejoin="round"
        fill="#38BDF8"
        fillOpacity="0.1"
      />
      <rect x="8.2" y="12.2" width="2.2" height="2.6" rx="1.1" fill="#38BDF8" />
      <rect x="13.6" y="12.2" width="2.2" height="2.6" rx="1.1" fill="#38BDF8" />
      <path
        d="M11 16.1L12 17L13 16.1"
        stroke="#F8FAFC"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TopBar({
  activeView,
  onChangeView,
  language,
  onChangeLanguage,
  t,
  isRefreshing,
  onRefresh,
}: TopBarProps) {
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!langMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLangMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [langMenuOpen]);

  const navItems: { id: ActiveView; label: string }[] = [
    { id: 'table', label: t.navTableView },
    { id: 'sql', label: t.navSqlQuery },
    { id: 'schema', label: t.navSchema },
  ];

  const currentLang = LANGUAGE_OPTIONS.find((opt) => opt.code === language) || LANGUAGE_OPTIONS[0];

  return (
    <header className="h-12 shrink-0 bg-[#0E131D] border-b border-[#1E293B] px-5 flex items-center justify-between gap-8">
      {/* Zone 1: Brand Wordmark with Geometric Cat Emblem */}
      <button
        type="button"
        onClick={() => onChangeView('table')}
        className="inline-flex items-center gap-2 font-display text-[15px] font-semibold tracking-tight text-[#F8FAFC] hover:text-[#38BDF8] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38BDF8]"
      >
        <MengindexCatMark />
        <span>Mengindex</span>
      </button>

      {/* Zone 2: Clean workspace views */}
      <nav aria-label="Workspace Navigation" className="flex items-center gap-6">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeView(item.id)}
              className={`relative h-12 flex items-center text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#38BDF8] ${
                isActive ? 'text-[#F8FAFC]' : 'text-[#94A3B8] hover:text-[#E2E8F0]'
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#38BDF8]"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Language Switcher + Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Language Dropdown */}
        <div ref={langMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setLangMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={langMenuOpen}
            aria-label={t.switchLanguage}
            title={t.switchLanguage}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono text-[#CBD5E1] bg-[#111827] border border-[#1F2937] hover:border-[#334155] hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38BDF8]"
          >
            <Globe className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span>{currentLang.short}</span>
            <ChevronDown className="w-3 h-3 text-[#64748B]" />
          </button>

          {langMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-1.5 w-44 bg-[#111827] border border-[#1F2937] rounded-md shadow-xl py-1 z-50"
            >
              {LANGUAGE_OPTIONS.map((opt) => {
                const selected = opt.code === language;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => {
                      onChangeLanguage(opt.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#161F30] text-[#38BDF8] font-medium'
                        : 'text-[#CBD5E1] hover:bg-[#161F30] hover:text-[#F8FAFC]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className="font-mono text-[11px] text-[#64748B]">{opt.short}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-[#38BDF8] text-[#090D16] hover:bg-[#7DD3FC] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38BDF8]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? t.syncing : t.refreshTab}
        </button>
      </div>
    </header>
  );
}
