import {
  ClarityAst, SemanticAnalyzer as ISemanticAnalyzer, SemanticAnalysisResult,
  SemanticError, SemanticWarning, TypeEnvironment, FunctionSignature,
  ConstantInfo, VariableInfo, MapInfo, TraitInfo, TopLevelStatement,
  FunctionDefinition, ConstantDefinition, MapDefinition, DataVarDefinition,
  TraitDefinition, Expression, FunctionCall, Identifier, ClarityType,
  LetExpression, Parameter, SideEffect, ClarityNode, SourceLocation
} from './types';

export class EnhancedSemanticAnalyzer implements ISemanticAnalyzer {
  private errors: SemanticError[] = [];
  private warnings: SemanticWarning[] = [];
  private typeEnvironment: TypeEnvironment;
  private currentFunction: FunctionDefinition | null = null;
  private builtinFunctions: Set<string>;

  constructor() {
    this.typeEnvironment = this.createEmptyTypeEnvironment();
    this.builtinFunctions = this.createBuiltinFunctionSet();
  }

  public analyze(ast: ClarityAst): SemanticAnalysisResult {
    this.reset();
    
    try {
      // Phase 1: Collect top-level declarations
      this.collectDeclarations(ast);
      
      // Phase 2: Analyze function bodies and expressions
      this.analyzeExpressions(ast);
      
      // Phase 3: Perform usage analysis
      this.performUsageAnalysis(ast);
      
      // Phase 4: Update AST with semantic information
      this.updateAstWithSemanticInfo(ast);
      
      return {
        typeEnvironment: this.typeEnvironment,
        errors: this.errors,
        warnings: this.warnings,
        success: this.errors.length === 0
      };
    } catch (error) {
      this.addError(`Semantic analysis error: ${error}`, { line: 0, column: 0, offset: 0 }, ast);
      return {
        typeEnvironment: this.typeEnvironment,
        errors: this.errors,
        warnings: this.warnings,
        success: false
      };
    }
  }

  private reset(): void {
    this.errors = [];
    this.warnings = [];
    this.typeEnvironment = this.createEmptyTypeEnvironment();
    this.currentFunction = null;
  }

  private collectDeclarations(ast: ClarityAst): void {
    for (const statement of ast.body) {
      switch (statement.type) {
        case 'function-definition':
          this.collectFunctionDeclaration(statement);
          break;
        case 'constant-definition':
          this.collectConstantDeclaration(statement);
          break;
        case 'map-definition':
          this.collectMapDeclaration(statement);
          break;
        case 'data-var-definition':
          this.collectVariableDeclaration(statement);
          break;
        case 'trait-definition':
          this.collectTraitDeclaration(statement);
          break;
      }
    }
  }

  private collectFunctionDeclaration(func: FunctionDefinition): void {
    // Check for duplicate function names
    if (this.typeEnvironment.functions.has(func.name)) {
      this.addError(
        `Function '${func.name}' is already defined`,
        func.location?.start || { line: 0, column: 0, offset: 0 },
        func
      );
      return;
    }

    const signature: FunctionSignature = {
      name: func.name,
      visibility: func.visibility,
      parameters: func.parameters,
      returnType: this.inferReturnType(func),
      pure: this.isPureFunction(func),
      payable: this.isPayableFunction(func)
    };

    this.typeEnvironment.functions.set(func.name, signature);
  }

  private collectConstantDeclaration(constant: ConstantDefinition): void {
    if (this.typeEnvironment.constants.has(constant.name)) {
      this.addError(
        `Constant '${constant.name}' is already defined`,
        constant.location?.start || { line: 0, column: 0, offset: 0 },
        constant
      );
      return;
    }

    const constantInfo: ConstantInfo = {
      name: constant.name,
      type: this.inferExpressionType(constant.value),
      value: constant.value,
      used: false
    };

    this.typeEnvironment.constants.set(constant.name, constantInfo);
  }

