export function serializeLocalValue(val: unknown, depth = 0): unknown {
  if (depth > 8) return '[Max Depth]';
  if (val === null || val === undefined) return val;
  const t = typeof val;
  if (t === 'string' || t === 'number' || t === 'boolean') return val;
  if (t === 'bigint') return val.toString();
  if (val instanceof Date) return val.toISOString();
  if (val instanceof RegExp) return val.toString();
  if (typeof Blob !== 'undefined' && val instanceof Blob) {
    return {
      __type: val instanceof File ? 'File' : 'Blob',
      name: val instanceof File ? val.name : undefined,
      size: val.size,
      mimeType: val.type || 'application/octet-stream',
    };
  }
  if (val instanceof ArrayBuffer) {
    return { __type: 'ArrayBuffer', byteLength: val.byteLength };
  }
  if (ArrayBuffer.isView(val)) {
    return { __type: val.constructor?.name || 'TypedArray', byteLength: val.byteLength };
  }
  if (val instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of val.entries()) obj[String(k)] = serializeLocalValue(v, depth + 1);
    return obj;
  }
  if (val instanceof Set) {
    return Array.from(val).map((item) => serializeLocalValue(item, depth + 1));
  }
  if (Array.isArray(val)) {
    return val.map((item) => serializeLocalValue(item, depth + 1));
  }
  if (t === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(val as Record<string, unknown>)) {
      out[key] = serializeLocalValue((val as Record<string, unknown>)[key], depth + 1);
    }
    return out;
  }
  return String(val);
}
