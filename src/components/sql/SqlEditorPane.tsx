import { useRef, useState } from 'react';
import type { Translations } from '../../lib/i18n';
import {
  getSqlSuggestions,
  type FieldDescriptor,
  type SqlSuggestion,
  type SuggestionKind,
  type TokenRange,
} from '../../lib/sqlAutocomplete';

interface SqlEditorPaneProps {
  sqlText: string;
  onChangeSql: (sql: string) => void;
  onExecuteSql: (sql: string) => void;
  storeNames: string[];
  activeFields: FieldDescriptor[];
  t: Translations;
}

const KIND_STYLES: Record<SuggestionKind, { tag: string; color: string }> = {
  table: { tag: 'tbl', color: 'text-[#38BDF8]' },
  column: { tag: 'col', color: 'text-[#4ADE80]' },
  function: { tag: 'fn', color: 'text-[#F59E0B]' },
  keyword: { tag: 'kw', color: 'text-[#94A3B8]' },
};

export function SqlEditorPane({
  sqlText,
  onChangeSql,
  onExecuteSql,
  storeNames,
  activeFields,
  t,
}: SqlEditorPaneProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [suggestions, setSuggestions] = useState<SqlSuggestion[]>([]);
  const [tokenRange, setTokenRange] = useState<TokenRange | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number }>({ top: 36, left: 60 });

  const lineCount = Math.max(5, sqlText.split('\n').length);

  const computePopupCoords = (text: string, cursorPos: number) => {
    const ta = textareaRef.current;
    const before = text.slice(0, cursorPos);
    const lines = before.split('\n');
    const rowIdx = lines.length - 1;
    const colIdx = lines[lines.length - 1].length;

    const rawLeft = 60 + colIdx * 7.8 - (ta?.scrollLeft || 0);
    const rawTop = 12 + (rowIdx + 1) * 24 - (ta?.scrollTop || 0);
    const maxLeft = Math.max(60, (ta?.clientWidth || 500) - 240);

    return {
      top: Math.max(28, Math.min(rawTop, 185)),
      left: Math.max(48, Math.min(rawLeft, maxLeft)),
    };
  };

  const refreshAutocomplete = (nextSql: string, cursorPos: number, manual = false) => {
    const { range, items } = getSqlSuggestions(nextSql, cursorPos, storeNames, activeFields, manual);
    setSuggestions(items);
    setTokenRange(items.length > 0 ? range : null);
    setActiveIndex(0);
    if (items.length > 0) setPopupPos(computePopupCoords(nextSql, cursorPos));
  };

  const closeAutocomplete = () => {
    setSuggestions([]);
    setTokenRange(null);
    setActiveIndex(0);
  };

  const applySuggestion = (suggestion: SqlSuggestion) => {
    if (!tokenRange) return;
    const before = sqlText.slice(0, tokenRange.start);
    const after = sqlText.slice(tokenRange.end);
    const nextSql = `${before}${suggestion.insertText}${after}`;
    const nextCursor =
      tokenRange.start + suggestion.insertText.length + (suggestion.cursorOffset ?? 0);

    onChangeSql(nextSql);
    closeAutocomplete();

    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(nextCursor, nextCursor);
      }
    });
  };

  return (
    <div className="relative flex-1 flex bg-[#0B0F17]">
      <div
        aria-hidden="true"
        className="w-11 py-3 pr-2.5 bg-[#0E131F] border-r border-[#1F2937]/70 text-right font-mono text-xs leading-6 text-[#475569] select-none shrink-0 overflow-hidden"
      >
        {Array.from({ length: lineCount }).map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        value={sqlText}
        onChange={(e) => {
          const val = e.target.value;
          const pos = e.target.selectionStart ?? val.length;
          onChangeSql(val);
          refreshAutocomplete(val, pos, false);
        }}
        onBlur={() => setTimeout(() => closeAutocomplete(), 120)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            closeAutocomplete();
            onExecuteSql(sqlText);
            return;
          }
          if (e.ctrlKey && e.code === 'Space') {
            e.preventDefault();
            refreshAutocomplete(sqlText, e.currentTarget.selectionStart ?? sqlText.length, true);
            return;
          }
          if (suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIndex((idx) => (idx + 1) % suggestions.length);
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex((idx) => (idx - 1 + suggestions.length) % suggestions.length);
              return;
            }
            if (e.key === 'Tab' || e.key === 'Enter') {
              e.preventDefault();
              const chosen = suggestions[activeIndex];
              if (chosen) applySuggestion(chosen);
              return;
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              closeAutocomplete();
            }
          }
        }}
        spellCheck={false}
        autoComplete="off"
        aria-label="SQL Query Editor"
        placeholder={t.sqlPlaceholder}
        className="sql-editor flex-1 w-full bg-[#0B0F17] text-[#F3F4F6] placeholder-[#475569] px-4 py-3 text-[13px] leading-6 resize-none focus:outline-none"
      />

      {suggestions.length > 0 && (
        <div
          role="listbox"
          aria-label="SQL Autocomplete"
          style={{ top: popupPos.top, left: popupPos.left }}
          className="absolute z-40 w-72 max-h-56 overflow-y-auto bg-[#111827] border border-[#334155] rounded-md shadow-2xl py-1"
        >
          {suggestions.map((item, idx) => {
            const isActive = idx === activeIndex;
            const meta = KIND_STYLES[item.kind];
            return (
              <button
                key={`${item.kind}-${item.label}`}
                type="button"
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySuggestion(item);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`w-full px-2.5 py-1.5 flex items-center justify-between gap-2 text-left text-xs font-mono transition-colors cursor-pointer ${
                  isActive ? 'bg-[#1E293B] text-[#F8FAFC]' : 'text-[#CBD5E1] hover:bg-[#161F30]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-6 text-[10px] shrink-0 ${meta.color}`}>{meta.tag}</span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.detail && <span className="text-[10px] text-[#64748B] shrink-0">{item.detail}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