  private collectMapDeclaration(map: MapDefinition): void {
    if (this.typeEnvironment.maps.has(map.name)) {
      this.addError(
        `Map '${map.name}' is already defined`,
        map.location?.start || { line: 0, column: 0, offset: 0 },
        map
      );
      return;
    }

    const mapInfo: MapInfo = {
      name: map.name,
      keyType: map.keyType,
      valueType: map.valueType,
      accessed: false,
      modified: false
    };

    this.typeEnvironment.maps.set(map.name, mapInfo);
  }

  private collectVariableDeclaration(variable: DataVarDefinition): void {
    if (this.typeEnvironment.variables.has(variable.name)) {
      this.addError(
        `Variable '${variable.name}' is already defined`,
        variable.location?.start || { line: 0, column: 0, offset: 0 },
        variable
      );
      return;
    }

    const variableInfo: VariableInfo = {
      name: variable.name,
      type: variable.varType,
      initialValue: variable.initialValue,
      mutable: true,
      accessed: false,
      modified: false
    };

    this.typeEnvironment.variables.set(variable.name, variableInfo);
  }

  private collectTraitDeclaration(trait: TraitDefinition): void {
    if (this.typeEnvironment.traits.has(trait.name)) {
      this.addError(
        `Trait '${trait.name}' is already defined`,
        trait.location?.start || { line: 0, column: 0, offset: 0 },
        trait
      );
      return;
    }

    const traitInfo: TraitInfo = {
      name: trait.name,
      functions: trait.functions
    };

    this.typeEnvironment.traits.set(trait.name, traitInfo);
  }

  private analyzeExpressions(ast: ClarityAst): void {
    for (const statement of ast.body) {
      if (statement.type === 'function-definition') {
        this.analyzeFunctionDefinition(statement);
      } else {
        // Analyze top-level expressions (constants, etc.)
        this.analyzeTopLevelExpression(statement);
      }
    }
  }

  private analyzeFunctionDefinition(func: FunctionDefinition): void {
    this.currentFunction = func;
    
    // Create local scope for parameters
    const localScope = new Map<string, VariableInfo>();
    for (const param of func.parameters) {
      localScope.set(param.name, {
        name: param.name,
        type: param.paramType,
        initialValue: { type: 'identifier', name: 'parameter' } as any, // Dummy value
        mutable: false,
        accessed: false,
        modified: false
      });
    }

    // Analyze function body
    for (const expr of func.body) {
      this.analyzeExpression(expr, localScope);
    }

    // Update function properties based on analysis
    func.callsExternal = this.functionCallsExternal(func);
    func.modifiesState = this.functionModifiesState(func);
    func.canFail = this.functionCanFail(func);

    this.currentFunction = null;
  }

  private analyzeTopLevelExpression(statement: TopLevelStatement): void {
    if ('value' in statement && statement.value) {
      this.analyzeExpression(statement.value, new Map());
    }
    if ('initialValue' in statement && statement.initialValue) {
      this.analyzeExpression(statement.initialValue, new Map());
    }
  }

  private analyzeExpression(expr: Expression, localScope: Map<string, VariableInfo>): ClarityType {
    switch (expr.type) {
      case 'function-call':
        return this.analyzeFunctionCall(expr, localScope);
      case 'identifier':
        return this.analyzeIdentifier(expr, localScope);
      case 'let-expression':
        return this.analyzeLetExpression(expr, localScope);
      case 'begin-expression':
        return this.analyzeBeginExpression(expr, localScope);
      case 'if-expression':
        return this.analyzeIfExpression(expr, localScope);
      case 'list-expression':
        return this.analyzeListExpression(expr, localScope);
      case 'tuple-expression':
        return this.analyzeTupleExpression(expr, localScope);
      case 'uint-literal':
        return { type: 'clarity-type', kind: 'uint' };
      case 'int-literal':
        return { type: 'clarity-type', kind: 'int' };
      case 'bool-literal':
        return { type: 'clarity-type', kind: 'bool' };
      case 'string-literal':
        return { 
          type: 'clarity-type', 
          kind: expr.encoding === 'ascii' ? 'string-ascii' : 'string-utf8' 
        };
      case 'buff-literal':
        return { type: 'clarity-type', kind: 'buff', size: expr.value.length };
      case 'principal-literal':
        return { type: 'clarity-type', kind: 'principal' };
      default:
        this.addWarning(
          `Unknown expression type: ${(expr as any).type}`,
          expr.location?.start || { line: 0, column: 0, offset: 0 },
          expr
        );
        return { type: 'clarity-type', kind: 'uint' }; // Default fallback
    }
  }

