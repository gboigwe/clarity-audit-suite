import * as fs from 'fs-extra';
import { ClarityAst, ClarityNode, FunctionDefinition, Expression } from './types';

export class SimplifiedClarityParser {
  /**
   * Parse a Clarity contract file into a simplified AST
   * @param filePath Path to Clarity contract file
   */
  public async parseFile(filePath: string): Promise<ClarityAst> {
    try {
      const contractSource = await fs.readFile(filePath, 'utf8');
      return this.parseText(contractSource);
    } catch (error) {
      console.error(`Error parsing file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Parse Clarity contract source code into a simplified AST
   * This is a very basic parser that just recognizes functions and constants
   * @param sourceCode Clarity contract source code
   */
  public parseText(sourceCode: string): ClarityAst {
    // Remove comments
    const cleanedSource = sourceCode.replace(/;;.*/g, '');
    
    // Split the source into lines
    const lines = cleanedSource.split('\n');
    
    const ast: ClarityAst = {
      type: 'program',
      body: []
    };
    
    // Extract function definitions (very simplified)
    const functionRegex = /\(define(?:-public|-private|-read-only)?\s+\(([a-zA-Z0-9\-_!?+<>=\/%*]+)/g;
    let match;
    
    while ((match = functionRegex.exec(sourceCode)) !== null) {
      const functionName = match[1];
      
      const functionDef: FunctionDefinition = {
        type: 'function-definition',
        name: functionName,
        params: [], // Simplified - not actually parsing params
        body: [],   // Simplified - not actually parsing body
      };
      
      // Determine visibility
      if (match[0].includes('define-public')) {
        functionDef.visibility = 'public';
      } else if (match[0].includes('define-private')) {
        functionDef.visibility = 'private';
      } else if (match[0].includes('define-read-only')) {
        functionDef.visibility = 'read-only';
      }
      
      ast.body.push(functionDef);
    }
    
    // Extract constant definitions (very simplified)
    const constantRegex = /\(define-constant\s+([a-zA-Z0-9\-_!?+<>=\/%*]+)\s+/g;
    
    while ((match = constantRegex.exec(sourceCode)) !== null) {
      const constantName = match[1];
      
      const constantDef = {
        type: 'constant-definition',
        name: constantName,
        value: { type: 'value', value: 'unknown' } // Simplified - not actually parsing value
      };
      
      ast.body.push(constantDef);
    }
    
    // Extract map definitions (very simplified)
    const mapRegex = /\(define-map\s+([a-zA-Z0-9\-_!?+<>=\/%*]+)/g;
    
    while ((match = mapRegex.exec(sourceCode)) !== null) {
      const mapName = match[1];
      
      const mapDef = {
        type: 'map-definition',
        name: mapName,
        keyType: { type: 'type', value: 'unknown' },   // Simplified
        valueType: { type: 'type', value: 'unknown' }, // Simplified
      };
      
      ast.body.push(mapDef);
    }
    
    // Extract data var definitions (very simplified)
    const varRegex = /\(define-data-var\s+([a-zA-Z0-9\-_!?+<>=\/%*]+)/g;
    
    while ((match = varRegex.exec(sourceCode)) !== null) {
      const varName = match[1];
      
      const varDef = {
        type: 'data-var-definition',
        name: varName,
        varType: { type: 'type', value: 'unknown' },      // Simplified
        initialValue: { type: 'value', value: 'unknown' } // Simplified
      };
      
      ast.body.push(varDef);
    }
    
    // Extract function calls (very simplified - just looking for unwrap and div)
    const unwrapCalls = (sourceCode.match(/\(unwrap!/g) || []).map(() => ({
      type: 'function-call',
      name: 'unwrap!',
      arguments: [] // Simplified
    }));
    
    const unwrapPanicCalls = (sourceCode.match(/\(unwrap-panic/g) || []).map(() => ({
      type: 'function-call',
      name: 'unwrap-panic',
      arguments: [] // Simplified
    }));
    
    const divCalls = (sourceCode.match(/\(\//g) || []).map(() => ({
      type: 'function-call',
      name: '/',
      arguments: [] // Simplified
    }));
    
    ast.body.push(...unwrapCalls, ...unwrapPanicCalls, ...divCalls);
    
    return ast;
  }

  /**
   * Extract function definitions from an AST
   * @param ast Clarity AST
   */
  public extractFunctions(ast: ClarityAst): FunctionDefinition[] {
    return ast.body.filter(node => node.type === 'function-definition') as FunctionDefinition[];
  }

  /**
   * Extract all expressions from an AST
   * @param ast Clarity AST
   */
  public extractExpressions(ast: ClarityAst): Expression[] {
    return ast.body as Expression[];
  }
}
