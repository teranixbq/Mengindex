import { AGG_FUNCS, SqlSyntaxError, tokenize, type Token } from './lexer';

export type SelectItem =
  | { kind: 'star' }
  | { kind: 'column'; path: string; alias?: string }
  | { kind: 'agg'; fn: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'; arg: string; alias?: string };

export type WhereExpr =
  | { kind: 'or'; left: WhereExpr; right: WhereExpr }
  | { kind: 'and'; left: WhereExpr; right: WhereExpr }
  | { kind: 'not'; expr: WhereExpr }
  | { kind: 'compare'; field: string; op: string; value: unknown }
  | { kind: 'in'; field: string; values: unknown[]; negated: boolean }
  | { kind: 'null'; field: string; negated: boolean }
  | { kind: 'between'; field: string; low: unknown; high: unknown; negated: boolean };

export interface OrderItem {
  field: string;
  direction: 'ASC' | 'DESC';
}

export type ParsedQuery =
  | { type: 'SHOW_STORES' }
  | {
      type: 'SELECT';
      distinct: boolean;
      selectItems: SelectItem[];
      fromStore: string;
      where?: WhereExpr;
      groupBy: string[];
      orderBy: OrderItem[];
      limit?: number;
      offset?: number;
    };

class Parser {
  private tokens: Token[];
  private idx = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.idx + offset, this.tokens.length - 1)];
  }

  private advance(): Token {
    const t = this.peek();
    if (t.type !== 'EOF') this.idx++;
    return t;
  }

  private matchKeyword(kw: string): boolean {
    const t = this.peek();
    if (t.type === 'KEYWORD' && t.value === kw) {
      this.advance();
      return true;
    }
    return false;
  }

  private expectKeyword(kw: string): Token {
    const t = this.peek();
    if (t.type === 'KEYWORD' && t.value === kw) return this.advance();
    throw new SqlSyntaxError(`Expected keyword ${kw}, found "${t.value || 'end of query'}".`, t.pos);
  }

  private parseIdentifierName(): string {
    const t = this.peek();
    if (t.type === 'IDENT' || t.type === 'KEYWORD') return this.advance().value;
    throw new SqlSyntaxError(
      `Expected column or store name, found "${t.value || 'end of query'}".`,
      t.pos
    );
  }

  private parseLiteral(): unknown {
    const t = this.peek();
    if (t.type === 'STRING') return this.advance().value;
    if (t.type === 'NUMBER') return Number(this.advance().value);
    if (t.type === 'KEYWORD' && t.value === 'TRUE') {
      this.advance();
      return true;
    }
    if (t.type === 'KEYWORD' && t.value === 'FALSE') {
      this.advance();
      return false;
    }
    if (t.type === 'KEYWORD' && t.value === 'NULL') {
      this.advance();
      return null;
    }
    throw new SqlSyntaxError(
      `Expected literal value (string, number, boolean, or NULL), found "${t.value}".`,
      t.pos
    );
  }

  parse(): ParsedQuery {
    if (this.matchKeyword('SHOW')) {
      if (this.matchKeyword('TABLES') || this.matchKeyword('STORES')) {
        if (this.peek().type === 'SEMICOLON') this.advance();
        return { type: 'SHOW_STORES' };
      }
      throw new SqlSyntaxError('Use SHOW TABLES or SHOW STORES.', this.peek().pos);
    }

    this.expectKeyword('SELECT');
    const distinct = this.matchKeyword('DISTINCT');

    const selectItems: SelectItem[] = [];
    do {
      selectItems.push(this.parseSelectItem());
    } while (this.peek().type === 'COMMA' && this.advance());

    this.expectKeyword('FROM');
    const fromStore = this.parseIdentifierName();

    let where: WhereExpr | undefined;
    if (this.matchKeyword('WHERE')) where = this.parseOr();

    const groupBy: string[] = [];
    if (this.matchKeyword('GROUP')) {
      this.expectKeyword('BY');
      do {
        groupBy.push(this.parseIdentifierName());
      } while (this.peek().type === 'COMMA' && this.advance());
    }

    const orderBy: OrderItem[] = [];
    if (this.matchKeyword('ORDER')) {
      this.expectKeyword('BY');
      do {
        const field = this.parseIdentifierName();
        let direction: 'ASC' | 'DESC' = 'ASC';
        if (this.matchKeyword('DESC')) direction = 'DESC';
        else this.matchKeyword('ASC');
        orderBy.push({ field, direction });
      } while (this.peek().type === 'COMMA' && this.advance());
    }

    let limit: number | undefined;
    if (this.matchKeyword('LIMIT')) {
      const n = this.peek();
      if (n.type !== 'NUMBER') throw new SqlSyntaxError('LIMIT requires a non-negative integer.', n.pos);
      limit = Math.max(0, Math.floor(Number(this.advance().value)));
    }

    let offset: number | undefined;
    if (this.matchKeyword('OFFSET')) {
      const n = this.peek();
      if (n.type !== 'NUMBER') throw new SqlSyntaxError('OFFSET requires a non-negative integer.', n.pos);
      offset = Math.max(0, Math.floor(Number(this.advance().value)));
    }

    if (this.peek().type === 'SEMICOLON') this.advance();
    if (this.peek().type !== 'EOF') {
      throw new SqlSyntaxError(
        `Unexpected token "${this.peek().value}" at position ${this.peek().pos + 1}.`,
        this.peek().pos
      );
    }

    return { type: 'SELECT', distinct, selectItems, fromStore, where, groupBy, orderBy, limit, offset };
  }

  private parseSelectItem(): SelectItem {
    const t = this.peek();
    if (t.type === 'STAR') {
      this.advance();
      return { kind: 'star' };
    }

    if (t.type === 'KEYWORD' && AGG_FUNCS.has(t.value) && this.peek(1).type === 'LPAREN') {
      const fn = this.advance().value as 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
      this.advance();
      const arg = this.peek().type === 'STAR' ? (this.advance(), '*') : this.parseIdentifierName();
      if (this.peek().type !== 'RPAREN') {
        throw new SqlSyntaxError(`Expected ")" after ${fn} argument.`, this.peek().pos);
      }
      this.advance();
      const alias = this.matchKeyword('AS')
        ? this.parseIdentifierName()
        : this.peek().type === 'IDENT'
          ? this.advance().value
          : undefined;
      return { kind: 'agg', fn, arg, alias };
    }

    const path = this.parseIdentifierName();
    const alias = this.matchKeyword('AS')
      ? this.parseIdentifierName()
      : this.peek().type === 'IDENT'
        ? this.advance().value
        : undefined;
    return { kind: 'column', path, alias };
  }

  private parseOr(): WhereExpr {
    let left = this.parseAnd();
    while (this.matchKeyword('OR')) left = { kind: 'or', left, right: this.parseAnd() };
    return left;
  }

  private parseAnd(): WhereExpr {
    let left = this.parseNot();
    while (this.matchKeyword('AND')) left = { kind: 'and', left, right: this.parseNot() };
    return left;
  }

  private parseNot(): WhereExpr {
    if (this.matchKeyword('NOT')) return { kind: 'not', expr: this.parseNot() };
    return this.parsePrimary();
  }

  private parsePrimary(): WhereExpr {
    if (this.peek().type === 'LPAREN') {
      this.advance();
      const expr = this.parseOr();
      if (this.peek().type !== 'RPAREN') throw new SqlSyntaxError('Missing closing ")".', this.peek().pos);
      this.advance();
      return expr;
    }

    const field = this.parseIdentifierName();

    if (this.matchKeyword('IS')) {
      const negated = this.matchKeyword('NOT');
      this.expectKeyword('NULL');
      return { kind: 'null', field, negated };
    }

    const negated = this.matchKeyword('NOT');

    if (this.matchKeyword('IN')) {
      if (this.peek().type !== 'LPAREN') {
        throw new SqlSyntaxError('IN operator requires a parenthesized value list.', this.peek().pos);
      }
      this.advance();
      const values: unknown[] = [];
      if (this.peek().type !== 'RPAREN') {
        do {
          values.push(this.parseLiteral());
        } while (this.peek().type === 'COMMA' && this.advance());
      }
      if (this.peek().type !== 'RPAREN') throw new SqlSyntaxError('Missing closing ")" for IN list.', this.peek().pos);
      this.advance();
      return { kind: 'in', field, values, negated };
    }

    if (this.matchKeyword('LIKE') || this.matchKeyword('ILIKE')) {
      const opToken = this.tokens[this.idx - 1].value;
      return { kind: 'compare', field, op: negated ? `NOT_${opToken}` : opToken, value: this.parseLiteral() };
    }

    if (this.matchKeyword('BETWEEN')) {
      const low = this.parseLiteral();
      this.expectKeyword('AND');
      return { kind: 'between', field, low, high: this.parseLiteral(), negated };
    }

    if (negated) throw new SqlSyntaxError('NOT must precede IN, LIKE, ILIKE, or BETWEEN.', this.peek().pos);

    const opTok = this.peek();
    if (opTok.type !== 'OP') {
      throw new SqlSyntaxError(`Expected comparison operator after "${field}".`, opTok.pos);
    }
    this.advance();
    return { kind: 'compare', field, op: opTok.value, value: this.parseLiteral() };
  }
}

export function parseSqlQuery(sql: string): ParsedQuery {
  const trimmed = sql.trim();
  if (!trimmed) throw new SqlSyntaxError('SQL query is empty.');
  return new Parser(tokenize(trimmed)).parse();
}
