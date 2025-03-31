import chalk from 'chalk';
import { ClarityAst, ClarityNode, FunctionDefinition, FunctionCall } from '../parser/types';

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
        
        // Add parameters
        if (funcNode.params.length > 0) {
          lines.push(`${childPrefix}├─ ${colored ? chalk.cyan('Parameters') : 'Parameters'}:`);
          funcNode.params.forEach((param, i: number) => {
            const paramPrefix = i === funcNode.params.length - 1 ? `${childPrefix}│  └─ ` : `${childPrefix}│  ├─ `;
            const paramName = colored ? chalk.yellow(param.name) : param.name;
            const paramType = colored ? chalk.magenta(param.type) : param.type;
            lines.push(`${paramPrefix}${paramName}: ${paramType}`);
          });
        }
        
        // Add body
        if (funcNode.body.length > 0) {
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
        const nameStr = colored ? chalk.yellow(node.name) : node.name;
        lines.push(`${prefix}${typeStr}: ${nameStr}`);
        
        // Add value
        const valuePrefix = `${childPrefix}└─ `;
        const valueChildPrefix = `${childPrefix}   `;
        lines.push(
          ...this.visualizeNode(node.value, valuePrefix, valueChildPrefix, colored)
        );
        break;
      }
      
      case 'map-definition': {
        const nameStr = colored ? chalk.yellow(node.name) : node.name;
        lines.push(`${prefix}${typeStr}: ${nameStr}`);
        
        // Add key type
        lines.push(`${childPrefix}├─ ${colored ? chalk.cyan('Key Type') : 'Key Type'}:`);
        const keyPrefix = `${childPrefix}│  └─ `;
        const keyChildPrefix = `${childPrefix}│     `;
        lines.push(
          ...this.visualizeNode(node.keyType, keyPrefix, keyChildPrefix, colored)
        );
        
        // Add value type
        lines.push(`${childPrefix}└─ ${colored ? chalk.cyan('Value Type') : 'Value Type'}:`);
        const valuePrefix = `${childPrefix}   └─ `;
        const valueChildPrefix = `${childPrefix}      `;
        lines.push(
          ...this.visualizeNode(node.valueType, valuePrefix, valueChildPrefix, colored)
        );
        break;
      }
      
      case 'function-call': {
        const nameStr = colored ? chalk.yellow(node.name) : node.name;
        lines.push(`${prefix}${typeStr}: ${nameStr}`);
        
        // Add arguments
        if (node.arguments.length > 0) {
          lines.push(`${childPrefix}└─ ${colored ? chalk.cyan('Arguments') : 'Arguments'}:`);
          node.arguments.forEach((arg: ClarityNode, i: number) => {
            const argPrefix = i === node.arguments.length - 1 ? `${childPrefix}   └─ ` : `${childPrefix}   ├─ `;
            const argChildPrefix = i === node.arguments.length - 1 ? `${childPrefix}      ` : `${childPrefix}   │  `;
            lines.push(
              ...this.visualizeNode(arg, argPrefix, argChildPrefix, colored)
            );
          });
        }
        break;
      }
      
      case 'let-expression': {
        lines.push(`${prefix}${typeStr}`);
        
        // Add bindings
        if (node.bindings.length > 0) {
          lines.push(`${childPrefix}├─ ${colored ? chalk.cyan('Bindings') : 'Bindings'}:`);
          node.bindings.forEach((binding: { name: string, value: ClarityNode }, i: number) => {
            const bindingPrefix = i === node.bindings.length - 1 ? `${childPrefix}│  └─ ` : `${childPrefix}│  ├─ `;
            const bindingName = colored ? chalk.yellow(binding.name) : binding.name;
            lines.push(`${bindingPrefix}${bindingName}:`);
            
            const valuePrefix = `${childPrefix}│     └─ `;
            const valueChildPrefix = `${childPrefix}│        `;
            lines.push(
              ...this.visualizeNode(binding.value, valuePrefix, valueChildPrefix, colored)
            );
          });
        }
        
        // Add body
        if (node.body.length > 0) {
          lines.push(`${childPrefix}└─ ${colored ? chalk.cyan('Body') : 'Body'}:`);
          node.body.forEach((bodyNode: ClarityNode, i: number) => {
            const bodyPrefix = i === node.body.length - 1 ? `${childPrefix}   └─ ` : `${childPrefix}   ├─ `;
            const bodyChildPrefix = i === node.body.length - 1 ? `${childPrefix}      ` : `${childPrefix}   │  `;
            lines.push(
              ...this.visualizeNode(bodyNode, bodyPrefix, bodyChildPrefix, colored)
            );
          });
        }
        break;
      }
      
      case 'begin-expression': {
        lines.push(`${prefix}${typeStr}`);
        
        // Add body
        if (node.body.length > 0) {
          lines.push(`${childPrefix}└─ ${colored ? chalk.cyan('Body') : 'Body'}:`);
          node.body.forEach((bodyNode: ClarityNode, i: number) => {
            const bodyPrefix = i === node.body.length - 1 ? `${childPrefix}   └─ ` : `${childPrefix}   ├─ `;
            const bodyChildPrefix = i === node.body.length - 1 ? `${childPrefix}      ` : `${childPrefix}   │  `;
            lines.push(
              ...this.visualizeNode(bodyNode, bodyPrefix, bodyChildPrefix, colored)
            );
          });
        }
        break;
      }
      
      case 'identifier': {
        const valueStr = colored ? chalk.yellow(node.value) : node.value;
        lines.push(`${prefix}${typeStr}: ${valueStr}`);
        break;
      }
      
      case 'string-literal': {
        const valueStr = colored ? chalk.yellow(`"${node.value}"`) : `"${node.value}"`;
        lines.push(`${prefix}${typeStr}: ${valueStr}`);
        break;
      }
      
      case 'number-literal': {
        const valueStr = colored ? chalk.yellow(node.value) : node.value;
        lines.push(`${prefix}${typeStr}: ${valueStr}`);
        break;
      }
      
      case 'bool-literal': {
        const valueStr = colored ? chalk.yellow(String(node.value)) : String(node.value);
        lines.push(`${prefix}${typeStr}: ${valueStr}`);
        break;
      }
      
      default: {
        lines.push(`${prefix}${typeStr}: ${JSON.stringify(node)}`);
      }
    }
    
    return lines;
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
      if (node.type === 'function-call' && node.name === functionName) {
        functionCalls.push(node as FunctionCall);
      }
      
      // Recursively search children
      Object.keys(node).forEach(key => {
        const value = node[key];
        
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
    
    ast.body.forEach(searchNode);
    
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
        const value = node[key];
        
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
    
    ast.body.forEach(searchNode);
    
    return nodes;
  }
}
