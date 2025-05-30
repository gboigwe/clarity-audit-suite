import { 
  ClarityAst as EnhancedAst, 
  FunctionDefinition as EnhancedFunction,
  TypeEnvironment,
  ConstantDefinition,
  MapDefinition,
  DataVarDefinition,
  FunctionCall,
  Expression,
  Identifier,
  SideEffect
} from '../parser/types';
import { 
  AnalysisResult, 
  AnalysisIssue, 
  StaticAnalyzer as BaseStaticAnalyzer 
} from './static-analyzer';

export interface EnhancedAnalysisResult extends AnalysisResult {
  semanticIssues: AnalysisIssue[];
  typeEnvironment: TypeEnvironment;
  callGraph: CallGraphNode[];
  dataFlowGraph: DataFlowNode[];
  vulnerabilities: VulnerabilityIssue[];
}

export interface CallGraphNode {
  functionName: string;
  calls: string[];
  calledBy: string[];
  isExternal: boolean;
  modifiesState: boolean;
}

export interface DataFlowNode {
  name: string;
  type: 'variable' | 'map' | 'constant';
  readers: string[];
  writers: string[];
  dependencies: string[];
}

export interface VulnerabilityIssue extends AnalysisIssue {
  category: 'reentrancy' | 'overflow' | 'authorization' | 'unsafe-operation' | 'state-inconsistency';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  cwe?: string; // Common Weakness Enumeration ID
  recommendation: string;
  codeExample?: string;
}

/**
 * Enhanced Static Analyzer that works with the new parser
 * Provides backward compatibility with the old analyzer interface
 */
export class EnhancedStaticAnalyzer extends BaseStaticAnalyzer {
  
  /**
   * Analyze an enhanced AST with comprehensive security analysis
   * @param ast Enhanced Clarity AST with semantic information
   */
  public analyzeEnhanced(ast: EnhancedAst): EnhancedAnalysisResult {
    // Start with base analysis for backward compatibility
    const baseResult = this.analyze(this.convertToOldAst(ast));
    
    const enhancedResult: EnhancedAnalysisResult = {
      ...baseResult,
      semanticIssues: [],
      typeEnvironment: ast.typeEnvironment,
      callGraph: this.buildCallGraph(ast),
      dataFlowGraph: this.buildDataFlowGraph(ast),
      vulnerabilities: []
    };

    // Enhanced analysis using semantic information
    enhancedResult.semanticIssues.push(
      ...this.analyzeWithSemanticInfo(ast),
      ...this.analyzeUnusedCode(ast),
      ...this.analyzeStateManagement(ast)
    );

    // Vulnerability detection
    enhancedResult.vulnerabilities.push(
      ...this.detectReentrancyVulnerabilities(ast),
      ...this.detectOverflowVulnerabilities(ast),
      ...this.detectAuthorizationIssues(ast),
      ...this.detectUnsafeOperations(ast),
      ...this.detectStateInconsistencies(ast)
    );

    // Merge all issues
    enhancedResult.issues = [
      ...baseResult.issues,
      ...enhancedResult.semanticIssues,
      ...enhancedResult.vulnerabilities
    ];

    return enhancedResult;
  }

  /**
   * Analyze using semantic information from the enhanced parser
   */
  private analyzeWithSemanticInfo(ast: EnhancedAst): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const typeEnv = ast.typeEnvironment;

    // Analyze function complexity and calls
    for (const [funcName, funcSig] of typeEnv.functions) {
      const funcDef = this.findFunctionDefinition(ast, funcName);
      if (funcDef) {
        // Check function complexity
        if (funcDef.parameters.length > 10) {
          issues.push({
            type: 'high-complexity',
            severity: 'warning',
            message: `Function '${funcName}' has many parameters (${funcDef.parameters.length}), consider refactoring`,
            suggestion: 'Consider using a tuple or breaking the function into smaller functions.',
            location: funcDef.location ? { 
                line: funcDef.location.start.line, 
                column: funcDef.location.start.column 
            } : undefined
          });
        }

        // Check for functions that are both external and state-modifying
        if (funcSig.visibility === 'public' && funcDef.modifiesState && !funcDef.callsExternal) {
          issues.push({
            type: 'state-modification-public',
            severity: 'info',
            message: `Public function '${funcName}' modifies state without external calls`,
            suggestion: 'Ensure proper access controls are in place for state-modifying public functions.',
            location: funcDef.location ? { 
                line: funcDef.location.start.line, 
                column: funcDef.location.start.column 
            } : undefined
          });
        }

        // Check for functions that can fail without proper error handling
        if (funcDef.canFail && funcSig.visibility === 'public') {
          issues.push({
            type: 'unhandled-failure',
            severity: 'warning',
            message: `Public function '${funcName}' can fail, ensure callers handle errors properly`,
            suggestion: 'Document the error conditions and ensure proper error handling in calling code.',
            location: funcDef.location ? { 
                line: funcDef.location.start.line, 
                column: funcDef.location.start.column 
            } : undefined
          });
        }
      }
    }

