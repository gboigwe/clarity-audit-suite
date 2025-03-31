import { SimplifiedClarityParser } from '../src/parser/clarity-parser';

describe('SimplifiedClarityParser', () => {
  let parser: SimplifiedClarityParser;

  beforeEach(() => {
    parser = new SimplifiedClarityParser();
  });

  describe('parseText', () => {
    it('should parse a simple constant definition', () => {
      const code = '(define-constant contract-owner tx-sender)';
      const ast = parser.parseText(code);
      
      expect(ast).toBeDefined();
      expect(ast.type).toBe('program');
      expect(ast.body.length).toBeGreaterThan(0);
      
      const constants = ast.body.filter(node => node.type === 'constant-definition');
      expect(constants.length).toBe(1);
      expect(constants[0].name).toBe('contract-owner');
    });

    it('should parse a function definition', () => {
      const code = `
        (define-public (test-function (param1 uint))
          (ok param1)
        )
      `;
      const ast = parser.parseText(code);
      
      expect(ast).toBeDefined();
      expect(ast.type).toBe('program');
      
      const functions = ast.body.filter(node => node.type === 'function-definition');
      expect(functions.length).toBe(1);
      expect(functions[0].name).toBe('test-function');
      expect(functions[0].visibility).toBe('public');
    });

    it('should parse multiple expressions', () => {
      const code = `
        (define-constant contract-owner tx-sender)
        (define-data-var counter uint u0)
        (define-public (increment)
          (begin
            (var-set counter (+ (var-get counter) u1))
            (ok (var-get counter))
          )
        )
      `;
      const ast = parser.parseText(code);
      
      expect(ast).toBeDefined();
      expect(ast.type).toBe('program');
      
      const constants = ast.body.filter(node => node.type === 'constant-definition');
      expect(constants.length).toBe(1);
      
      const dataVars = ast.body.filter(node => node.type === 'data-var-definition');
      expect(dataVars.length).toBe(1);
      
      const functions = ast.body.filter(node => node.type === 'function-definition');
      expect(functions.length).toBe(1);
    });
  });

  describe('extractFunctions', () => {
    it('should extract functions from the AST', () => {
      const code = `
        (define-constant contract-owner tx-sender)
        (define-public (function1 (param1 uint))
          (ok param1)
        )
        (define-private (function2 (param1 uint) (param2 bool))
          (ok param1)
        )
        (define-read-only (function3)
          (ok true)
        )
      `;
      const ast = parser.parseText(code);
      const functions = parser.extractFunctions(ast);
      
      expect(functions).toBeDefined();
      expect(functions.length).toBe(3);
      
      const functionNames = functions.map(f => f.name);
      expect(functionNames).toContain('function1');
      expect(functionNames).toContain('function2');
      expect(functionNames).toContain('function3');
      
      const visibilities = functions.map(f => f.visibility);
      expect(visibilities).toContain('public');
      expect(visibilities).toContain('private');
      expect(visibilities).toContain('read-only');
    });
  });
});
