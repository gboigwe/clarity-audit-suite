export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

export interface SourceRange {
  start: SourceLocation;
  end: SourceLocation;
}


export interface ClarityNode {
  type: string;
  location?: SourceRange;
  parent?: ClarityNode;
  [key: string]: any;
}


export interface ClarityType extends ClarityNode {
  type: 'clarity-type';
  kind: 'uint' | 'int' | 'bool' | 'principal' | 'buff' | 'string-ascii' | 'string-utf8' | 
        'list' | 'tuple' | 'optional' | 'response' | 'trait' | 'custom';
  size?: number; // For buff, string types
  elementType?: ClarityType; // For list, optional
  okType?: ClarityType; // For response types
  errType?: ClarityType; // For response types
  fields?: { [key: string]: ClarityType }; // For tuple types
  traitName?: string; // For trait types
}


export interface ClarityAst extends ClarityNode {
  type: 'program';
  body: TopLevelStatement[];
  imports: ImportDeclaration[];
  traits: TraitDefinition[];
  contracts: ContractDefinition[];
  typeEnvironment: TypeEnvironment;
}


export interface TypeEnvironment {
  functions: Map<string, FunctionSignature>;
  constants: Map<string, ConstantInfo>;
  variables: Map<string, VariableInfo>;
  maps: Map<string, MapInfo>;
  traits: Map<string, TraitInfo>;
}

export interface FunctionSignature {
  name: string;
  visibility: 'public' | 'private' | 'read-only';
  parameters: Parameter[];
  returnType: ClarityType;
  pure: boolean; // Does not modify state
  payable: boolean; // Can receive STX
}

export interface ConstantInfo {
  name: string;
  type: ClarityType;
  value: Expression;
  used: boolean;
}

export interface VariableInfo {
  name: string;
  type: ClarityType;
  initialValue: Expression;
  mutable: boolean;
  accessed: boolean;
  modified: boolean;
}

export interface MapInfo {
  name: string;
  keyType: ClarityType;
  valueType: ClarityType;
  accessed: boolean;
  modified: boolean;
}

export interface TraitInfo {
  name: string;
  functions: FunctionSignature[];
}


export type TopLevelStatement = 
  | FunctionDefinition
  | ConstantDefinition
  | MapDefinition
  | DataVarDefinition
  | NftDefinition
  | FtDefinition
  | TraitDefinition
  | UseTrait
  | ImplTrait;


export interface FunctionDefinition extends ClarityNode {
  type: 'function-definition';
  name: string;
  visibility: 'public' | 'private' | 'read-only';
  parameters: Parameter[];
  returnType?: ClarityType; // Inferred if not specified
  body: Expression[];
  annotations: FunctionAnnotation[];
  callsExternal: boolean; // Semantic analysis result
  modifiesState: boolean; // Semantic analysis result
  canFail: boolean; // Can return an error
}

export interface Parameter extends ClarityNode {
  type: 'parameter';
  name: string;
  paramType: ClarityType;
  optional?: boolean;
}

export interface FunctionAnnotation {
  type: 'pure' | 'payable' | 'deprecated' | 'unsafe';
  message?: string;
}


export interface ConstantDefinition extends ClarityNode {
  type: 'constant-definition';
  name: string;
  value: Expression;
  constantType?: ClarityType; // Inferred type
  used: boolean; // Semantic analysis result
}


export interface MapDefinition extends ClarityNode {
  type: 'map-definition';
  name: string;
  keyType: ClarityType;
  valueType: ClarityType;
  accessed: boolean; // Semantic analysis result
  modified: boolean; // Semantic analysis result
}


export interface DataVarDefinition extends ClarityNode {
  type: 'data-var-definition';
  name: string;
  varType: ClarityType;
  initialValue: Expression;
  accessed: boolean; // Semantic analysis result
  modified: boolean; // Semantic analysis result
}


export interface NftDefinition extends ClarityNode {
  type: 'nft-definition';
  name: string;
  tokenType: ClarityType;
}


export interface FtDefinition extends ClarityNode {
  type: 'ft-definition';
  name: string;
  totalSupply?: Expression;
}


export interface TraitDefinition extends ClarityNode {
  type: 'trait-definition';
  name: string;
  functions: FunctionSignature[];
}


export interface UseTrait extends ClarityNode {
  type: 'use-trait';
  name: string;
  contractPrincipal: Expression;
}


export interface ImplTrait extends ClarityNode {
  type: 'impl-trait';
  traitName: string;
  contractPrincipal: Expression;
}


export interface ImportDeclaration extends ClarityNode {
  type: 'import';
  contractPrincipal: Expression;
  alias?: string;
}


export interface ContractDefinition extends ClarityNode {
  type: 'contract-definition';
  principal: Expression;
  functions: string[];
}


export type Expression = 
  | FunctionCall
  | LetExpression
  | BeginExpression
  | IfExpression
  | MatchExpression
  | TryExpression
  | AssertExpression
  | ListExpression
  | TupleExpression
  | Identifier
  | Literal
  | LambdaExpression;


export interface FunctionCall extends ClarityNode {
  type: 'function-call';
  function: Expression; // Can be identifier or contract call
  arguments: Expression[];
  isBuiltin: boolean; // Semantic analysis result
  isExternal: boolean; // Calls external contract
  canFail: boolean; // Can return error
  sideEffects: SideEffect[]; // What this call modifies
}

