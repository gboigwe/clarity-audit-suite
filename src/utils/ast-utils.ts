import chalk from 'chalk';
import { ClarityAst, ClarityNode, FunctionDefinition, FunctionCall, Parameter } from '../parser/types';

export class AstVisualizer {
  /**
   * Generate a string representation of the AST for visualization
   * @param ast The AST to visualize
   * @param colored Whether to use colors in the output
   */
  public static visualize(ast: ClarityAst, colored: boolean = true): string {
    const lines: string[] = [];
    
    lines.push(colored ? chalk.blue('Program') : 'Program');
    ast.body.forEach((node, i) => {
      const prefix = i === ast.body.length - 1 ? '└─ ' : '├─ ';
      const childPrefix = i === ast.body.length - 1 ? '   ' : '│  ';
      lines.push(
        ...this.visualizeNode(node, prefix, childPrefix, colored)
      );
    });
    
    return lines.join('\n');
  }
  
  private static visualizeNode(
    node: ClarityNode, 
    prefix: string, 
    childPrefix: string, 
    colored: boolean
  ): string[] {
    const lines: string[] = [];
    
    const typeStr = colored ? chalk.green(node.type) : node.type;
    
    switch (node.type) {
      case 'function-definition': {
        const funcNode = node as FunctionDefinition;
        const nameStr = colored ? chalk.yellow(funcNode.name) : funcNode.name;
        lines.push(`${prefix}${typeStr}: ${nameStr}`);
        
        // Add parameters - FIX: Proper typing for parameters
        if (funcNode.parameters && funcNode.parameters.length > 0) {
          lines.push(`${childPrefix}├─ ${colored ? chalk.cyan('Parameters') : 'Parameters'}:`);
          funcNode.parameters.forEach((param: Parameter, i: number) => {
            const paramPrefix = i === funcNode.parameters.length - 1 ? `${childPrefix}│  └─ ` : `${childPrefix}│  ├─ `;
            const paramName = colored ? chalk.yellow(param.name) : param.name;
            const paramType = colored ? chalk.magenta(param.paramType?.kind || 'unknown') : (param.paramType?.kind || 'unknown');
            lines.push(`${paramPrefix}${paramName}: ${paramType}`);
          });
        }
        
        // Add body
        if (funcNode.body && funcNode.body.length > 0) {
          lines.push(`${childPrefix}└─ ${colored ? chalk.cyan('Body') : 'Body'}:`);
          funcNode.body.forEach((bodyNode, i: number) => {
            const bodyPrefix = i === funcNode.body.length - 1 ? `${childPrefix}   └─ ` : `${childPrefix}   ├─ `;
            const bodyChildPrefix = i === funcNode.body.length - 1 ? `${childPrefix}      ` : `${childPrefix}   │  `;
            lines.push(
              ...this.visualizeNode(bodyNode, bodyPrefix, bodyChildPrefix, colored)
            );
          });
        }
        break;
      }
      
      case 'constant-definition': {
        const constantNode = node as any;
        const nameStr = colored ? chalk.yellow(constantNode.name) : constantNode.name;
        lines.push(`${prefix}${typeStr}: ${nameStr}`);
        
        // Add value
        if (constantNode.value) {
          const valuePrefix = `${childPrefix}└─ `;
          const valueChildPrefix = `${childPrefix}   `;
          lines.push(
            ...this.visualizeNode(constantNode.value, valuePrefix, valueChildPrefix, colored)
          );
        }
        break;
      }
      
      case 'map-definition': {
        const mapNode = node as any;
        const nameStr = colored ? chalk.yellow(mapNode.name) : mapNode.name;
        lines.push(`${prefix}${typeStr}: ${nameStr}`);
        
        // Add key type
        if (mapNode.keyType) {
          lines.push(`${childPrefix}├─ ${colored ? chalk.cyan('Key Type') : 'Key Type'}:`);
          const keyPrefix = `${childPrefix}│  └─ `;
          const keyChildPrefix = `${childPrefix}│     `;
          lines.push(`${keyPrefix}${mapNode.keyType.kind || 'unknown'}`);
        }
        
        // Add value type
        if (mapNode.valueType) {
          lines.push(`${childPrefix}└─ ${colored ? chalk.cyan('Value Type') : 'Value Type'}:`);
          const valuePrefix = `${childPrefix}   └─ `;
          lines.push(`${valuePrefix}${mapNode.valueType.kind || 'unknown'}`);
        }
        break;
      }
      
      case 'data-var-definition': {
        const varNode = node as any;
        const nameStr = colored ? chalk.yellow(varNode.name) : varNode.name;
        lines.push(`${prefix}${typeStr}: ${nameStr}`);
        
        // Add variable type
        if (varNode.varType) {
          lines.push(`${childPrefix}├─ ${colored ? chalk.cyan('Type') : 'Type'}: ${varNode.varType.kind || 'unknown'}`);
        }
        
        // Add initial value
        if (varNode.initialValue) {
          lines.push(`${childPrefix}└─ ${colored ? chalk.cyan('Initial Value') : 'Initial Value'}:`);
          const valuePrefix = `${childPrefix}   └─ `;
          const valueChildPrefix = `${childPrefix}      `;
          lines.push(
            ...this.visualizeNode(varNode.initialValue, valuePrefix, valueChildPrefix, colored)
          );
        }
        break;
      }
      
      case 'function-call': {
        const callNode = node as any;
        const functionName = this.getFunctionName(callNode.function || callNode);
        const nameStr = colored ? chalk.yellow(functionName) : functionName;
        lines.push(`${prefix}${typeStr}: ${nameStr}`);
        
        // Add arguments
        if (callNode.arguments && callNode.arguments.length > 0) {
          lines.push(`${childPrefix}└─ ${colored ? chalk.cyan('Arguments') : 'Arguments'}:`);
          callNode.arguments.forEach((arg: ClarityNode, i: number) => {
            const argPrefix = i === callNode.arguments.length - 1 ? `${childPrefix}   └─ ` : `${childPrefix}   ├─ `;
            const argChildPrefix = i === callNode.arguments.length - 1 ? `${childPrefix}      ` : `${childPrefix}   │  `;
            lines.push(
              ...this.visualizeNode(arg, argPrefix, argChildPrefix, colored)
            );
          });
        }
        break;
      }
      
      case 'let-expression': {
        const letNode = node as any;
        lines.push(`${prefix}${typeStr}`);
        
        // Add bindings
        if (letNode.bindings && letNode.bindings.length > 0) {
          lines.push(`${childPrefix}├─ ${colored ? chalk.cyan('Bindings') : 'Bindings'}:`);
          letNode.bindings.forEach((binding: any, i: number) => {
            const bindingPrefix = i === letNode.bindings.length - 1 ? `${childPrefix}│  └─ ` : `${childPrefix}│  ├─ `;
            const bindingName = colored ? chalk.yellow(binding.name) : binding.name;
            lines.push(`${bindingPrefix}${bindingName}:`);
            
            if (binding.value) {
              const valuePrefix = `${childPrefix}│     └─ `;
              const valueChildPrefix = `${childPrefix}│        `;
              lines.push(
                ...this.visualizeNode(binding.value, valuePrefix, valueChildPrefix, colored)
              );
            }
          });
        }
        
        // Add body
        if (letNode.body && letNode.body.length > 0) {
          lines.push(`${childPrefix}└─ ${colored ? chalk.cyan('Body') : 'Body'}:`);
          letNode.body.forEach((bodyNode: ClarityNode, i: number) => {
            const bodyPrefix = i === letNode.body.length - 1 ? `${childPrefix}   └─ ` : `${childPrefix}   ├─ `;
            const bodyChildPrefix = i === letNode.body.length - 1 ? `${childPrefix}      ` : `${childPrefix}   │  `;
            lines.push(
              ...this.visualizeNode(bodyNode, bodyPrefix, bodyChildPrefix, colored)
            );
          });
        }
        break;
      }
      
      case 'begin-expression': {
        const beginNode = node as any;
        lines.push(`${prefix}${typeStr}`);
        
        // Add body
        if (beginNode.body && beginNode.body.length > 0) {
          lines.push(`${childPrefix}└─ ${colored ? chalk.cyan('Body') : 'Body'}:`);
          beginNode.body.forEach((bodyNode: ClarityNode, i: number) => {
            const bodyPrefix = i === beginNode.body.length - 1 ? `${childPrefix}   └─ ` : `${childPrefix}   ├─ `;
            const bodyChildPrefix = i === beginNode.body.length - 1 ? `${childPrefix}      ` : `${childPrefix}   │  `;
            lines.push(
              ...this.visualizeNode(bodyNode, bodyPrefix, bodyChildPrefix, colored)
            );
          });
        }
        break;
      }
      
      case 'if-expression': {
        const ifNode = node as any;
        lines.push(`${prefix}${typeStr}`);
        
        // Add condition
        if (ifNode.condition) {
          lines.push(`${childPrefix}├─ ${colored ? chalk.cyan('Condition') : 'Condition'}:`);
          const condPrefix = `${childPrefix}│  └─ `;
          const condChildPrefix = `${childPrefix}│     `;
          lines.push(
            ...this.visualizeNode(ifNode.condition, condPrefix, condChildPrefix, colored)
          );
        }
        
        // Add then branch
        if (ifNode.then) {
          lines.push(`${childPrefix}├─ ${colored ? chalk.cyan('Then') : 'Then'}:`);
          const thenPrefix = `${childPrefix}│  └─ `;
          const thenChildPrefix = `${childPrefix}│     `;
          lines.push(
            ...this.visualizeNode(ifNode.then, thenPrefix, thenChildPrefix, colored)
          );
        }
        
        // Add else branch if present
        if (ifNode.else) {
          lines.push(`${childPrefix}└─ ${colored ? chalk.cyan('Else') : 'Else'}:`);
          const elsePrefix = `${childPrefix}   └─ `;
          const elseChildPrefix = `${childPrefix}      `;
          lines.push(
            ...this.visualizeNode(ifNode.else, elsePrefix, elseChildPrefix, colored)
          );
        }
        break;
      }
      
      case 'identifier': {
        const idNode = node as any;
        const valueStr = colored ? chalk.yellow(idNode.name || idNode.value || 'unknown') : (idNode.name || idNode.value || 'unknown');
        lines.push(`${prefix}${typeStr}: ${valueStr}`);
        break;
      }
      
      case 'string-literal': {
        const strNode = node as any;
        const valueStr = colored ? chalk.yellow(`"${strNode.value}"`) : `"${strNode.value}"`;
        lines.push(`${prefix}${typeStr}: ${valueStr}`);
        break;
      }
      
      case 'uint-literal':
      case 'int-literal': {
        const numNode = node as any;
        const valueStr = colored ? chalk.yellow(numNode.value?.toString() || numNode.raw || 'unknown') : (numNode.value?.toString() || numNode.raw || 'unknown');
        lines.push(`${prefix}${typeStr}: ${valueStr}`);
        break;
      }
      
      case 'bool-literal': {
        const boolNode = node as any;
        const valueStr = colored ? chalk.yellow(String(boolNode.value)) : String(boolNode.value);
        lines.push(`${prefix}${typeStr}: ${valueStr}`);
        break;
      }
      
      case 'buff-literal': {
        const buffNode = node as any;
        const valueStr = colored ? chalk.yellow(buffNode.raw || 'buffer') : (buffNode.raw || 'buffer');
        lines.push(`${prefix}${typeStr}: ${valueStr}`);
        break;
      }
      
      case 'principal-literal': {
        const principalNode = node as any;
        const valueStr = colored ? chalk.yellow(principalNode.value || 'principal') : (principalNode.value || 'principal');
        lines.push(`${prefix}${typeStr}: ${valueStr}`);
        break;
      }
      
      case 'list-expression': {
        const listNode = node as any;
        lines.push(`${prefix}${typeStr}`);
        
        if (listNode.elements && listNode.elements.length > 0) {
          lines.push(`${childPrefix}└─ ${colored ? chalk.cyan('Elements') : 'Elements'}:`);
          listNode.elements.forEach((element: ClarityNode, i: number) => {
            const elemPrefix = i === listNode.elements.length - 1 ? `${childPrefix}   └─ ` : `${childPrefix}   ├─ `;
            const elemChildPrefix = i === listNode.elements.length - 1 ? `${childPrefix}      ` : `${childPrefix}   │  `;
            lines.push(
              ...this.visualizeNode(element, elemPrefix, elemChildPrefix, colored)
            );
          });
        }
        break;
      }
      
      case 'tuple-expression': {
        const tupleNode = node as any;
        lines.push(`${prefix}${typeStr}`);
        
        if (tupleNode.fields && tupleNode.fields.length > 0) {
          lines.push(`${childPrefix}└─ ${colored ? chalk.cyan('Fields') : 'Fields'}:`);
          tupleNode.fields.forEach((field: any, i: number) => {
            const fieldPrefix = i === tupleNode.fields.length - 1 ? `${childPrefix}   └─ ` : `${childPrefix}   ├─ `;
            const fieldName = colored ? chalk.yellow(field.name) : field.name;
            lines.push(`${fieldPrefix}${fieldName}:`);
            
            if (field.value) {
              const valuePrefix = `${childPrefix}      └─ `;
              const valueChildPrefix = `${childPrefix}         `;
              lines.push(
                ...this.visualizeNode(field.value, valuePrefix, valueChildPrefix, colored)
              );
            }
          });
        }
        break;
      }
      
      default: {
        lines.push(`${prefix}${typeStr}: ${JSON.stringify(node).substring(0, 50)}...`);
      }
    }
    
    return lines;
  }

