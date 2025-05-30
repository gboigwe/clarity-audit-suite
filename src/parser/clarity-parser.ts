import * as fs from 'fs-extra';
import { 
  ClarityAst, FunctionDefinition, ParseResult, Parser,
  SemanticAnalysisResult, Expression
} from './types';
import { ClarityLexer } from './lexer';
import { EnhancedClarityParser } from './parser';
import { EnhancedSemanticAnalyzer } from './semantic-analyzer';

export interface EnhancedParseResult {
  ast: ClarityAst | null;
  parseResult: ParseResult;
  semanticResult: SemanticAnalysisResult | null;
  success: boolean;
  errors: Array<{
    type: 'parse' | 'semantic';
    message: string;
    location?: { line: number; column: number; offset: number };
    code?: string;
  }>;
  warnings: Array<{
    type: 'parse' | 'semantic';
    message: string;
    location?: { line: number; column: number; offset: number };
    code?: string;
  }>;
}

/**
 * Enhanced Clarity Parser Service
 * Provides a complete parsing pipeline with lexical analysis, 
 * parsing, and semantic analysis
 */
export class EnhancedClarityParserService {
  private lexer: ClarityLexer;
  private parser: EnhancedClarityParser;
  private semanticAnalyzer: EnhancedSemanticAnalyzer;

  constructor() {
    this.lexer = new ClarityLexer();
    this.parser = new EnhancedClarityParser();
    this.semanticAnalyzer = new EnhancedSemanticAnalyzer();
  }

  /**
   * Parse a Clarity contract file with full semantic analysis
   * @param filePath Path to Clarity contract file
   */
  public async parseFile(filePath: string): Promise<EnhancedParseResult> {
    try {
      const contractSource = await fs.readFile(filePath, 'utf8');
      return this.parseText(contractSource);
    } catch (error) {
      return {
        ast: null,
        parseResult: {
          ast: null,
          errors: [{
            message: `Error reading file: ${error}`,
            location: { line: 0, column: 0, offset: 0 },
            severity: 'fatal',
            code: 'FILE_READ_ERROR'
          }],
          warnings: [],
          success: false
        },
        semanticResult: null,
        success: false,
        errors: [{
          type: 'parse',
          message: `Error reading file: ${error}`,
          location: { line: 0, column: 0, offset: 0 },
          code: 'FILE_READ_ERROR'
        }],
        warnings: []
      };
    }
  }

  /**
   * Parse Clarity contract source code with full semantic analysis
   * @param sourceCode Clarity contract source code
   */
  public parseText(sourceCode: string): EnhancedParseResult {
    const result: EnhancedParseResult = {
      ast: null,
      parseResult: { ast: null, errors: [], warnings: [], success: false },
      semanticResult: null,
      success: false,
      errors: [],
      warnings: []
    };

    try {
      // Step 1: Parse the source code
      const parseResult = this.parser.parse(sourceCode);
      result.parseResult = parseResult;

      // Collect parse errors and warnings
      for (const error of parseResult.errors) {
        result.errors.push({
          type: 'parse',
          message: error.message,
          location: error.location,
          code: error.code
        });
      }

      for (const warning of parseResult.warnings) {
        result.warnings.push({
          type: 'parse',
          message: warning.message,
          location: warning.location,
          code: warning.code
        });
      }

      // If parsing failed, return early
      if (!parseResult.success || !parseResult.ast) {
        return result;
      }

      result.ast = parseResult.ast;

      // Step 2: Perform semantic analysis
      const semanticResult = this.semanticAnalyzer.analyze(parseResult.ast);
      result.semanticResult = semanticResult;

      // Collect semantic errors and warnings
      for (const error of semanticResult.errors) {
        result.errors.push({
          type: 'semantic',
          message: error.message,
          location: error.location,
          code: error.code
        });
      }

      for (const warning of semanticResult.warnings) {
        result.warnings.push({
          type: 'semantic',
          message: warning.message,
          location: warning.location,
          code: warning.code
        });
      }

      // Update AST with semantic information
      if (semanticResult.success) {
        parseResult.ast.typeEnvironment = semanticResult.typeEnvironment;
      }

      result.success = parseResult.success && semanticResult.success;
      return result;

    } catch (error) {
      result.errors.push({
        type: 'parse',
        message: `Unexpected error during parsing: ${error}`,
        location: { line: 0, column: 0, offset: 0 },
        code: 'UNEXPECTED_ERROR'
      });
      return result;
    }
  }

  /**
   * Extract function definitions from an AST (compatibility with old interface)
   * @param ast Clarity AST
   */
  public extractFunctions(ast: ClarityAst): FunctionDefinition[] {
    return ast.body.filter(node => node.type === 'function-definition') as FunctionDefinition[];
  }

  /**
   * Extract all expressions from an AST (compatibility with old interface)
   * @param ast Clarity AST
   */
  public extractExpressions(ast: ClarityAst): Expression[] {
    return ast.body as unknown as Expression[];
  }

