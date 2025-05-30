import { EnhancedClarityParserService } from '../src/parser/clarity-parser';
import { TokenType } from '../src/parser/types';

describe('EnhancedClarityParserService', () => {
  let parser: EnhancedClarityParserService;

  beforeEach(() => {
    parser = new EnhancedClarityParserService();
  });

  describe('Lexical Analysis', () => {
    it('should tokenize basic Clarity constructs', () => {
      const code = '(define-constant owner tx-sender)';
      const tokens = parser.getTokens(code);
      
      expect(tokens).toBeDefined();
      expect(tokens[0].type).toBe(TokenType.LPAREN);
      expect(tokens[1].type).toBe(TokenType.KEYWORD);
      expect(tokens[1].value).toBe('define-constant');
      expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[2].value).toBe('owner');
      expect(tokens[3].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[3].value).toBe('tx-sender');
      expect(tokens[4].type).toBe(TokenType.RPAREN);
    });

    it('should tokenize literals correctly', () => {
      const code = 'u42 -15 true "hello" 0x1234 \'SP1234';
      const tokens = parser.getTokens(code);
      
      const literalTokens = tokens.filter(t => 
        [TokenType.UINT, TokenType.INT, TokenType.BOOL, 
         TokenType.STRING_ASCII, TokenType.BUFF, TokenType.PRINCIPAL].includes(t.type)
      );
      
      expect(literalTokens.length).toBe(6);
      expect(literalTokens[0].type).toBe(TokenType.UINT);
      expect(literalTokens[0].value).toBe('42');
      expect(literalTokens[1].type).toBe(TokenType.INT);
      expect(literalTokens[1].value).toBe('-15');
      expect(literalTokens[2].type).toBe(TokenType.BOOL);
      expect(literalTokens[2].value).toBe('true');
    });
  });

  describe('Syntax Validation', () => {
    it('should validate correct syntax', () => {
      const code = `
        (define-constant contract-owner tx-sender)
        (define-public (get-owner)
          (ok contract-owner)
        )
      `;
      
      const validation = parser.validateSyntax(code);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should detect syntax errors', () => {
      const code = '(define-constant missing-paren';
      
      const validation = parser.validateSyntax(code);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Full Parsing with Semantic Analysis', () => {
    it('should parse a simple constant definition', () => {
      const code = '(define-constant contract-owner tx-sender)';
      const result = parser.parseText(code);
      
      expect(result.success).toBe(true);
      expect(result.ast).toBeDefined();
      expect(result.ast!.type).toBe('program');
      expect(result.ast!.body.length).toBe(1);
      
      const constant = result.ast!.body[0];
      expect(constant.type).toBe('constant-definition');
      expect((constant as any).name).toBe('contract-owner');
    });

    it('should parse a function definition with enhanced semantic info', () => {
      const code = `
        (define-public (test-function (param1 uint))
          (ok param1)
        )
      `;
      const result = parser.parseText(code);
      
      expect(result.success).toBe(true);
      expect(result.ast).toBeDefined();
      
      const functions = parser.extractFunctions(result.ast!);
      expect(functions.length).toBe(1);
      
      const func = functions[0];
      expect(func.name).toBe('test-function');
      expect(func.visibility).toBe('public');
      expect(func.parameters.length).toBe(1);
      expect(func.parameters[0].name).toBe('param1');
      expect(func.parameters[0].paramType.kind).toBe('uint');
      
      // Check semantic analysis results
      expect(func.callsExternal).toBeDefined();
      expect(func.modifiesState).toBeDefined();
      expect(func.canFail).toBeDefined();
    });

    it('should perform semantic analysis and detect issues', () => {
      const code = `
        (define-constant unused-constant u42)
        (define-private (unused-function) (ok true))
        (define-public (main-function)
          (begin
            (let ((local-var u10))
              (ok local-var)
            )
          )
        )
      `;
      
      const result = parser.parseText(code);
      
      expect(result.success).toBe(true);
      expect(result.semanticResult).toBeDefined();
      
      // Should detect unused constant and function
      const semanticWarnings = result.warnings.filter(w => w.type === 'semantic');
      expect(semanticWarnings.length).toBeGreaterThan(0);
      
      // Check type environment
      const typeEnv = result.semanticResult!.typeEnvironment;
      expect(typeEnv.functions.size).toBe(2); // unused-function + main-function
      expect(typeEnv.constants.size).toBe(1); // unused-constant
    });

    it('should analyze complex expressions with control flow', () => {
      const code = `
        (define-data-var counter uint u0)
        
        (define-public (increment-if-even (amount uint))
          (begin
            (if (is-eq (mod amount u2) u0)
              (begin
                (var-set counter (+ (var-get counter) amount))
                (ok (var-get counter))
              )
              (err u1)
            )
          )
        )
      `;
      
      const result = parser.parseText(code);
      
      expect(result.success).toBe(true);
      expect(result.ast).toBeDefined();
      
      const functions = parser.extractFunctions(result.ast!);
      const incrementFunc = functions[0];
      
      // Should detect state modification
      expect(incrementFunc.modifiesState).toBe(true);
      expect(incrementFunc.canFail).toBe(true); // because of err u1
      
      // Check variable usage tracking
      const typeEnv = result.semanticResult!.typeEnvironment;
      const counterVar = typeEnv.variables.get('counter');
      expect(counterVar).toBeDefined();
      expect(counterVar!.accessed).toBe(true);
      expect(counterVar!.modified).toBe(true);
    });

    it('should detect external contract calls', () => {
      const code = `
        (define-public (call-external)
          (contract-call? 'SP1234.some-contract some-function u42)
        )
      `;
      
      const result = parser.parseText(code);
      
      expect(result.success).toBe(true);
      
      const functions = parser.extractFunctions(result.ast!);
      const callFunc = functions[0];
      
      expect(callFunc.callsExternal).toBe(true);
    });

    it('should handle let expressions with local scope', () => {
      const code = `
        (define-private (test-let)
          (let ((x u10) (y u20))
            (+ x y)
          )
        )
      `;
      
      const result = parser.parseText(code);
      
      expect(result.success).toBe(true);
      expect(result.ast).toBeDefined();
      
      // Should have proper local scope tracking
      const functions = parser.extractFunctions(result.ast!);
      expect(functions[0].body.length).toBe(1);
      
      const letExpr = functions[0].body[0] as any;
      expect(letExpr.type).toBe('let-expression');
      expect(letExpr.bindings.length).toBe(2);
      expect(letExpr.localScope).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle malformed expressions gracefully', () => {
      const code = `
        (define-constant good-constant u42)
        (define-public (bad-function
          ;; Missing closing parenthesis
        (define-constant another-good u10)
      `;
      
      const result = parser.parseText(code);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Should still parse some valid parts
      expect(result.ast).toBeDefined();
    });

    it('should provide helpful error messages', () => {
      const code = '(define-constant)'; // Missing name and value
      
      const result = parser.parseText(code);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Expected');
    });
  });

  describe('Performance and Statistics', () => {
    it('should generate parsing statistics', () => {
      const code = `
        (define-constant c1 u1)
        (define-constant c2 u2)
        (define-data-var v1 uint u0)
        (define-map m1 principal uint)
        (define-public (f1) (ok true))
        (define-private (f2) (ok true))
        (define-read-only (f3) u42)
      `;
      
      const result = parser.parseText(code);
      const stats = parser.getParsingStatistics(result);
      
      expect(stats.constants).toBe(2);
      expect(stats.variables).toBe(1);
      expect(stats.maps).toBe(1);
      expect(stats.totalFunctions).toBe(3);
      expect(stats.publicFunctions).toBe(1);
      expect(stats.privateFunctions).toBe(1);
      expect(stats.readOnlyFunctions).toBe(1);
    });

    it('should generate a comprehensive parsing report', () => {
      const code = `
        (define-constant test-constant u42)
        (define-public (test-function)
          (ok test-constant)
        )
      `;
      
      const result = parser.parseText(code);
      const report = parser.generateParsingReport(result);
      
      expect(report).toContain('Enhanced Clarity Parser Report');
      expect(report).toContain('Status: SUCCESS');
      expect(report).toContain('Functions: 1');
      expect(report).toContain('Constants: 1');
    });
  });

  describe('Compatibility with Old Interface', () => {
    it('should extract functions in old format', () => {
      const code = `
        (define-public (func1) (ok true))
        (define-private (func2) (ok false))
      `;
      
      const result = parser.parseText(code);
      const functions = parser.extractFunctions(result.ast!);
      
      expect(functions.length).toBe(2);
      expect(functions[0].name).toBe('func1');
      expect(functions[1].name).toBe('func2');
    });

    it('should extract expressions in old format', () => {
      const code = '(define-constant test u42)';
      
      const result = parser.parseText(code);
      const expressions = parser.extractExpressions(result.ast!);
      
      expect(expressions.length).toBe(1);
      expect(expressions[0].type).toBe('constant-definition');
    });
  });

  describe('Advanced Features', () => {
    it('should handle trait definitions', () => {
      const code = `
        (define-trait my-trait
          ((get-value () (response uint uint)))
        )
      `;
      
      const result = parser.parseText(code);
      
      expect(result.success).toBe(true);
      expect(result.ast!.body.length).toBe(1);
      expect(result.ast!.body[0].type).toBe('trait-definition');
    });

    it('should handle NFT and FT definitions', () => {
      const code = `
        (define-non-fungible-token my-nft uint)
        (define-fungible-token my-token u1000000)
      `;
      
      const result = parser.parseText(code);
      
      expect(result.success).toBe(true);
      expect(result.ast!.body.length).toBe(2);
      expect(result.ast!.body[0].type).toBe('nft-definition');
      expect(result.ast!.body[1].type).toBe('ft-definition');
    });

    it('should analyze side effects in function calls', () => {
      const code = `
        (define-map user-data principal uint)
        (define-data-var total uint u0)
        
        (define-public (update-user (user principal) (value uint))
          (begin
            (map-set user-data user value)
            (var-set total (+ (var-get total) value))
            (ok true)
          )
        )
      `;
      
      const result = parser.parseText(code);
      
      expect(result.success).toBe(true);
      
      // Check that map and variable usage is tracked
      const typeEnv = result.semanticResult!.typeEnvironment;
      const userData = typeEnv.maps.get('user-data');
      const total = typeEnv.variables.get('total');
      
      expect(userData!.modified).toBe(true);
      expect(total!.accessed).toBe(true);
      expect(total!.modified).toBe(true);
    });
  });
});
