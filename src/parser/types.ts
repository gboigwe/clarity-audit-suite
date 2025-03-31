export interface ClarityNode {
    type: string;
    [key: string]: any;
  }
  
  export interface ClarityAst {
    type: 'program';
    body: ClarityNode[];
  }
  
  export interface FunctionDefinition extends ClarityNode {
    type: 'function-definition';
    name: string;
    params: Array<{ name: string; type: string; }>;
    body: Expression[];
    visibility?: 'public' | 'private' | 'read-only';
  }
  
  export interface ConstantDefinition extends ClarityNode {
    type: 'constant-definition';
    name: string;
    value: Expression;
  }
  
  export interface MapDefinition extends ClarityNode {
    type: 'map-definition';
    name: string;
    keyType: Expression;
    valueType: Expression;
  }
  
  export interface DataVarDefinition extends ClarityNode {
    type: 'data-var-definition';
    name: string;
    varType: Expression;
    initialValue: Expression;
  }
  
  export interface NftDefinition extends ClarityNode {
    type: 'nft-definition';
    name: string;
    tokenType: Expression;
  }
  
  export interface FunctionCall extends ClarityNode {
    type: 'function-call';
    name: string;
    arguments: Expression[];
  }
  
  export interface LetExpression extends ClarityNode {
    type: 'let-expression';
    bindings: Array<{ name: string; value: Expression; }>;
    body: Expression[];
  }
  
  export interface BeginExpression extends ClarityNode {
    type: 'begin-expression';
    body: Expression[];
  }
  
  export type Expression = 
    | FunctionDefinition
    | ConstantDefinition
    | MapDefinition
    | DataVarDefinition
    | NftDefinition
    | FunctionCall
    | LetExpression
    | BeginExpression
    | { type: 'identifier', value: string }
    | { type: 'string-literal', value: string }
    | { type: 'number-literal', value: string }
    | { type: 'bool-literal', value: boolean };
  
  export interface ParserError {
    line: number;
    column: number;
    message: string;
  }
  
  export interface ParseResult {
    ast: ClarityAst | null;
    errors: ParserError[];
  }
