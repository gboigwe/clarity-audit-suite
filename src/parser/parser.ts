import {
  Token, TokenType, Parser as IParser, ParseResult, ParserError, ParserWarning,
  ClarityAst, TopLevelStatement, Expression, FunctionDefinition, ConstantDefinition,
  MapDefinition, DataVarDefinition, NftDefinition, FtDefinition, TraitDefinition,
  Parameter, ClarityType, FunctionCall, LetExpression, BeginExpression,
  IfExpression, MatchExpression, Binding, Identifier, Literal, UintLiteral,
  IntLiteral, BoolLiteral, StringLiteral, BuffLiteral, PrincipalLiteral,
  SourceLocation, SourceRange, TypeEnvironment, ListExpression, TupleExpression,
  TupleField, MatchArm, Pattern, UseTrait, ImplTrait
} from './types';
import { ClarityLexer } from './lexer';

export class EnhancedClarityParser implements IParser {
  private tokens: Token[] = [];
  private current: number = 0;
  private errors: ParserError[] = [];
  private warnings: ParserWarning[] = [];
  private lexer: ClarityLexer;

  constructor() {
    this.lexer = new ClarityLexer();
  }

  public parse(source: string): ParseResult {
    this.reset();
    
    try {
      this.tokens = this.lexer.tokenize(source);
      const ast = this.parseProgram();
      
      return {
        ast,
        errors: this.errors,
        warnings: this.warnings,
        success: this.errors.length === 0
      };
    } catch (error) {
      this.addError(`Unexpected parsing error: ${error}`, this.getCurrentLocation());
      return {
        ast: null,
        errors: this.errors,
        warnings: this.warnings,
        success: false
      };
    }
  }

  public parseTokens(tokens: Token[]): ParseResult {
    this.reset();
    this.tokens = tokens;
    
    try {
      const ast = this.parseProgram();
      
      return {
        ast,
        errors: this.errors,
        warnings: this.warnings,
        success: this.errors.length === 0
      };
    } catch (error) {
      this.addError(`Unexpected parsing error: ${error}`, this.getCurrentLocation());
      return {
        ast: null,
        errors: this.errors,
        warnings: this.warnings,
        success: false
      };
    }
  }

  public reset(): void {
    this.tokens = [];
    this.current = 0;
    this.errors = [];
    this.warnings = [];
    this.lexer.reset();
  }

