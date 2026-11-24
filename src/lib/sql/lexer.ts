export type TokenType =
  | 'KEYWORD'
  | 'IDENT'
  | 'STRING'
  | 'NUMBER'
  | 'OP'
  | 'COMMA'
  | 'LPAREN'
  | 'RPAREN'
  | 'STAR'
  | 'SEMICOLON'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const KEYWORDS = new Set([
  'SELECT',
  'DELETE',
  'DISTINCT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'NOT',
  'IS',
  'NULL',
  'IN',
  'LIKE',
  'ILIKE',
  'BETWEEN',
  'ORDER',
  'BY',
  'ASC',
  'DESC',
  'LIMIT',
  'OFFSET',
  'GROUP',
  'AS',
  'TRUE',
  'FALSE',
  'SHOW',
  'TABLES',
  'STORES',
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
]);

export const AGG_FUNCS = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']);

export class SqlSyntaxError extends Error {
  position: number;
  constructor(message: string, position = 0) {
    super(message);
    this.name = 'SqlSyntaxError';
    this.position = position;
  }
}

export function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = sql.length;

  while (i < len) {
    const ch = sql[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === '-' && sql[i + 1] === '-') {
      i += 2;
      while (i < len && sql[i] !== '\n') i++;
      continue;
    }

    if (ch === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < len && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    if (ch === "'") {
      const start = i;
      i++;
      let str = '';
      while (i < len) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          str += "'";
          i += 2;
        } else if (sql[i] === '\\' && i + 1 < len) {
          str += sql[i + 1];
          i += 2;
        } else if (sql[i] === "'") {
          i++;
          break;
        } else {
          str += sql[i++];
        }
      }
      tokens.push({ type: 'STRING', value: str, pos: start });
      continue;
    }

    if (ch === '`' || ch === '"') {
      const quote = ch;
      const start = i;
      i++;
      let ident = '';
      while (i < len && sql[i] !== quote) ident += sql[i++];
      if (i >= len) {
        throw new SqlSyntaxError(`Unclosed identifier quote ${quote}.`, start);
      }
      i++;
      tokens.push({ type: 'IDENT', value: ident, pos: start });
      continue;
    }

    if (/[0-9]/.test(ch)) {
      const start = i;
      let num = '';
      while (i < len && /[0-9.]/.test(sql[i])) num += sql[i++];
      tokens.push({ type: 'NUMBER', value: num, pos: start });
      continue;
    }

    const two = sql.slice(i, i + 2);
    if (two === '!=' || two === '<>' || two === '>=' || two === '<=') {
      tokens.push({ type: 'OP', value: two, pos: i });
      i += 2;
      continue;
    }

    if (ch === '=' || ch === '>' || ch === '<') {
      tokens.push({ type: 'OP', value: ch, pos: i++ });
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',', pos: i++ });
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(', pos: i++ });
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')', pos: i++ });
      continue;
    }
    if (ch === '*') {
      tokens.push({ type: 'STAR', value: '*', pos: i++ });
      continue;
    }
    if (ch === ';') {
      tokens.push({ type: 'SEMICOLON', value: ';', pos: i++ });
      continue;
    }

    if (/[A-Za-z_$]/.test(ch)) {
      const start = i;
      let word = '';
      while (i < len && /[A-Za-z0-9_$.]/.test(sql[i])) word += sql[i++];
      const upper = word.toUpperCase();
      if (!word.includes('.') && KEYWORDS.has(upper)) {
        tokens.push({ type: 'KEYWORD', value: upper, pos: start });
      } else {
        tokens.push({ type: 'IDENT', value: word, pos: start });
      }
      continue;
    }

    if (ch === '-' && /[0-9]/.test(sql[i + 1] || '')) {
      const start = i;
      let num = '-';
      i++;
      while (i < len && /[0-9.]/.test(sql[i])) num += sql[i++];
      tokens.push({ type: 'NUMBER', value: num, pos: start });
      continue;
    }

    throw new SqlSyntaxError(`Unexpected character "${ch}" at position ${i + 1}.`, i);
  }

  tokens.push({ type: 'EOF', value: '', pos: len });
  return tokens;
}