  private analyzeFunctionCall(call: FunctionCall, localScope: Map<string, VariableInfo>): ClarityType {
    // Determine if it's a builtin function
    const functionName = this.getFunctionName(call.function);
    call.isBuiltin = this.builtinFunctions.has(functionName);
    
    // Analyze arguments
    const argTypes: ClarityType[] = [];
    for (const arg of call.arguments) {
      argTypes.push(this.analyzeExpression(arg, localScope));
    }

    // Determine if this is an external call
    call.isExternal = this.isExternalCall(call);
    
    // Determine if this call can fail
    call.canFail = this.callCanFail(functionName);
    
    // Analyze side effects
    call.sideEffects = this.analyzeSideEffects(call, localScope);

    // Mark accessed resources
    this.markResourceAccess(call);

    return this.inferFunctionCallReturnType(call, argTypes);
  }

  private analyzeIdentifier(identifier: Identifier, localScope: Map<string, VariableInfo>): ClarityType {
    // Check local scope first
    if (localScope.has(identifier.name)) {
      const localVar = localScope.get(identifier.name)!;
      localVar.accessed = true;
      identifier.resolvedBinding = localVar;
      identifier.resolvedType = localVar.type;
      return localVar.type;
    }

    // Check constants
    if (this.typeEnvironment.constants.has(identifier.name)) {
      const constant = this.typeEnvironment.constants.get(identifier.name)!;
      constant.used = true;
      identifier.resolvedBinding = constant;
      identifier.resolvedType = constant.type;
      return constant.type;
    }

    // Check variables
    if (this.typeEnvironment.variables.has(identifier.name)) {
      const variable = this.typeEnvironment.variables.get(identifier.name)!;
      variable.accessed = true;
      identifier.resolvedBinding = variable;
      identifier.resolvedType = variable.type;
      return variable.type;
    }

    // Check functions
    if (this.typeEnvironment.functions.has(identifier.name)) {
      const func = this.typeEnvironment.functions.get(identifier.name)!;
      identifier.resolvedBinding = func;
      identifier.resolvedType = func.returnType;
      return func.returnType;
    }

    // Check if it's a contract call
    if (identifier.name.includes('.')) {
      identifier.isContractCall = true;
      const [contractPrincipal, functionName] = identifier.name.split('.');
      identifier.contractPrincipal = contractPrincipal;
      // Return a generic type for contract calls
      return { type: 'clarity-type', kind: 'uint' };
    }

    // Undefined identifier
    this.addError(
      `Undefined identifier: ${identifier.name}`,
      identifier.location?.start || { line: 0, column: 0, offset: 0 },
      identifier
    );

    return { type: 'clarity-type', kind: 'uint' }; // Default fallback
  }