  private parseProgram(): ClarityAst {
    const start = this.getCurrentLocation();
    const body: TopLevelStatement[] = [];
    
    // Skip any leading whitespace or comments
    this.skipWhitespace();
    
    while (!this.isAtEnd()) {
      try {
        const statement = this.parseTopLevelStatement();
        if (statement) {
          body.push(statement);
        }
      } catch (error) {
        // Error recovery: skip to next top-level construct
        this.synchronize();
      }
      
      this.skipWhitespace();
    }
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'program',
      body,
      imports: [], // Will be populated by semantic analysis
      traits: [], // Will be populated by semantic analysis
      contracts: [], // Will be populated by semantic analysis
      typeEnvironment: this.createEmptyTypeEnvironment(),
      location: { start, end }
    };
  }

  private parseTopLevelStatement(): TopLevelStatement | null {
    if (this.check(TokenType.LPAREN)) {
      return this.parseParenthesizedStatement();
    }
    
    this.addError('Expected top-level statement', this.getCurrentLocation());
    return null;
  }

  private parseParenthesizedStatement(): TopLevelStatement | null {
    this.consume(TokenType.LPAREN, 'Expected "("');
    
    if (!this.check(TokenType.KEYWORD)) {
      this.addError('Expected keyword after "("', this.getCurrentLocation());
      return null;
    }
    
    const keyword = this.advance().value;
    
    switch (keyword) {
      case 'define-constant':
        return this.parseConstantDefinition();
      case 'define-private':
      case 'define-public':
      case 'define-read-only':
        return this.parseFunctionDefinition(keyword as 'define-private' | 'define-public' | 'define-read-only');
      case 'define-map':
        return this.parseMapDefinition();
      case 'define-data-var':
        return this.parseDataVarDefinition();
      case 'define-non-fungible-token':
        return this.parseNftDefinition();
      case 'define-fungible-token':
        return this.parseFtDefinition();
      case 'define-trait':
        return this.parseTraitDefinition();
      case 'use-trait':
        return this.parseUseTrait();
      case 'impl-trait':
        return this.parseImplTrait();
      default:
        this.addError(`Unknown top-level keyword: ${keyword}`, this.getPreviousLocation());
        return null;
    }
  }

  private parseConstantDefinition(): ConstantDefinition {
    const start = this.getPreviousLocation();
    
    const name = this.consume(TokenType.IDENTIFIER, 'Expected constant name').value;
    const value = this.parseExpression();
    
    this.consume(TokenType.RPAREN, 'Expected ")" after constant definition');
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'constant-definition',
      name,
      value,
      used: false, // Will be set by semantic analysis
      location: { start, end }
    };
  }

  private parseFunctionDefinition(defineType: 'define-private' | 'define-public' | 'define-read-only'): FunctionDefinition {
    const start = this.getPreviousLocation();
    
    // Parse function signature: (function-name (param1 type1) (param2 type2) ...)
    this.consume(TokenType.LPAREN, 'Expected "(" before function signature');
    
    const name = this.consume(TokenType.IDENTIFIER, 'Expected function name').value;
    const parameters: Parameter[] = [];
    
    // Parse parameters
    while (this.check(TokenType.LPAREN)) {
      parameters.push(this.parseParameter());
    }
    
    this.consume(TokenType.RPAREN, 'Expected ")" after function signature');
    
    // Parse function body
    const body: Expression[] = [];
    while (!this.check(TokenType.RPAREN)) {
      body.push(this.parseExpression());
    }
    
    this.consume(TokenType.RPAREN, 'Expected ")" after function body');
    
    const end = this.getPreviousLocation();
    
    const visibility = defineType === 'define-private' ? 'private' as const :
                      defineType === 'define-public' ? 'public' as const :
                      'read-only' as const;
    
    return {
      type: 'function-definition',
      name,
      visibility,
      parameters,
      body,
      annotations: [],
      callsExternal: false, // Will be set by semantic analysis
      modifiesState: false, // Will be set by semantic analysis
      canFail: false, // Will be set by semantic analysis
      location: { start, end }
    };
  }

  private parseParameter(): Parameter {
    const start = this.getCurrentLocation();
    
    this.consume(TokenType.LPAREN, 'Expected "(" before parameter');
    const name = this.consume(TokenType.IDENTIFIER, 'Expected parameter name').value;
    const paramType = this.parseType();
    this.consume(TokenType.RPAREN, 'Expected ")" after parameter');
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'parameter',
      name,
      paramType,
      location: { start, end }
    };
  }

  private parseMapDefinition(): MapDefinition {
    const start = this.getPreviousLocation();
    
    const name = this.consume(TokenType.IDENTIFIER, 'Expected map name').value;
    const keyType = this.parseType();
    const valueType = this.parseType();
    
    this.consume(TokenType.RPAREN, 'Expected ")" after map definition');
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'map-definition',
      name,
      keyType,
      valueType,
      accessed: false, // Will be set by semantic analysis
      modified: false, // Will be set by semantic analysis
      location: { start, end }
    };
  }

  private parseDataVarDefinition(): DataVarDefinition {
    const start = this.getPreviousLocation();
    
    const name = this.consume(TokenType.IDENTIFIER, 'Expected variable name').value;
    const varType = this.parseType();
    const initialValue = this.parseExpression();
    
    this.consume(TokenType.RPAREN, 'Expected ")" after data var definition');
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'data-var-definition',
      name,
      varType,
      initialValue,
      accessed: false, // Will be set by semantic analysis
      modified: false, // Will be set by semantic analysis
      location: { start, end }
    };
  }

  private parseNftDefinition(): NftDefinition {
    const start = this.getPreviousLocation();
    
    const name = this.consume(TokenType.IDENTIFIER, 'Expected NFT name').value;
    const tokenType = this.parseType();
    
    this.consume(TokenType.RPAREN, 'Expected ")" after NFT definition');
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'nft-definition',
      name,
      tokenType,
      location: { start, end }
    };
  }

  private parseFtDefinition(): FtDefinition {
    const start = this.getPreviousLocation();
    
    const name = this.consume(TokenType.IDENTIFIER, 'Expected FT name').value;
    let totalSupply: Expression | undefined;
    
    // Total supply is optional
    if (!this.check(TokenType.RPAREN)) {
      totalSupply = this.parseExpression();
    }
    
    this.consume(TokenType.RPAREN, 'Expected ")" after FT definition');
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'ft-definition',
      name,
      totalSupply,
      location: { start, end }
    };
  }

    private parseTraitDefinition(): TraitDefinition {
    const start = this.getPreviousLocation();
    const name = this.consume(TokenType.IDENTIFIER, 'Expected trait name').value;
    
    // Skip trait body parsing for now
    while (!this.check(TokenType.RPAREN)) {
        this.advance();
    }
    
    this.consume(TokenType.RPAREN, 'Expected ")" after trait definition');
    const end = this.getPreviousLocation();
    
    return {
        type: 'trait-definition',
        name,
        functions: [], // Empty array instead of something_else
        location: { start, end }
    };
    }

  private parseUseTrait(): UseTrait {
    const start = this.getPreviousLocation();
    
    const name = this.consume(TokenType.IDENTIFIER, 'Expected trait alias').value;
    const contractPrincipal = this.parseExpression();
    
    this.consume(TokenType.RPAREN, 'Expected ")" after use-trait');
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'use-trait',
      name,
      contractPrincipal,
      location: { start, end }
    };
  }

  private parseImplTrait(): ImplTrait {
    const start = this.getPreviousLocation();
    
    const traitName = this.consume(TokenType.IDENTIFIER, 'Expected trait name').value;
    const contractPrincipal = this.parseExpression();
    
    this.consume(TokenType.RPAREN, 'Expected ")" after impl-trait');
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'impl-trait',
      traitName,
      contractPrincipal,
      location: { start, end }
    };
  }

  private parseExpression(): Expression {
    if (this.check(TokenType.LPAREN)) {
      return this.parseParenthesizedExpression();
    }
    
    if (this.check(TokenType.IDENTIFIER)) {
      return this.parseIdentifier();
    }
    
    if (this.check(TokenType.UINT) || this.check(TokenType.INT) || 
        this.check(TokenType.BOOL) || this.check(TokenType.STRING_ASCII) ||
        this.check(TokenType.STRING_UTF8) || this.check(TokenType.BUFF) ||
        this.check(TokenType.PRINCIPAL)) {
      return this.parseLiteral();
    }
    
    this.addError('Expected expression', this.getCurrentLocation());
    // Return a dummy identifier for error recovery
    return this.createIdentifier('error', this.getCurrentLocation());
  }

  private parseParenthesizedExpression(): Expression {
    const start = this.getCurrentLocation();
    this.consume(TokenType.LPAREN, 'Expected "("');
    
    if (this.check(TokenType.KEYWORD)) {
      const keyword = this.peek().value;
      
      switch (keyword) {
        case 'let':
          return this.parseLetExpression();
        case 'begin':
          return this.parseBeginExpression();
        case 'if':
          return this.parseIfExpression();
        case 'match':
          return this.parseMatchExpression();
        case 'list':
          return this.parseListExpression();
        case 'tuple':
          return this.parseTupleExpression();
        default:
          // Function call with keyword
          return this.parseFunctionCall();
      }
    } else {
      // Regular function call
      return this.parseFunctionCall();
    }
  }

  private parseLetExpression(): LetExpression {
    const start = this.getPreviousLocation();
    
    this.consume(TokenType.KEYWORD, 'Expected "let"'); // consume 'let'
    
    // Parse bindings: ((name1 value1) (name2 value2) ...)
    this.consume(TokenType.LPAREN, 'Expected "(" before let bindings');
    
    const bindings: Binding[] = [];
    while (this.check(TokenType.LPAREN)) {
      bindings.push(this.parseBinding());
    }
    
    this.consume(TokenType.RPAREN, 'Expected ")" after let bindings');
    
    // Parse body
    const body: Expression[] = [];
    while (!this.check(TokenType.RPAREN)) {
      body.push(this.parseExpression());
    }
    
    this.consume(TokenType.RPAREN, 'Expected ")" after let body');
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'let-expression',
      bindings,
      body,
      localScope: new Map(), // Will be populated by semantic analysis
      location: { start, end }
    };
  }

  private parseBinding(): Binding {
    const start = this.getCurrentLocation();
    
    this.consume(TokenType.LPAREN, 'Expected "(" before binding');
    const name = this.consume(TokenType.IDENTIFIER, 'Expected binding name').value;
    const value = this.parseExpression();
    this.consume(TokenType.RPAREN, 'Expected ")" after binding');
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'binding',
      name,
      value,
      location: { start, end }
    };
  }

  private parseBeginExpression(): BeginExpression {
    const start = this.getPreviousLocation();
    
    this.consume(TokenType.KEYWORD, 'Expected "begin"'); // consume 'begin'
    
    const body: Expression[] = [];
    while (!this.check(TokenType.RPAREN)) {
      body.push(this.parseExpression());
    }
    
    this.consume(TokenType.RPAREN, 'Expected ")" after begin body');
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'begin-expression',
      body,
      canFail: false, // Will be set by semantic analysis
      location: { start, end }
    };
  }

  private parseIfExpression(): IfExpression {
    const start = this.getPreviousLocation();
    
    this.consume(TokenType.KEYWORD, 'Expected "if"'); // consume 'if'
    
    const condition = this.parseExpression();
    const then = this.parseExpression();
    let elseExpr: Expression | undefined;
    
    if (!this.check(TokenType.RPAREN)) {
      elseExpr = this.parseExpression();
    }
    
    this.consume(TokenType.RPAREN, 'Expected ")" after if expression');
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'if-expression',
      condition,
      then,
      else: elseExpr,
      location: { start, end }
    };
  }

  private parseMatchExpression(): MatchExpression {
    const start = this.getPreviousLocation();
    
    this.consume(TokenType.KEYWORD, 'Expected "match"'); // consume 'match'
    
    const expression = this.parseExpression();
    const arms: MatchArm[] = [];
    
    // Parse match arms
    while (!this.check(TokenType.RPAREN)) {
      arms.push(this.parseMatchArm());
    }
    
    this.consume(TokenType.RPAREN, 'Expected ")" after match expression');
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'match-expression',
      expression,
      arms,
      location: { start, end }
    };
  }

  private parseMatchArm(): MatchArm {
    const start = this.getCurrentLocation();
    
    const pattern = this.parsePattern();
    const body = this.parseExpression();
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'match-arm',
      pattern,
      body,
      location: { start, end }
    };
  }

  private parsePattern(): Pattern {
    // Simplified pattern parsing - would need more sophisticated implementation
    if (this.check(TokenType.KEYWORD)) {
      const keyword = this.advance().value;
      switch (keyword) {
        case 'ok':
          return { type: 'ok-pattern', value: this.parsePattern() };
        case 'err':
          return { type: 'err-pattern', value: this.parsePattern() };
        case 'some':
          return { type: 'some-pattern', value: this.parsePattern() };
        case 'none':
          return { type: 'none-pattern' };
        default:
          this.addError(`Unknown pattern keyword: ${keyword}`, this.getPreviousLocation());
          return { type: 'none-pattern' };
      }
    }
    
    if (this.check(TokenType.IDENTIFIER)) {
      const name = this.advance().value;
      return { type: 'identifier-pattern', name };
    }
    
    // Literal pattern
    const literal = this.parseLiteral();
    return { type: 'literal-pattern', value: literal };
  }

  private parseListExpression(): ListExpression {
    const start = this.getPreviousLocation();
    
    this.consume(TokenType.KEYWORD, 'Expected "list"'); // consume 'list'
    
    const elements: Expression[] = [];
    while (!this.check(TokenType.RPAREN)) {
      elements.push(this.parseExpression());
    }
    
    this.consume(TokenType.RPAREN, 'Expected ")" after list expression');
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'list-expression',
      elements,
      location: { start, end }
    };
  }

  private parseTupleExpression(): TupleExpression {
    const start = this.getPreviousLocation();
    
    this.consume(TokenType.KEYWORD, 'Expected "tuple"'); // consume 'tuple'
    
    const fields: TupleField[] = [];
    while (!this.check(TokenType.RPAREN)) {
      fields.push(this.parseTupleField());
    }
    
    this.consume(TokenType.RPAREN, 'Expected ")" after tuple expression');
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'tuple-expression',
      fields,
      location: { start, end }
    };
  }

  private parseTupleField(): TupleField {
    const start = this.getCurrentLocation();
    
    this.consume(TokenType.LPAREN, 'Expected "(" before tuple field');
    const name = this.consume(TokenType.IDENTIFIER, 'Expected field name').value;
    const value = this.parseExpression();
    this.consume(TokenType.RPAREN, 'Expected ")" after tuple field');
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'tuple-field',
      name,
      value,
      location: { start, end }
    };
  }

  private parseFunctionCall(): FunctionCall {
    const start = this.getPreviousLocation();
    
    const functionExpr = this.parseExpression();
    const args: Expression[] = [];
    
    while (!this.check(TokenType.RPAREN)) {
      args.push(this.parseExpression());
    }
    
    this.consume(TokenType.RPAREN, 'Expected ")" after function call');
    
    const end = this.getPreviousLocation();
    
    return {
      type: 'function-call',
      function: functionExpr,
      arguments: args,
      isBuiltin: false, // Will be set by semantic analysis
      isExternal: false, // Will be set by semantic analysis
      canFail: false, // Will be set by semantic analysis
      sideEffects: [], // Will be set by semantic analysis
      location: { start, end }
    };
  }

  private parseIdentifier(): Identifier {
    const token = this.advance();
    const location = token.location;
    
    return this.createIdentifier(token.value, location);
  }

  private createIdentifier(name: string, location: SourceLocation): Identifier {
    return {
      type: 'identifier',
      name,
      location: { start: location, end: location }
    };
  }

  private parseLiteral(): Literal {
    const token = this.advance();
    const location = { start: token.location, end: token.location };
    
    switch (token.type) {
      case TokenType.UINT:
        return {
          type: 'uint-literal',
          value: BigInt(token.value),
          raw: token.raw,
          location
        } as UintLiteral;
      
      case TokenType.INT:
        return {
          type: 'int-literal',
          value: BigInt(token.value),
          raw: token.raw,
          location
        } as IntLiteral;
      
      case TokenType.BOOL:
        return {
          type: 'bool-literal',
          value: token.value === 'true',
          location
        } as BoolLiteral;
      
      case TokenType.STRING_ASCII:
        return {
          type: 'string-literal',
          value: token.value,
          encoding: 'ascii',
          raw: token.raw,
          location
        } as StringLiteral;
      
      case TokenType.STRING_UTF8:
        return {
          type: 'string-literal',
          value: token.value,
          encoding: 'utf8',
          raw: token.raw,
          location
        } as StringLiteral;
      
      case TokenType.BUFF:
        return {
          type: 'buff-literal',
          value: this.hexToUint8Array(token.value),
          raw: token.raw,
          location
        } as BuffLiteral;
      
      case TokenType.PRINCIPAL:
        const isContract = token.value.includes('.');
        const contractName = isContract ? token.value.split('.')[1] : undefined;
        
        return {
          type: 'principal-literal',
          value: token.value,
          isContract,
          contractName,
          location
        } as PrincipalLiteral;
      
      default:
        this.addError(`Unexpected literal type: ${token.type}`, token.location);
        return {
          type: 'bool-literal',
          value: false,
          location
        } as BoolLiteral;
    }
  }

  private parseType(): ClarityType {
    // Simplified type parsing - would need more comprehensive implementation
    if (this.check(TokenType.IDENTIFIER)) {
      const typeName = this.advance().value;
      const location = { start: this.getPreviousLocation(), end: this.getPreviousLocation() };
      
      return {
        type: 'clarity-type',
        kind: this.mapTypeNameToKind(typeName),
        location
      };
    }
    
    this.addError('Expected type', this.getCurrentLocation());
    return {
      type: 'clarity-type',
      kind: 'uint',
      location: { start: this.getCurrentLocation(), end: this.getCurrentLocation() }
    };
  }

  private mapTypeNameToKind(typeName: string): ClarityType['kind'] {
    switch (typeName) {
      case 'uint': return 'uint';
      case 'int': return 'int';
      case 'bool': return 'bool';
      case 'principal': return 'principal';
      default: return 'custom';
    }
  }

  // Utility methods
  private hexToUint8Array(hex: string): Uint8Array {
    const result = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      result[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return result;
  }

  private skipWhitespace(): void {
    while (this.check(TokenType.WHITESPACE) || this.check(TokenType.NEWLINE) || this.check(TokenType.COMMENT)) {
      this.advance();
    }
  }

  private synchronize(): void {
    this.advance();
    
    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.NEWLINE) return;
      
      if (this.peek().type === TokenType.KEYWORD) {
        const keyword = this.peek().value;
        if (keyword.startsWith('define-')) return;
      }
      
      this.advance();
    }
  }

  private createEmptyTypeEnvironment(): TypeEnvironment {
    return {
        functions: new Map(),
        constants: new Map(),
        variables: new Map(),
        maps: new Map(),
        traits: new Map()
    };
  }

  // Token navigation methods
  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    
    this.addError(message, this.getCurrentLocation());
    return this.peek(); // Return current token for error recovery
  }

  private getCurrentLocation(): SourceLocation {
    return this.peek().location;
  }

  private getPreviousLocation(): SourceLocation {
    return this.previous().location;
  }

  private addError(message: string, location: SourceLocation, code: string = 'PARSE_ERROR'): void {
    this.errors.push({
      message,
      location,
      severity: 'error',
      code
    });
  }

  private addWarning(message: string, location: SourceLocation, code: string = 'PARSE_WARNING'): void {
    this.warnings.push({
      message,
      location,
      code
    });
  }
}
