import { Token, TokenType, SourceLocation, Lexer as ILexer } from './types';

export class ClarityLexer implements ILexer {
  private source: string = '';
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  // Clarity keywords
  private readonly keywords = new Set([
    'define-constant', 'define-private', 'define-public', 'define-read-only',
    'define-map', 'define-data-var', 'define-non-fungible-token', 'define-fungible-token',
    'define-trait', 'use-trait', 'impl-trait',
    'let', 'begin', 'if', 'match', 'try', 'unwrap!', 'unwrap-panic',
    'ok', 'err', 'some', 'none', 'true', 'false',
    'and', 'or', 'not', 'is-eq', 'is-some', 'is-none', 'is-ok', 'is-err',
    'map-get?', 'map-set', 'map-insert', 'map-delete',
    'var-get', 'var-set',
    'contract-call?', 'as-contract', 'tx-sender', 'contract-caller',
    'block-height', 'stx-get-balance', 'stx-transfer?',
    'ft-mint?', 'ft-transfer?', 'ft-burn?', 'ft-get-balance',
    'nft-mint?', 'nft-transfer?', 'nft-burn?', 'nft-get-owner?',
    'asserts!', 'print', 'list', 'append', 'concat', 'len',
    'filter', 'map', 'fold', 'element-at', 'index-of',
    'get', 'merge', 'tuple', 'default-to',
    '+', '-', '*', '/', 'mod', 'pow', 'sqrti',
    '<', '<=', '>', '>=', 'to-int', 'to-uint',
    'buff-to-int-be', 'buff-to-int-le', 'buff-to-uint-be', 'buff-to-uint-le',
    'int-to-ascii', 'int-to-utf8', 'string-to-int?', 'string-to-uint?',
    'principal-of?', 'principal-construct?'
  ]);

  public tokenize(source: string): Token[] {
    this.reset();
    this.source = source;
    
    while (!this.isAtEnd()) {
      this.scanToken();
    }
    
    this.addToken(TokenType.EOF, '');
    return this.tokens;
  }

  public reset(): void {
    this.source = '';
    this.position = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
  }

  private scanToken(): void {
    const start = this.position;
    const startLocation = this.getCurrentLocation();
    const char = this.advance();

    switch (char) {
      case ' ':
      case '\r':
      case '\t':
        // Skip whitespace
        break;
      
      case '\n':
        this.line++;
        this.column = 1;
        break;
      
      case '(':
        this.addToken(TokenType.LPAREN, '(', startLocation);
        break;
      
      case ')':
        this.addToken(TokenType.RPAREN, ')', startLocation);
        break;
      
      case '{':
        this.addToken(TokenType.LBRACE, '{', startLocation);
        break;
      
      case '}':
        this.addToken(TokenType.RBRACE, '}', startLocation);
        break;
      
      case '.':
        this.addToken(TokenType.DOT, '.', startLocation);
        break;
      
      case ',':
        this.addToken(TokenType.COMMA, ',', startLocation);
        break;
      
      case ':':
        this.addToken(TokenType.COLON, ':', startLocation);
        break;
      
      case ';':
        // Comment - skip to end of line
        this.skipComment();
        break;
      
      case '"':
        this.scanString();
        break;
      
      case '0':
        if (this.peek() === 'x') {
          this.advance(); // consume 'x'
          this.scanHexBuffer();
        } else {
          this.scanNumber();
        }
        break;
      
      case 'u':
        // Could be uint literal or identifier starting with 'u'
        if (this.isDigit(this.peek())) {
          this.scanUint();
        } else {
          this.scanIdentifier();
        }
        break;
      
      case '\'':
        this.scanPrincipal();
        break;
      
      default:
        if (this.isDigit(char)) {
          this.scanNumber();
        } else if (this.isAlpha(char) || char === '-' || char === '_' || char === '!' || 
                   char === '?' || char === '+' || char === '<' || char === '>' || 
                   char === '=' || char === '/' || char === '%' || char === '*') {
          this.scanIdentifier();
        } else {
          // Unknown character - could emit error token
          this.advance();
        }
        break;
    }
  }

  private skipComment(): void {
    // Skip until end of line or end of file
    while (this.peek() !== '\n' && !this.isAtEnd()) {
      this.advance();
    }
  }