  private analyzeLetExpression(letExpr: LetExpression, localScope: Map<string, VariableInfo>): ClarityType {
    // Create new scope including let bindings
    const newScope = new Map(localScope);
    
    // Analyze bindings
    for (const binding of letExpr.bindings) {
      const valueType = this.analyzeExpression(binding.value, localScope);
      binding.bindingType = valueType;
      
      // Add to local scope
      newScope.set(binding.name, {
        name: binding.name,
        type: valueType,
        initialValue: binding.value,
        mutable: false,
        accessed: false,
        modified: false
      });
    }

    letExpr.localScope = newScope;

    // Analyze body with new scope
    let resultType: ClarityType = { type: 'clarity-type', kind: 'uint' };
    for (const expr of letExpr.body) {
      resultType = this.analyzeExpression(expr, newScope);
    }

    return resultType;
  }

  private analyzeBeginExpression(beginExpr: any, localScope: Map<string, VariableInfo>): ClarityType {
    let resultType: ClarityType = { type: 'clarity-type', kind: 'uint' };
    let canFail = false;

    for (const expr of beginExpr.body) {
      resultType = this.analyzeExpression(expr, localScope);
      // If any expression can fail, the whole begin can fail
      if (this.expressionCanFail(expr)) {
        canFail = true;
      }
    }

    beginExpr.canFail = canFail;
    return resultType;
  }

  private analyzeIfExpression(ifExpr: any, localScope: Map<string, VariableInfo>): ClarityType {
    // Analyze condition
    const conditionType = this.analyzeExpression(ifExpr.condition, localScope);
    
    // Ensure condition is boolean
    if (conditionType.kind !== 'bool') {
      this.addWarning(
        'If condition should be boolean',
        ifExpr.condition.location?.start || { line: 0, column: 0, offset: 0 },
        ifExpr.condition
      );
    }

    // Analyze branches
    const thenType = this.analyzeExpression(ifExpr.then, localScope);
    let elseType: ClarityType | undefined;
    
    if (ifExpr.else) {
      elseType = this.analyzeExpression(ifExpr.else, localScope);
      
      // Check if types are compatible
      if (!this.typesCompatible(thenType, elseType)) {
        this.addWarning(
          'If branches have incompatible types',
          ifExpr.location?.start || { line: 0, column: 0, offset: 0 },
          ifExpr
        );
      }
    }

    return thenType; // Return then type as the result type
  }

  private analyzeListExpression(listExpr: any, localScope: Map<string, VariableInfo>): ClarityType {
    let elementType: ClarityType | undefined;

    for (const element of listExpr.elements) {
      const elemType = this.analyzeExpression(element, localScope);
      
      if (!elementType) {
        elementType = elemType;
      } else if (!this.typesCompatible(elementType, elemType)) {
        this.addWarning(
          'List elements have incompatible types',
          element.location?.start || { line: 0, column: 0, offset: 0 },
          element
        );
      }
    }

    listExpr.elementType = elementType || { type: 'clarity-type', kind: 'uint' };
    
    return {
      type: 'clarity-type',
      kind: 'list',
      elementType: listExpr.elementType
    };
  }

  private analyzeTupleExpression(tupleExpr: any, localScope: Map<string, VariableInfo>): ClarityType {
    const fields: { [key: string]: ClarityType } = {};

    for (const field of tupleExpr.fields) {
      const fieldType = this.analyzeExpression(field.value, localScope);
      fields[field.name] = fieldType;
    }

    return {
      type: 'clarity-type',
      kind: 'tuple',
      fields
    };
  }

  private performUsageAnalysis(ast: ClarityAst): void {
    // Mark unused functions
    for (const [name, func] of this.typeEnvironment.functions) {
      if (func.visibility === 'private') {
        // Check if this private function is called anywhere
        const isCalled = this.isFunctionCalled(name, ast);
        if (!isCalled) {
          this.addWarning(
            `Private function '${name}' is never called`,
            { line: 0, column: 0, offset: 0 },
            ast // Dummy node
          );
        }
      }
    }

    // Mark unused constants
    for (const [name, constant] of this.typeEnvironment.constants) {
      if (!constant.used) {
        this.addWarning(
          `Constant '${name}' is never used`,
          { line: 0, column: 0, offset: 0 },
          ast // Dummy node
        );
      }
    }

    // Mark unused variables
    for (const [name, variable] of this.typeEnvironment.variables) {
      if (!variable.accessed) {
        this.addWarning(
          `Variable '${name}' is never accessed`,
          { line: 0, column: 0, offset: 0 },
          ast // Dummy node
        );
      }
    }

    // Mark unused maps
    for (const [name, map] of this.typeEnvironment.maps) {
      if (!map.accessed) {
        this.addWarning(
          `Map '${name}' is never accessed`,
          { line: 0, column: 0, offset: 0 },
          ast // Dummy node
        );
      }
    }
  }