  private static getFunctionName(funcExpr: any): string {
    if (funcExpr && typeof funcExpr === 'object') {
      if (funcExpr.type === 'identifier') {
        return funcExpr.name || funcExpr.value || 'unknown';
      }
      if (funcExpr.name) {
        return funcExpr.name;
      }
      if (funcExpr.value) {
        return funcExpr.value;
      }
    }
    return String(funcExpr || 'unknown');
  }
}

export class AstUtils {
  /**
   * Extract all function calls by name from an AST
   * @param ast The AST to search
   * @param functionName The name of the function to find
   */
  public static findFunctionCalls(ast: ClarityAst, functionName: string): FunctionCall[] {
    const functionCalls: FunctionCall[] = [];
    
    const searchNode = (node: ClarityNode) => {
      if (node.type === 'function-call') {
        const call = node as FunctionCall;
        const callName = this.getFunctionName(call.function);
        if (callName === functionName) {
          functionCalls.push(call);
        }
      }
      
      // Recursively search children
      Object.keys(node).forEach(key => {
        const value = (node as any)[key];
        
        if (Array.isArray(value)) {
          value.forEach(item => {
            if (item && typeof item === 'object' && 'type' in item) {
              searchNode(item);
            }
          });
        } else if (value && typeof value === 'object' && 'type' in value) {
          searchNode(value);
        }
      });
    };
    
    if (ast.body) {
      ast.body.forEach(searchNode);
    }
    
    return functionCalls;
  }
  