    return issues;
  }

  /**
   * Enhanced unused code analysis using semantic information
   */
  private analyzeUnusedCode(ast: EnhancedAst): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const typeEnv = ast.typeEnvironment;

    // Check unused constants with semantic info
    for (const [name, constant] of typeEnv.constants) {
      if (!constant.used) {
        issues.push({
          type: 'unused-constant',
          severity: 'warning',
          message: `Constant '${name}' is defined but never used`,
          suggestion: 'Remove unused constants to reduce contract size and improve readability.',
          location: this.findConstantLocation(ast, name)
        });
      }
    }

    // Check unused variables
    for (const [name, variable] of typeEnv.variables) {
      if (!variable.accessed) {
        issues.push({
          type: 'unused-variable',
          severity: 'warning',
          message: `Variable '${name}' is defined but never accessed`,
          suggestion: 'Remove unused variables or ensure they are accessed where needed.',
          location: this.findVariableLocation(ast, name)
        });
      }
    }

    // Check unused maps
    for (const [name, map] of typeEnv.maps) {
      if (!map.accessed) {
        issues.push({
          type: 'unused-map',
          severity: 'warning',
          message: `Map '${name}' is defined but never accessed`,
          suggestion: 'Remove unused maps to reduce contract size.',
          location: this.findMapLocation(ast, name)
        });
      }
    }

    return issues;
  }

  /**
   * Analyze state management patterns
   */
  private analyzeStateManagement(ast: EnhancedAst): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const typeEnv = ast.typeEnvironment;

    // Check for variables that are written but never read
    for (const [name, variable] of typeEnv.variables) {
      if (variable.modified && !variable.accessed) {
        issues.push({
          type: 'write-only-variable',
          severity: 'warning',
          message: `Variable '${name}' is modified but never read`,
          suggestion: 'Ensure variables that are modified are also read, or remove unnecessary writes.',
          location: this.findVariableLocation(ast, name)
        });
      }
    }

    // Check for maps that are written but never read
    for (const [name, map] of typeEnv.maps) {
      if (map.modified && !map.accessed) {
        issues.push({
          type: 'write-only-map',
          severity: 'warning',
          message: `Map '${name}' is modified but never read`,
          suggestion: 'Ensure maps that are modified are also accessed, or remove unnecessary writes.',
          location: this.findMapLocation(ast, name)
        });
      }
    }

    return issues;
  }

  /**
   * Build call graph from the AST
   */
  private buildCallGraph(ast: EnhancedAst): CallGraphNode[] {
    const callGraph: CallGraphNode[] = [];
    const typeEnv = ast.typeEnvironment;

    for (const [funcName, funcSig] of typeEnv.functions) {
      const funcDef = this.findFunctionDefinition(ast, funcName);
      if (funcDef) {
        const calls = this.findFunctionCalls(funcDef.body);
        
        const node: CallGraphNode = {
          functionName: funcName,
          calls: calls,
          calledBy: [], // Will be populated in second pass
          isExternal: funcDef.callsExternal,
          modifiesState: funcDef.modifiesState
        };
        
        callGraph.push(node);
      }
    }

    // Second pass: populate calledBy relationships
    for (const node of callGraph) {
      for (const calledFunc of node.calls) {
        const calledNode = callGraph.find(n => n.functionName === calledFunc);
        if (calledNode) {
          calledNode.calledBy.push(node.functionName);
        }
      }
    }

    return callGraph;
  }

  /**
   * Build data flow graph from the AST
   */
  private buildDataFlowGraph(ast: EnhancedAst): DataFlowNode[] {
    const dataFlow: DataFlowNode[] = [];
    const typeEnv = ast.typeEnvironment;

    // Variables
    for (const [name, variable] of typeEnv.variables) {
      dataFlow.push({
        name,
        type: 'variable',
        readers: this.findVariableReaders(ast, name),
        writers: this.findVariableWriters(ast, name),
        dependencies: this.findVariableDependencies(ast, name)
      });
    }

    // Maps
    for (const [name, map] of typeEnv.maps) {
      dataFlow.push({
        name,
        type: 'map',
        readers: this.findMapReaders(ast, name),
        writers: this.findMapWriters(ast, name),
        dependencies: this.findMapDependencies(ast, name)
      });
    }

    // Constants
    for (const [name, constant] of typeEnv.constants) {
      dataFlow.push({
        name,
        type: 'constant',
        readers: this.findConstantReaders(ast, name),
        writers: [], // Constants can't be written to
        dependencies: this.findConstantDependencies(ast, name)
      });
    }

    return dataFlow;
  }

  /**
   * Detect reentrancy vulnerabilities
   */
  private detectReentrancyVulnerabilities(ast: EnhancedAst): VulnerabilityIssue[] {
    const vulnerabilities: VulnerabilityIssue[] = [];
    
    for (const statement of ast.body) {
      if (statement.type === 'function-definition') {
        const func = statement as EnhancedFunction;
        
        // Check for external calls followed by state modifications
        const hasReentrancyPattern = this.hasReentrancyPattern(func.body);
        
        if (hasReentrancyPattern) {
          vulnerabilities.push({
            type: 'reentrancy-vulnerability',
            category: 'reentrancy',
            severity: 'error',
            riskLevel: 'high',
            cwe: 'CWE-841',
            message: `Function '${func.name}' may be vulnerable to reentrancy attacks`,
            recommendation: 'Use the checks-effects-interactions pattern: perform all checks first, then update state, then make external calls.',
            suggestion: 'Move state updates before external calls or use reentrancy guards.',
            location: func.location ? { 
                line: func.location.start.line, 
                column: func.location.start.column 
              } : undefined,
            codeExample: `
;; BAD: External call before state update
(define-public (withdraw (amount uint))
  (begin
    (unwrap! (stx-transfer? amount tx-sender recipient) (err u1))
    (map-set balances tx-sender (- (get-balance tx-sender) amount))
    (ok true)
  )
)

;; GOOD: State update before external call
(define-public (withdraw (amount uint))
  (begin
    (map-set balances tx-sender (- (get-balance tx-sender) amount))
    (unwrap! (stx-transfer? amount tx-sender recipient) (err u1))
    (ok true)
  )
)`
          });
        }
      }
    }
    
    return vulnerabilities;
  }

  /**
   * Detect integer overflow/underflow vulnerabilities
   */
  private detectOverflowVulnerabilities(ast: EnhancedAst): VulnerabilityIssue[] {
    const vulnerabilities: VulnerabilityIssue[] = [];
    
    for (const statement of ast.body) {
      if (statement.type === 'function-definition') {
        const func = statement as EnhancedFunction;
        
        const unsafeArithmetic = this.findUnsafeArithmetic(func.body);
        
        for (const operation of unsafeArithmetic) {
          vulnerabilities.push({
            type: 'integer-overflow',
            category: 'overflow',
            severity: 'warning',
            riskLevel: 'medium',
            cwe: 'CWE-190',
            message: `Potential integer overflow in ${operation.operation} operation`,
            recommendation: 'Add bounds checking before arithmetic operations to prevent overflow/underflow.',
            suggestion: 'Use safe arithmetic patterns or add explicit bounds checks.',
            location: operation.location,
            codeExample: `
;; BAD: No overflow check
(+ balance amount)

;; GOOD: With overflow check
(asserts! (<= amount (- u340282366920938463463374607431768211455 balance)) (err u1))
(+ balance amount)`
          });
        }
      }
    }
    
    return vulnerabilities;
  }

  /**
   * Detect authorization issues
   */
  private detectAuthorizationIssues(ast: EnhancedAst): VulnerabilityIssue[] {
    const vulnerabilities: VulnerabilityIssue[] = [];
    
    for (const statement of ast.body) {
      if (statement.type === 'function-definition') {
        const func = statement as EnhancedFunction;
        
        // Check public functions that modify state without authorization
        if (func.visibility === 'public' && func.modifiesState) {
          const hasAuth = this.hasAuthorizationCheck(func.body);
          
          if (!hasAuth) {
            vulnerabilities.push({
              type: 'missing-authorization',
              category: 'authorization',
              severity: 'error',
              riskLevel: 'high',
              cwe: 'CWE-862',
              message: `Public function '${func.name}' modifies state without authorization checks`,
              recommendation: 'Add proper authorization checks to ensure only authorized users can modify state.',
              suggestion: 'Use tx-sender verification, role-based access control, or ownership patterns.',
              location: func.location ? { 
                line: func.location.start.line, 
                column: func.location.start.column 
              } : undefined,
              codeExample: `
;; BAD: No authorization check
(define-public (admin-function)
  (begin
    (var-set important-config u42)
    (ok true)
  )
)

;; GOOD: With authorization check
(define-public (admin-function)
  (begin
    (asserts! (is-eq tx-sender contract-owner) (err u401))
    (var-set important-config u42)
    (ok true)
  )
)`
            });
          }
        }
      }
    }
    
    return vulnerabilities;
  }

  /**
   * Detect unsafe operations
   */
  private detectUnsafeOperations(ast: EnhancedAst): VulnerabilityIssue[] {
    const vulnerabilities: VulnerabilityIssue[] = [];
    
    for (const statement of ast.body) {
      if (statement.type === 'function-definition') {
        const func = statement as EnhancedFunction;
        
        const unsafeOps = this.findUnsafeOperations(func.body);
        
        for (const op of unsafeOps) {
          vulnerabilities.push({
            type: 'unsafe-operation',
            category: 'unsafe-operation',
            severity: 'warning',
            riskLevel: 'medium',
            message: `Unsafe operation: ${op.operation}`,
            recommendation: op.recommendation,
            suggestion: op.suggestion,
            location: op.location
          });
        }
      }
    }
    
    return vulnerabilities;
  }

  /**
   * Detect state inconsistencies
   */
  private detectStateInconsistencies(ast: EnhancedAst): VulnerabilityIssue[] {
    const vulnerabilities: VulnerabilityIssue[] = [];
    
    // Check for potential state inconsistencies based on data flow
    const dataFlow = this.buildDataFlowGraph(ast);
    
    for (const node of dataFlow) {
      if (node.type === 'variable' && node.writers.length > 1) {
        // Multiple writers to the same variable could cause race conditions
        vulnerabilities.push({
          type: 'state-inconsistency',
          category: 'state-inconsistency',
          severity: 'info',
          riskLevel: 'low',
          message: `Variable '${node.name}' is modified by multiple functions: ${node.writers.join(', ')}`,
          recommendation: 'Ensure proper synchronization and access patterns for shared state.',
          suggestion: 'Consider using atomic operations or restructuring to avoid race conditions.',
          location: this.findVariableLocation(ast, node.name)
        });
      }
    }
    
    return vulnerabilities;
  }

  // Helper methods for vulnerability detection

  private hasReentrancyPattern(expressions: Expression[]): boolean {
    let hasExternalCall = false;
    let hasStateModAfterCall = false;
    
    for (let i = 0; i < expressions.length; i++) {
      const expr = expressions[i];
      
      if (this.isExternalCall(expr)) {
        hasExternalCall = true;
      } else if (hasExternalCall && this.isStateModification(expr)) {
        hasStateModAfterCall = true;
        break;
      }
    }
    
    return hasExternalCall && hasStateModAfterCall;
  }

  private findUnsafeArithmetic(expressions: Expression[]): Array<{
    operation: string;
    location: any;
  }> {
    const unsafe: Array<{ operation: string; location: any }> = [];
    
    for (const expr of expressions) {
      if (expr.type === 'function-call') {
        const call = expr as FunctionCall;
        const funcName = this.getFunctionName(call.function);
        
        if (['+', '-', '*'].includes(funcName)) {
          // Check if this arithmetic operation has bounds checking
          if (!this.hasArithmeticBoundsCheck(call)) {
            unsafe.push({
              operation: funcName,
              location: expr.location
            });
          }
        }
      }
    }
    
    return unsafe;
  }

  private hasAuthorizationCheck(expressions: Expression[]): boolean {
    for (const expr of expressions) {
      if (this.isAuthorizationCheck(expr)) {
        return true;
      }
    }
    return false;
  }

  private findUnsafeOperations(expressions: Expression[]): Array<{
    operation: string;
    recommendation: string;
    suggestion: string;
    location: any;
  }> {
    const unsafe: Array<{
      operation: string;
      recommendation: string;
      suggestion: string;
      location: any;
    }> = [];
    
    for (const expr of expressions) {
      if (expr.type === 'function-call') {
        const call = expr as FunctionCall;
        const funcName = this.getFunctionName(call.function);
        
        if (funcName === 'unwrap!' || funcName === 'unwrap-panic') {
          unsafe.push({
            operation: funcName,
            recommendation: 'Use proper error handling instead of unwrap! or unwrap-panic.',
            suggestion: 'Consider using match expressions or asserts! with proper error handling.',
            location: expr.location
          });
        }
        
        if (funcName === '/') {
          unsafe.push({
            operation: 'division',
            recommendation: 'Check for division by zero before performing division.',
            suggestion: 'Add assertions to ensure the divisor is not zero.',
            location: expr.location
          });
        }
      }
    }
    
    return unsafe;
  }

  // Additional helper methods
  private isExternalCall(expr: Expression): boolean {
    if (expr.type === 'function-call') {
      const call = expr as FunctionCall;
      return call.isExternal || this.getFunctionName(call.function) === 'contract-call?';
    }
    return false;
  }

  private isStateModification(expr: Expression): boolean {
    if (expr.type === 'function-call') {
      const call = expr as FunctionCall;
      const funcName = this.getFunctionName(call.function);
      return ['var-set', 'map-set', 'map-insert', 'map-delete'].includes(funcName);
    }
    return false;
  }

  private isAuthorizationCheck(expr: Expression): boolean {
    if (expr.type === 'function-call') {
      const call = expr as FunctionCall;
      const funcName = this.getFunctionName(call.function);
      
      if (funcName === 'asserts!' || funcName === 'is-eq') {
        // Check if it involves tx-sender or contract-caller
        return this.involvesAuthIdentifiers(call.arguments);
      }
    }
    return false;
  }

  private hasArithmeticBoundsCheck(call: FunctionCall): boolean {
    // Simplified implementation - would need more sophisticated analysis
    return false;
  }

  private involvesAuthIdentifiers(args: Expression[]): boolean {
    for (const arg of args) {
      if (arg.type === 'identifier') {
        const id = arg as Identifier;
        if (['tx-sender', 'contract-caller', 'contract-owner'].includes(id.name)) {
          return true;
        }
      }
    }
    return false;
  }

  private getFunctionName(expr: Expression): string {
    if (expr.type === 'identifier') {
      return (expr as Identifier).name;
    }
    return '';
  }

  // Conversion methods for backward compatibility
  private convertToOldAst(enhancedAst: EnhancedAst): any {
    // Convert enhanced AST to old format for backward compatibility
    return {
      type: 'program',
      body: enhancedAst.body.map(stmt => this.convertStatement(stmt))
    };
  }

  private convertStatement(stmt: any): any {
    // Convert enhanced statements to old format
    switch (stmt.type) {
      case 'function-definition':
        return {
          type: 'function-definition',
          name: stmt.name,
          visibility: stmt.visibility,
          params: stmt.parameters.map((p: any) => ({
            name: p.name,
            type: p.paramType.kind || 'unknown'
          })),
          body: stmt.body
        };
      case 'constant-definition':
        return {
          type: 'constant-definition',
          name: stmt.name,
          value: stmt.value
        };
      default:
        return stmt;
    }
  }

  // Helper methods to find AST nodes
  private findFunctionDefinition(ast: EnhancedAst, name: string): EnhancedFunction | undefined {
    return ast.body.find(stmt => 
      stmt.type === 'function-definition' && (stmt as EnhancedFunction).name === name
    ) as EnhancedFunction | undefined;
  }

  private findConstantLocation(ast: EnhancedAst, name: string): any {
    const constant = ast.body.find(stmt => 
      stmt.type === 'constant-definition' && (stmt as ConstantDefinition).name === name
    );
    return constant?.location;
  }

  private findVariableLocation(ast: EnhancedAst, name: string): any {
    const variable = ast.body.find(stmt => 
      stmt.type === 'data-var-definition' && (stmt as DataVarDefinition).name === name
    );
    return variable?.location;
  }

  private findMapLocation(ast: EnhancedAst, name: string): any {
    const map = ast.body.find(stmt => 
      stmt.type === 'map-definition' && (stmt as MapDefinition).name === name
    );
    return map?.location;
  }

  private findFunctionCalls(expressions: Expression[]): string[] {
    const calls: string[] = [];
    // Implement function call extraction
    return calls;
  }

  private findVariableReaders(ast: EnhancedAst, name: string): string[] {
    // Implement variable reader analysis
    return [];
  }

  private findVariableWriters(ast: EnhancedAst, name: string): string[] {
    // Implement variable writer analysis
    return [];
  }

  private findVariableDependencies(ast: EnhancedAst, name: string): string[] {
    // Implement dependency analysis
    return [];
  }

  private findMapReaders(ast: EnhancedAst, name: string): string[] {
    // Implement map reader analysis
    return [];
  }

  private findMapWriters(ast: EnhancedAst, name: string): string[] {
    // Implement map writer analysis
    return [];
  }

  private findMapDependencies(ast: EnhancedAst, name: string): string[] {
    // Implement map dependency analysis
    return [];
  }

  private findConstantReaders(ast: EnhancedAst, name: string): string[] {
    // Implement constant reader analysis
    return [];
  }

  private findConstantDependencies(ast: EnhancedAst, name: string): string[] {
    // Implement constant dependency analysis
    return [];
  }
}