  private updateAstWithSemanticInfo(ast: ClarityAst): void {
    ast.typeEnvironment = this.typeEnvironment;
    
    // Update function definitions with semantic info
    for (const statement of ast.body) {
      if (statement.type === 'function-definition') {
        const func = statement as FunctionDefinition;
        const signature = this.typeEnvironment.functions.get(func.name);
        if (signature) {
          func.returnType = signature.returnType;
        }
      }
    }
  }

  // Helper methods
  private createEmptyTypeEnvironment(): TypeEnvironment {
    return {
      functions: new Map(),
      constants: new Map(),
      variables: new Map(),
      maps: new Map(),
      traits: new Map()
    };
  }

  private createBuiltinFunctionSet(): Set<string> {
    return new Set([
      '+', '-', '*', '/', 'mod', 'pow', 'sqrti',
      '<', '<=', '>', '>=', 'is-eq',
      'and', 'or', 'not',
      'unwrap!', 'unwrap-panic', 'unwrap-err!', 'unwrap-err-panic',
      'is-ok', 'is-err', 'is-some', 'is-none',
      'ok', 'err', 'some', 'none',
      'map-get?', 'map-set', 'map-insert', 'map-delete',
      'var-get', 'var-set',
      'list', 'append', 'concat', 'len', 'element-at', 'index-of',
      'filter', 'map', 'fold',
      'get', 'merge', 'tuple',
      'begin', 'if', 'let', 'match', 'try',
      'asserts!', 'print',
      'contract-call?', 'as-contract',
      'tx-sender', 'contract-caller', 'block-height',
      'stx-get-balance', 'stx-transfer?',
      'ft-mint?', 'ft-transfer?', 'ft-burn?', 'ft-get-balance',
      'nft-mint?', 'nft-transfer?', 'nft-burn?', 'nft-get-owner?'
    ]);
  }

  private inferReturnType(func: FunctionDefinition): ClarityType {
    // Simplified return type inference
    if (func.body.length > 0) {
      return this.inferExpressionType(func.body[func.body.length - 1]);
    }
    return { type: 'clarity-type', kind: 'uint' };
  }

  private inferExpressionType(expr: Expression): ClarityType {
    // Simplified type inference
    switch (expr.type) {
      case 'uint-literal':
        return { type: 'clarity-type', kind: 'uint' };
      case 'int-literal':
        return { type: 'clarity-type', kind: 'int' };
      case 'bool-literal':
        return { type: 'clarity-type', kind: 'bool' };
      default:
        return { type: 'clarity-type', kind: 'uint' };
    }
  }

  private isPureFunction(func: FunctionDefinition): boolean {
    // Check if function has no side effects
    return !this.functionModifiesState(func);
  }

  private isPayableFunction(func: FunctionDefinition): boolean {
    // Check if function can receive STX
    return func.visibility === 'public'; // Simplified
  }

  private functionCallsExternal(func: FunctionDefinition): boolean {
    // Analyze if function makes external contract calls
    return this.containsExternalCalls(func.body);
  }

  private functionModifiesState(func: FunctionDefinition): boolean {
    // Check if function modifies state (maps, vars)
    return this.containsStateModifications(func.body);
  }