  /**
   * Find all nodes of a specific type in the AST
   * @param ast The AST to search
   * @param nodeType The type of node to find
   */
  public static findNodesByType(ast: ClarityAst, nodeType: string): ClarityNode[] {
    const nodes: ClarityNode[] = [];
    
    const searchNode = (node: ClarityNode) => {
      if (node.type === nodeType) {
        nodes.push(node);
      }
      
      // Recursively search children
      Object.keys(node).forEach(key => {
        const value = (node as any)[key];
        
        if (Array.isArray(value)) {
          value.forEach(item => {
            if (item && typeof item === 'object' && 'type' in item) {
              searchNode(item);
            }
          });
        } else if (value && typeof value === 'object' && 'type' in value) {
          searchNode(value);
        }
      });
    };
    
    if (ast.body) {
      ast.body.forEach(searchNode);
    }
    
    return nodes;
  }

  /**
   * Get function name from a function expression
   * @param funcExpr Function expression
   */
  private static getFunctionName(funcExpr: any): string {
    if (funcExpr && typeof funcExpr === 'object') {
      if (funcExpr.type === 'identifier') {
        return funcExpr.name || funcExpr.value || 'unknown';
      }
      if (funcExpr.name) {
        return funcExpr.name;
      }
      if (funcExpr.value) {
        return funcExpr.value;
      }
    }
    return String(funcExpr || 'unknown');
  }
}