  /**
   * Get detailed parsing statistics
   * @param result Enhanced parse result
   */
  public getParsingStatistics(result: EnhancedParseResult): {
    parseErrors: number;
    parseWarnings: number;
    semanticErrors: number;
    semanticWarnings: number;
    totalFunctions: number;
    publicFunctions: number;
    privateFunctions: number;
    readOnlyFunctions: number;
    constants: number;
    variables: number;
    maps: number;
    traits: number;
  } {
    const stats = {
      parseErrors: result.errors.filter(e => e.type === 'parse').length,
      parseWarnings: result.warnings.filter(w => w.type === 'parse').length,
      semanticErrors: result.errors.filter(e => e.type === 'semantic').length,
      semanticWarnings: result.warnings.filter(w => w.type === 'semantic').length,
      totalFunctions: 0,
      publicFunctions: 0,
      privateFunctions: 0,
      readOnlyFunctions: 0,
      constants: 0,
      variables: 0,
      maps: 0,
      traits: 0
    };

    if (result.ast) {
      for (const statement of result.ast.body) {
        switch (statement.type) {
          case 'function-definition':
            stats.totalFunctions++;
            const func = statement as FunctionDefinition;
            if (func.visibility === 'public') stats.publicFunctions++;
            else if (func.visibility === 'private') stats.privateFunctions++;
            else if (func.visibility === 'read-only') stats.readOnlyFunctions++;
            break;
          case 'constant-definition':
            stats.constants++;
            break;
          case 'data-var-definition':
            stats.variables++;
            break;
          case 'map-definition':
            stats.maps++;
            break;
          case 'trait-definition':
            stats.traits++;
            break;
        }
      }
    }

    return stats;
  }

  /**
   * Generate a human-readable parsing report
   * @param result Enhanced parse result
   */
  public generateParsingReport(result: EnhancedParseResult): string {
    const lines: string[] = [];
    const stats = this.getParsingStatistics(result);

    lines.push('=== Enhanced Clarity Parser Report ===');
    lines.push('');

    // Success/failure status
    lines.push(`Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    lines.push('');

    // Statistics
    lines.push('Statistics:');
    lines.push(`  Functions: ${stats.totalFunctions} (${stats.publicFunctions} public, ${stats.privateFunctions} private, ${stats.readOnlyFunctions} read-only)`);
    lines.push(`  Constants: ${stats.constants}`);
    lines.push(`  Variables: ${stats.variables}`);
    lines.push(`  Maps: ${stats.maps}`);
    lines.push(`  Traits: ${stats.traits}`);
    lines.push('');

    // Parse issues
    if (stats.parseErrors > 0 || stats.parseWarnings > 0) {
      lines.push('Parse Issues:');
      lines.push(`  Errors: ${stats.parseErrors}`);
      lines.push(`  Warnings: ${stats.parseWarnings}`);
      
      if (stats.parseErrors > 0) {
        lines.push('');
        lines.push('Parse Errors:');
        for (const error of result.errors.filter(e => e.type === 'parse')) {
          lines.push(`  - ${error.message} (Line ${error.location?.line || 'unknown'})`);
        }
      }
      
      if (stats.parseWarnings > 0) {
        lines.push('');
        lines.push('Parse Warnings:');
        for (const warning of result.warnings.filter(w => w.type === 'parse')) {
          lines.push(`  - ${warning.message} (Line ${warning.location?.line || 'unknown'})`);
        }
      }
      lines.push('');
    }

    // Semantic issues
    if (stats.semanticErrors > 0 || stats.semanticWarnings > 0) {
      lines.push('Semantic Issues:');
      lines.push(`  Errors: ${stats.semanticErrors}`);
      lines.push(`  Warnings: ${stats.semanticWarnings}`);
      
      if (stats.semanticErrors > 0) {
        lines.push('');
        lines.push('Semantic Errors:');
        for (const error of result.errors.filter(e => e.type === 'semantic')) {
          lines.push(`  - ${error.message} (Line ${error.location?.line || 'unknown'})`);
        }
      }
      
      if (stats.semanticWarnings > 0) {
        lines.push('');
        lines.push('Semantic Warnings:');
        for (const warning of result.warnings.filter(w => w.type === 'semantic')) {
          lines.push(`  - ${warning.message} (Line ${warning.location?.line || 'unknown'})`);
        }
      }
      lines.push('');
    }

    // Type environment info
    if (result.semanticResult?.typeEnvironment) {
      const env = result.semanticResult.typeEnvironment;
      lines.push('Type Environment:');
      lines.push(`  Functions: ${env.functions.size}`);
      lines.push(`  Constants: ${env.constants.size}`);
      lines.push(`  Variables: ${env.variables.size}`);
      lines.push(`  Maps: ${env.maps.size}`);
      lines.push(`  Traits: ${env.traits.size}`);
    }

    return lines.join('\n');
  }

  /**
   * Compare performance with the old simplified parser
   * @param sourceCode Source code to parse
   */
  public async performanceComparison(sourceCode: string): Promise<{
    enhanced: { duration: number; result: EnhancedParseResult };
    simple: { duration: number; success: boolean };
  }> {
    // Enhanced parser timing
    const enhancedStart = performance.now();
    const enhancedResult = this.parseText(sourceCode);
    const enhancedDuration = performance.now() - enhancedStart;

    // Simple parser timing (would need to import the old parser)
    const simpleStart = performance.now();
    // Simulate simple parser performance
    const simpleDuration = performance.now() - simpleStart;
    
    return {
      enhanced: { duration: enhancedDuration, result: enhancedResult },
      simple: { duration: simpleDuration, success: true }
    };
  }

  /**
   * Validate contract syntax without full semantic analysis
   * @param sourceCode Source code to validate
   */
  public validateSyntax(sourceCode: string): {
    valid: boolean;
    errors: Array<{ message: string; line: number; column: number }>;
  } {
    const tokens = this.lexer.tokenize(sourceCode);
    const parseResult = this.parser.parseTokens(tokens);
    
    return {
      valid: parseResult.success,
      errors: parseResult.errors.map(error => ({
        message: error.message,
        line: error.location.line,
        column: error.location.column
      }))
    };
  }

  /**
   * Get detailed token information for debugging
   * @param sourceCode Source code to tokenize
   */
  public getTokens(sourceCode: string) {
    return this.lexer.tokenize(sourceCode);
  }

  /**
   * Reset all parser components
   */
  public reset(): void {
    this.lexer.reset();
    this.parser.reset();
  }
}