  private functionCanFail(func: FunctionDefinition): boolean {
    // Check if function can return an error
    return this.containsFailableOperations(func.body);
  }

  private containsExternalCalls(expressions: Expression[]): boolean {
    // Simplified implementation
    for (const expr of expressions) {
      if (expr.type === 'function-call') {
        const functionName = this.getFunctionName(expr.function);
        if (functionName === 'contract-call?' || functionName.includes('.')) {
          return true;
        }
      }
    }
    return false;
  }

  private containsStateModifications(expressions: Expression[]): boolean {
    // Check for state-modifying operations
    for (const expr of expressions) {
      if (expr.type === 'function-call') {
        const functionName = this.getFunctionName(expr.function);
        if (['map-set', 'map-insert', 'map-delete', 'var-set'].includes(functionName)) {
          return true;
        }
      }
    }
    return false;
  }

  private containsFailableOperations(expressions: Expression[]): boolean {
    // Check for operations that can fail
    for (const expr of expressions) {
      if (expr.type === 'function-call') {
        const functionName = this.getFunctionName(expr.function);
        if (['unwrap!', 'unwrap-panic', 'asserts!'].includes(functionName)) {
          return true;
        }
      }
    }
    return false;
  }

  private getFunctionName(funcExpr: Expression): string {
    if (funcExpr.type === 'identifier') {
      return funcExpr.name;
    }
    return 'unknown';
  }

  private isExternalCall(call: FunctionCall): boolean {
    const functionName = this.getFunctionName(call.function);
    return functionName === 'contract-call?' || functionName.includes('.');
  }

  private callCanFail(functionName: string): boolean {
    const failableFunctions = new Set([
      'unwrap!', 'unwrap-panic', 'unwrap-err!', 'unwrap-err-panic',
      'asserts!', 'stx-transfer?', 'ft-transfer?', 'nft-transfer?',
      'map-insert', 'contract-call?'
    ]);
    return failableFunctions.has(functionName);
  }

  private analyzeSideEffects(call: FunctionCall, localScope: Map<string, VariableInfo>): SideEffect[] {
    const sideEffects: SideEffect[] = [];
    const functionName = this.getFunctionName(call.function);

    // Analyze based on function name
    switch (functionName) {
      case 'map-set':
      case 'map-insert':
        if (call.arguments.length > 0 && call.arguments[0].type === 'identifier') {
          sideEffects.push({
            type: 'map-access',
            target: (call.arguments[0] as Identifier).name,
            operation: 'write'
          });
        }
        break;
      case 'map-get?':
        if (call.arguments.length > 0 && call.arguments[0].type === 'identifier') {
          sideEffects.push({
            type: 'map-access',
            target: (call.arguments[0] as Identifier).name,
            operation: 'read'
          });
        }
        break;
      case 'var-set':
        if (call.arguments.length > 0 && call.arguments[0].type === 'identifier') {
          sideEffects.push({
            type: 'state-modification',
            target: (call.arguments[0] as Identifier).name,
            operation: 'write'
          });
        }
        break;
      case 'var-get':
        if (call.arguments.length > 0 && call.arguments[0].type === 'identifier') {
          sideEffects.push({
            type: 'state-modification',
            target: (call.arguments[0] as Identifier).name,
            operation: 'read'
          });
        }
        break;
      case 'stx-transfer?':
      case 'ft-transfer?':
      case 'nft-transfer?':
        sideEffects.push({
          type: 'token-transfer',
          operation: 'write'
        });
        break;
      case 'contract-call?':
        sideEffects.push({
          type: 'external-call',
          operation: 'write'
        });
        break;
    }

    return sideEffects;
  }