export interface SideEffect {
  type: 'state-modification' | 'external-call' | 'token-transfer' | 'map-access';
  target?: string; // Variable/map name
  operation: 'read' | 'write' | 'delete';
}


export interface LetExpression extends ClarityNode {
  type: 'let-expression';
  bindings: Binding[];
  body: Expression[];
  localScope: Map<string, VariableInfo>; // Local variables
}

export interface Binding extends ClarityNode {
  type: 'binding';
  name: string;
  value: Expression;
  bindingType?: ClarityType; // Inferred type
}


export interface BeginExpression extends ClarityNode {
  type: 'begin-expression';
  body: Expression[];
  canFail: boolean; // Any expression can fail
}


export interface IfExpression extends ClarityNode {
  type: 'if-expression';
  condition: Expression;
  then: Expression;
  else?: Expression;
}


export interface MatchExpression extends ClarityNode {
  type: 'match-expression';
  expression: Expression;
  arms: MatchArm[];
}

export interface MatchArm extends ClarityNode {
  type: 'match-arm';
  pattern: Pattern;
  body: Expression;
}

export type Pattern = 
  | { type: 'ok-pattern'; value: Pattern }
  | { type: 'err-pattern'; value: Pattern }
  | { type: 'some-pattern'; value: Pattern }
  | { type: 'none-pattern' }
  | { type: 'identifier-pattern'; name: string }
  | { type: 'literal-pattern'; value: Literal };


export interface TryExpression extends ClarityNode {
  type: 'try-expression';
  expression: Expression;
  errorHandler?: Expression;
}


export interface AssertExpression extends ClarityNode {
  type: 'assert-expression';
  condition: Expression;
  errorValue?: Expression;
}


export interface ListExpression extends ClarityNode {
  type: 'list-expression';
  elements: Expression[];
  elementType?: ClarityType; // Inferred element type
}


export interface TupleExpression extends ClarityNode {
  type: 'tuple-expression';
  fields: TupleField[];
}

export interface TupleField extends ClarityNode {
  type: 'tuple-field';
  name: string;
  value: Expression;
}


export interface LambdaExpression extends ClarityNode {
  type: 'lambda-expression';
  parameters: string[];
  body: Expression;
}


export interface Identifier extends ClarityNode {
  type: 'identifier';
  name: string;
  resolvedType?: ClarityType; // Type from semantic analysis
  resolvedBinding?: VariableInfo | ConstantInfo | FunctionSignature; // What it refers to
  isContractCall?: boolean; // e.g., contract-name.function-name
  contractPrincipal?: string;
}


export type Literal = 
  | UintLiteral
  | IntLiteral
  | BoolLiteral
  | StringLiteral
  | BuffLiteral
  | PrincipalLiteral;

export interface UintLiteral extends ClarityNode {
  type: 'uint-literal';
  value: bigint;
  raw: string;
}

export interface IntLiteral extends ClarityNode {
  type: 'int-literal';
  value: bigint;
  raw: string;
}

export interface BoolLiteral extends ClarityNode {
  type: 'bool-literal';
  value: boolean;
}

export interface StringLiteral extends ClarityNode {
  type: 'string-literal';
  value: string;
  encoding: 'ascii' | 'utf8';
  raw: string;
}

export interface BuffLiteral extends ClarityNode {
  type: 'buff-literal';
  value: Uint8Array;
  raw: string;
}

export interface PrincipalLiteral extends ClarityNode {
  type: 'principal-literal';
  value: string; // The principal address
  isContract: boolean;
  contractName?: string;
}


export interface ParseResult {
  ast: ClarityAst | null;
  errors: ParserError[];
  warnings: ParserWarning[];
  success: boolean;
}

export interface ParserError {
  message: string;
  location: SourceLocation;
  severity: 'error' | 'fatal';
  code: string; // Error code for categorization
  suggestions?: string[];
}

export interface ParserWarning {
  message: string;
  location: SourceLocation;
  code: string;
  suggestions?: string[];
}


export enum TokenType {
  
  UINT = 'UINT',
  INT = 'INT',
  BOOL = 'BOOL',
  STRING_ASCII = 'STRING_ASCII',
  STRING_UTF8 = 'STRING_UTF8',
  BUFF = 'BUFF',
  PRINCIPAL = 'PRINCIPAL',
  
  
  IDENTIFIER = 'IDENTIFIER',
  KEYWORD = 'KEYWORD',
  
  
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  
  
  DOT = 'DOT',
  COMMA = 'COMMA',
  COLON = 'COLON',
  
  
  EOF = 'EOF',
  
  
  COMMENT = 'COMMENT',
  
  
  WHITESPACE = 'WHITESPACE',
  NEWLINE = 'NEWLINE'
}

export interface Token {
  type: TokenType;
  value: string;
  location: SourceLocation;
  raw: string;
}


export interface Lexer {
  tokenize(source: string): Token[];
  reset(): void;
}


export interface Parser {
  parse(source: string): ParseResult;
  parseTokens(tokens: Token[]): ParseResult;
  reset(): void;
}


export interface SemanticAnalyzer {
  analyze(ast: ClarityAst): SemanticAnalysisResult;
}

export interface SemanticAnalysisResult {
  typeEnvironment: TypeEnvironment;
  errors: SemanticError[];
  warnings: SemanticWarning[];
  success: boolean;
}

export interface SemanticError {
  message: string;
  location: SourceLocation;
  code: string;
  node: ClarityNode;
}

export interface SemanticWarning {
  message: string;
  location: SourceLocation;
  code: string;
  node: ClarityNode;
}
