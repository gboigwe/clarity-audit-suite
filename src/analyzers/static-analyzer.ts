import { ClarityAst, ClarityNode, FunctionDefinition } from '../parser/types';
import { AstUtils } from '../utils/ast-utils';

export interface AnalysisIssue {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: {
    line?: number;
    column?: number;
  };
  code?: string;
  suggestion?: string;
}

export interface AnalysisResult {
  issues: AnalysisIssue[];
  metrics: {
    functionCount: number;
    publicFunctionCount: number;
    privateFunctionCount: number;
    readOnlyFunctionCount: number;
    mapCount: number;
    constantCount: number;
    varCount: number;
    complexityScore: number;
  };
}

export class StaticAnalyzer {
  /**
   * Analyze a Clarity contract AST for common issues and metrics
   * @param ast The AST to analyze
   */
  public analyze(ast: ClarityAst): AnalysisResult {
    const issues: AnalysisIssue[] = [];
    
    // Run all analysis checks
    issues.push(
      ...this.checkUnusedFunctions(ast),
      ...this.checkUnusedVariables(ast),
      ...this.checkUnsafeOperations(ast),
      ...this.checkNamingConventions(ast),
      ...this.checkCodeStyle(ast)
    );
    
    // Calculate metrics
    const metrics = this.calculateMetrics(ast);
    
    return {
      issues,
      metrics
    };
  }
  
  /**
   * Check for unused functions in the contract
   * @param ast The AST to analyze
   */
  private checkUnusedFunctions(ast: ClarityAst): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const functionDefinitions = AstUtils.findNodesByType(ast, 'function-definition') as FunctionDefinition[];
    
    // Get all function calls
    const functionCalls = AstUtils.findNodesByType(ast, 'function-call');
    const calledFunctionNames = new Set(functionCalls.map(call => call.name));
    
    // Check for private functions that are never called
    for (const func of functionDefinitions) {
      // Skip public and read-only functions as they might be called externally
      if (func.visibility === 'private' && !calledFunctionNames.has(func.name)) {
        issues.push({
          type: 'unused-function',
          severity: 'warning',
          message: `Private function '${func.name}' is defined but never called`,
          suggestion: `Consider removing the unused function or making sure it's called where needed.`
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Check for unused variables and constants in the contract
   * @param ast The AST to analyze
   */
  private checkUnusedVariables(ast: ClarityAst): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    
    // Find all constant definitions
    const constantDefinitions = AstUtils.findNodesByType(ast, 'constant-definition');
    const constantNames = constantDefinitions.map(def => def.name);
    
    // Find all identifiers in the code
    const identifierUsages = new Set<string>();
    
    const collectIdentifiers = (node: ClarityNode) => {
      if (node.type === 'identifier') {
        identifierUsages.add(node.value);
      }
      
      // Recursively collect from children
      Object.keys(node).forEach(key => {
        const value = node[key];
        
        if (Array.isArray(value)) {
          value.forEach(item => {
            if (item && typeof item === 'object' && 'type' in item) {
              collectIdentifiers(item);
            }
          });
        } else if (value && typeof value === 'object' && 'type' in value) {
          collectIdentifiers(value);
        }
      });
    };
    
    ast.body.forEach(collectIdentifiers);
    
    // Check for unused constants
    for (const name of constantNames) {
      if (!identifierUsages.has(name)) {
        issues.push({
          type: 'unused-constant',
          severity: 'warning',
          message: `Constant '${name}' is defined but never used`,
          suggestion: `Consider removing the unused constant if it's not needed.`
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Check for potentially unsafe operations in the contract
   * @param ast The AST to analyze
   */
  private checkUnsafeOperations(ast: ClarityAst): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    
    // Check for unwrap! or unwrap-panic without proper error handling
    const unwrapCalls = [
      ...AstUtils.findFunctionCalls(ast, 'unwrap!'),
      ...AstUtils.findFunctionCalls(ast, 'unwrap-panic')
    ];
    
    if (unwrapCalls.length > 0) {
      issues.push({
        type: 'unsafe-unwrap',
        severity: 'warning',
        message: `Found ${unwrapCalls.length} usage(s) of unwrap! or unwrap-panic, which can lead to runtime errors`,
        suggestion: `Consider using 'match' or 'asserts!' with proper error handling instead.`
      });
    }
    
    // Check for unsafe division operations that might cause division by zero
    const divCalls = AstUtils.findFunctionCalls(ast, '/');
    if (divCalls.length > 0) {
      issues.push({
        type: 'potential-division-by-zero',
        severity: 'info',
        message: `Found ${divCalls.length} division operation(s). Ensure divisors cannot be zero`,
        suggestion: `Consider adding checks before division to ensure the divisor is not zero.`
      });
    }
    
    return issues;
  }
  
  /**
   * Check for adherence to naming conventions
   * @param ast The AST to analyze
   */
  private checkNamingConventions(ast: ClarityAst): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    
    // Check function naming convention (should use kebab-case)
    const functionDefinitions = AstUtils.findNodesByType(ast, 'function-definition') as FunctionDefinition[];
    
    for (const func of functionDefinitions) {
      if (!/^[a-z][a-z0-9-]*$/.test(func.name)) {
        issues.push({
          type: 'naming-convention',
          severity: 'info',
          message: `Function name '${func.name}' does not follow kebab-case convention (lowercase with hyphens)`,
          suggestion: `Rename to follow kebab-case convention, e.g., '${func.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}'`
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Check for code style issues
   * @param ast The AST to analyze
   */
  private checkCodeStyle(ast: ClarityAst): AnalysisIssue[] {
    // This would include checks for consistent formatting, proper commenting, etc.
    return [];
  }
  
  /**
   * Calculate metrics about the contract
   * @param ast The AST to analyze
   */
  private calculateMetrics(ast: ClarityAst): AnalysisResult['metrics'] {
    // Find all relevant definitions
    const functionDefinitions = AstUtils.findNodesByType(ast, 'function-definition') as FunctionDefinition[];
    const mapDefinitions = AstUtils.findNodesByType(ast, 'map-definition');
    const constantDefinitions = AstUtils.findNodesByType(ast, 'constant-definition');
    const varDefinitions = AstUtils.findNodesByType(ast, 'data-var-definition');
    
    // Count by visibility
    const publicFunctions = functionDefinitions.filter(func => func.visibility === 'public');
    const privateFunctions = functionDefinitions.filter(func => func.visibility === 'private');
    const readOnlyFunctions = functionDefinitions.filter(func => func.visibility === 'read-only');
    
    // Calculate complexity score (simplified)
    const complexityScore = functionDefinitions.reduce((score, func) => {
      // +1 for the function itself
      let functionScore = 1;
      
      // +1 for each parameter
      functionScore += func.params ? func.params.length : 0;
      
      // +1 for each expression in the body
      functionScore += func.body ? func.body.length : 0;
      
      return score + functionScore;
    }, 0);
    
    return {
      functionCount: functionDefinitions.length,
      publicFunctionCount: publicFunctions.length,
      privateFunctionCount: privateFunctions.length,
      readOnlyFunctionCount: readOnlyFunctions.length,
      mapCount: mapDefinitions.length,
      constantCount: constantDefinitions.length,
      varCount: varDefinitions.length,
      complexityScore
    };
  }
}