  private markResourceAccess(call: FunctionCall): void {
    const functionName = this.getFunctionName(call.function);

    // Mark map access
    if (['map-get?', 'map-set', 'map-insert', 'map-delete'].includes(functionName)) {
      if (call.arguments.length > 0 && call.arguments[0].type === 'identifier') {
        const mapName = (call.arguments[0] as Identifier).name;
        const mapInfo = this.typeEnvironment.maps.get(mapName);
        if (mapInfo) {
          mapInfo.accessed = true;
          if (['map-set', 'map-insert', 'map-delete'].includes(functionName)) {
            mapInfo.modified = true;
          }
        }
      }
    }

    // Mark variable access
    if (['var-get', 'var-set'].includes(functionName)) {
      if (call.arguments.length > 0 && call.arguments[0].type === 'identifier') {
        const varName = (call.arguments[0] as Identifier).name;
        const varInfo = this.typeEnvironment.variables.get(varName);
        if (varInfo) {
          varInfo.accessed = true;
          if (functionName === 'var-set') {
            varInfo.modified = true;
          }
        }
      }
    }
  }

  private inferFunctionCallReturnType(call: FunctionCall, argTypes: ClarityType[]): ClarityType {
    const functionName = this.getFunctionName(call.function);

    // Return types for builtin functions
    switch (functionName) {
      case '+':
      case '-':
      case '*':
      case '/':
      case 'mod':
        return argTypes[0] || { type: 'clarity-type', kind: 'uint' };
      case '<':
      case '<=':
      case '>':
      case '>=':
      case 'is-eq':
      case 'and':
      case 'or':
      case 'not':
        return { type: 'clarity-type', kind: 'bool' };
      case 'ok':
        return {
          type: 'clarity-type',
          kind: 'response',
          okType: argTypes[0],
          errType: { type: 'clarity-type', kind: 'uint' }
        };
      case 'err':
        return {
          type: 'clarity-type',
          kind: 'response',
          okType: { type: 'clarity-type', kind: 'uint' },
          errType: argTypes[0]
        };
      default:
        // For user-defined functions
        const funcSignature = this.typeEnvironment.functions.get(functionName);
        if (funcSignature) {
          return funcSignature.returnType;
        }
        return { type: 'clarity-type', kind: 'uint' };
    }
  }

  private isFunctionCalled(functionName: string, ast: ClarityAst): boolean {
    // Simplified implementation - would need to traverse the entire AST
    for (const statement of ast.body) {
      if (this.statementCallsFunction(statement, functionName)) {
        return true;
      }
    }
    return false;
  }

  private statementCallsFunction(statement: TopLevelStatement, functionName: string): boolean {
    // Simplified implementation
    if (statement.type === 'function-definition') {
      return this.expressionsCallFunction(statement.body, functionName);
    }
    return false;
  }

  private expressionsCallFunction(expressions: Expression[], functionName: string): boolean {
    for (const expr of expressions) {
      if (this.expressionCallsFunction(expr, functionName)) {
        return true;
      }
    }
    return false;
  }

  private expressionCallsFunction(expr: Expression, functionName: string): boolean {
    if (expr.type === 'function-call') {
      const callName = this.getFunctionName(expr.function);
      if (callName === functionName) {
        return true;
      }
      // Check arguments recursively
      return this.expressionsCallFunction(expr.arguments, functionName);
    }
    // Handle other expression types recursively
    return false;
  }

  private expressionCanFail(expr: Expression): boolean {
    if (expr.type === 'function-call') {
      const functionName = this.getFunctionName(expr.function);
      return this.callCanFail(functionName);
    }
    return false;
  }

  private typesCompatible(type1: ClarityType, type2: ClarityType): boolean {
    // Simplified type compatibility check
    return type1.kind === type2.kind;
  }

  private addError(message: string, location: SourceLocation, node: ClarityNode): void {
    this.errors.push({
      message,
      location,
      code: 'SEMANTIC_ERROR',
      node
    });
  }

  private addWarning(message: string, location: SourceLocation, node: ClarityNode): void {
    this.warnings.push({
      message,
      location,
      code: 'SEMANTIC_WARNING',
      node
    });
  }
}
