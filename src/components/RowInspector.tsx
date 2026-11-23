import { Check, ChevronDown, ChevronRight, Copy, X } from 'lucide-react';
import { useState } from 'react';
import type { Translations } from '../lib/i18n';
import type { IDBRecordRow } from '../types/idb';

interface RowInspectorProps {
  row: IDBRecordRow | null;
  onClose: () => void;
  t: Translations;
}

interface JsonNodeProps {
  label: string;
  value: unknown;
  path: string;
  depth?: number;
  copyPathTitle: (path: string) => string;
  onCopyPath: (text: string) => void;
}

function JsonNode({ label, value, path, depth = 0, copyPathTitle, onCopyPath }: JsonNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isObj = value !== null && typeof value === 'object';

  if (!isObj) {
    const isNull = value === null || value === undefined;
    const isBool = typeof value === 'boolean';
    const isNum = typeof value === 'number';

    return (
      <div className="flex items-start justify-between gap-3 py-1 px-2 rounded hover:bg-[#161F30] group text-xs font-mono">
        <div className="min-w-0 break-all">
          <span className="text-[#94A3B8]">{label}: </span>
          <span
            className={
              isNull
                ? 'text-[#64748B] italic'
                : isBool
                  ? value
                    ? 'text-[#4ADE80]'
                    : 'text-[#F87171]'
                  : isNum
                    ? 'text-[#38BDF8] tabular-nums'
                    : 'text-[#F3F4F6]'
            }
          >
            {isNull ? String(value) : typeof value === 'string' ? `"${value}"` : String(value)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onCopyPath(path)}
          title={copyPathTitle(path)}
          className="opacity-0 group-hover:opacity-100 text-[10px] text-[#64748B] hover:text-[#38BDF8] shrink-0 cursor-pointer"
        >
          path
        </button>
      </div>
    );
  }

  const entries = Array.isArray(value)
    ? value.map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(value as Record<string, unknown>);

  return (
    <div className="text-xs font-mono">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-1.5 py-1 px-2 rounded hover:bg-[#161F30] text-left cursor-pointer"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
        )}
        <span className="text-[#CBD5E1]">{label}</span>
        <span className="text-[#64748B]">
          {Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </button>

      {expanded && (
        <div className="pl-4 border-l border-[#1F2937] ml-3.5 space-y-0.5">
          {entries.map(([k, v]) => (
            <JsonNode
              key={k}
              label={k}
              value={v}
              path={Array.isArray(value) ? `${path}[${k}]` : `${path}.${k}`}
              depth={depth + 1}
              copyPathTitle={copyPathTitle}
              onCopyPath={onCopyPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function RowInspector({ row, onClose, t }: RowInspectorProps) {
  const [mode, setMode] = useState<'tree' | 'raw'>('tree');
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);

  if (!row) return null;

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsg(label);
      setTimeout(() => setCopiedMsg(null), 1600);
    } catch {
      // Ignore clipboard failure in restricted contexts
    }
  };

  return (
    <aside className="w-[380px] shrink-0 bg-[#111827] border-l border-[#1F2937] flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1F2937] flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#F3F4F6]">{t.inspectorTitle}</span>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-[#0B0F17] p-0.5 rounded border border-[#1F2937]">
            <button
              type="button"
              onClick={() => setMode('tree')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                mode === 'tree' ? 'bg-[#161F30] text-[#F3F4F6]' : 'text-[#94A3B8] hover:text-[#F3F4F6]'
              }`}
            >
              {t.treeView}
            </button>
            <button
              type="button"
              onClick={() => setMode('raw')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                mode === 'raw' ? 'bg-[#161F30] text-[#F3F4F6]' : 'text-[#94A3B8] hover:text-[#F3F4F6]'
              }`}
            >
              {t.rawJson}
            </button>
          </div>
          <button
            type="button"
            onClick={() => copyText(JSON.stringify(row, null, 2), t.jsonCopied)}
            title={t.copyAllJsonTitle}
            className="p-1.5 rounded text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-[#161F30] cursor-pointer"
          >
            {copiedMsg === t.jsonCopied ? (
              <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeInspectorAria}
            className="p-1.5 rounded text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-[#161F30] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {copiedMsg && (
        <div className="px-4 py-1.5 bg-[#0E131F] border-b border-[#1F2937] text-[11px] font-mono text-[#4ADE80]">
          {copiedMsg}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {mode === 'tree' ? (
          <div className="space-y-0.5">
            {Object.entries(row).map(([k, v]) => (
              <JsonNode
                key={k}
                label={k}
                value={v}
                path={k}
                copyPathTitle={t.copyPathTitle}
                onCopyPath={(p) => copyText(p, t.pathCopied(p))}
              />
            ))}
          </div>
        ) : (
          <pre className="p-3 bg-[#0B0F17] border border-[#1F2937] rounded-md text-xs font-mono text-[#E2E8F0] overflow-x-auto leading-relaxed">
            {JSON.stringify(row, null, 2)}
          </pre>
        )}
      </div>
    </aside>
  );
}