  private scanString(): void {
    const start = this.position - 1;
    const startLocation = { ...this.getCurrentLocation(), column: this.column - 1 };
    
    // Determine if it's ASCII or UTF-8 by checking for 'u' prefix
    let isUtf8 = false;
    if (this.position >= 2 && this.source[this.position - 2] === 'u') {
      isUtf8 = true;
    }
    
    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
      }
      this.advance();
    }
    
    if (this.isAtEnd()) {
      // Unterminated string error
      return;
    }
    
    // Consume closing quote
    this.advance();
    
    const value = this.source.substring(start + 1, this.position - 1);
    const raw = this.source.substring(start, this.position);
    
    this.addToken(
      isUtf8 ? TokenType.STRING_UTF8 : TokenType.STRING_ASCII,
      value,
      startLocation,
      raw
    );
  }

  private scanNumber(): void {
    const start = this.position - 1;
    const startLocation = { ...this.getCurrentLocation(), column: this.column - 1 };
    
    while (this.isDigit(this.peek())) {
      this.advance();
    }
    
    const value = this.source.substring(start, this.position);
    this.addToken(TokenType.INT, value, startLocation);
  }

  private scanUint(): void {
    const start = this.position - 1; // Include the 'u'
    const startLocation = { ...this.getCurrentLocation(), column: this.column - 1 };
    
    while (this.isDigit(this.peek())) {
      this.advance();
    }
    
    const value = this.source.substring(start + 1, this.position); // Skip 'u' prefix
    const raw = this.source.substring(start, this.position);
    
    this.addToken(TokenType.UINT, value, startLocation, raw);
  }

  private scanHexBuffer(): void {
    const start = this.position - 2; // Include '0x'
    const startLocation = { ...this.getCurrentLocation(), column: this.column - 2 };
    
    while (this.isHexDigit(this.peek())) {
      this.advance();
    }
    
    const value = this.source.substring(start + 2, this.position); // Skip '0x'
    const raw = this.source.substring(start, this.position);
    
    this.addToken(TokenType.BUFF, value, startLocation, raw);
  }

  private scanPrincipal(): void {
    const start = this.position - 1;
    const startLocation = { ...this.getCurrentLocation(), column: this.column - 1 };
    
    // Principal format: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7 or 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.contract-name
    while (!this.isAtEnd() && this.peek() !== ' ' && this.peek() !== ')' && this.peek() !== '\n') {
      this.advance();
    }
    
    const value = this.source.substring(start + 1, this.position); // Skip quote
    const raw = this.source.substring(start, this.position);
    
    this.addToken(TokenType.PRINCIPAL, value, startLocation, raw);
  }

  private scanIdentifier(): void {
    const start = this.position - 1;
    const startLocation = { ...this.getCurrentLocation(), column: this.column - 1 };
    
    while (this.isAlphaNumeric(this.peek()) || 
           this.peek() === '-' || this.peek() === '_' || this.peek() === '!' || 
           this.peek() === '?' || this.peek() === '+' || this.peek() === '<' || 
           this.peek() === '>' || this.peek() === '=' || this.peek() === '/' || 
           this.peek() === '%' || this.peek() === '*') {
      this.advance();
    }
    
    const text = this.source.substring(start, this.position);
    
    // Check for boolean literals
    if (text === 'true' || text === 'false') {
      this.addToken(TokenType.BOOL, text, startLocation);
      return;
    }
    
    // Check if it's a keyword
    const tokenType = this.keywords.has(text) ? TokenType.KEYWORD : TokenType.IDENTIFIER;
    this.addToken(tokenType, text, startLocation);
  }

  private isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  private advance(): string {
    const char = this.source.charAt(this.position);
    this.position++;
    this.column++;
    return char;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source.charAt(this.position);
  }

  private peekNext(): string {
    if (this.position + 1 >= this.source.length) return '\0';
    return this.source.charAt(this.position + 1);
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isHexDigit(char: string): boolean {
    return (char >= '0' && char <= '9') ||
           (char >= 'a' && char <= 'f') ||
           (char >= 'A' && char <= 'F');
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') ||
           (char >= 'A' && char <= 'Z');
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private getCurrentLocation(): SourceLocation {
    return {
      line: this.line,
      column: this.column,
      offset: this.position
    };
  }

  private addToken(
    type: TokenType, 
    value: string, 
    location?: SourceLocation,
    raw?: string
  ): void {
    const tokenLocation = location || this.getCurrentLocation();
    
    this.tokens.push({
      type,
      value,
      location: tokenLocation,
      raw: raw || value
    });
  }
}
