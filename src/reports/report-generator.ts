import chalk from 'chalk';
import { AnalysisResult, AnalysisIssue } from '../analyzers/static-analyzer';
import { ClarityAst } from '../parser/types';
import { AstVisualizer } from '../utils/ast-utils';

export interface ReportOptions {
  includeAst?: boolean;
  colored?: boolean;
  verbose?: boolean;
}

export class ReportGenerator {
  /**
   * Generate a formatted console report from analysis results
   * @param contractPath Path to the analyzed contract
   * @param ast The parsed AST
   * @param result Analysis results
   * @param options Report options
   */
  public generateConsoleReport(
    contractPath: string,
    ast: ClarityAst,
    result: AnalysisResult,
    options: ReportOptions = {}
  ): string {
    const { colored = true, includeAst = false, verbose = false } = options;
    const lines: string[] = [];
    
    // Header
    lines.push(colored ? chalk.bold.blue('Clarity Contract Audit Report') : 'Clarity Contract Audit Report');
    lines.push(colored ? chalk.gray(`Contract: ${contractPath}`) : `Contract: ${contractPath}`);
    lines.push('');
    
    // Summary
    lines.push(colored ? chalk.bold.green('Summary:') : 'Summary:');
    const { issues, metrics } = result;
    const errorCount = issues.filter((issue: AnalysisIssue) => issue.severity === 'error').length;
    const warningCount = issues.filter((issue: AnalysisIssue) => issue.severity === 'warning').length;
    const infoCount = issues.filter((issue: AnalysisIssue) => issue.severity === 'info').length;
    
    lines.push(`- ${colored ? chalk.red(`${errorCount} errors`) : `${errorCount} errors`}`);
    lines.push(`- ${colored ? chalk.yellow(`${warningCount} warnings`) : `${warningCount} warnings`}`);
    lines.push(`- ${colored ? chalk.blue(`${infoCount} infos`) : `${infoCount} infos`}`);
    lines.push('');
    
    // Metrics
    lines.push(colored ? chalk.bold.green('Metrics:') : 'Metrics:');
    lines.push(`- Functions: ${metrics.functionCount} (${metrics.publicFunctionCount} public, ${metrics.privateFunctionCount} private, ${metrics.readOnlyFunctionCount} read-only)`);
    lines.push(`- Maps: ${metrics.mapCount}`);
    lines.push(`- Constants: ${metrics.constantCount}`);
    lines.push(`- Variables: ${metrics.varCount}`);
    lines.push(`- Complexity score: ${metrics.complexityScore}`);
    lines.push('');
    
    // Issues
    if (issues.length > 0) {
      lines.push(colored ? chalk.bold.green('Issues:') : 'Issues:');
      
      // Group issues by severity
      if (errorCount > 0) {
        lines.push(colored ? chalk.bold.red('Errors:') : 'Errors:');
        this.addIssuesByType(issues.filter((issue: AnalysisIssue) => issue.severity === 'error'), lines, colored);
        lines.push('');
      }
      
      if (warningCount > 0) {
        lines.push(colored ? chalk.bold.yellow('Warnings:') : 'Warnings:');
        this.addIssuesByType(issues.filter((issue: AnalysisIssue) => issue.severity === 'warning'), lines, colored);
        lines.push('');
      }
      
      if (infoCount > 0) {
        lines.push(colored ? chalk.bold.blue('Infos:') : 'Infos:');
        this.addIssuesByType(issues.filter((issue: AnalysisIssue) => issue.severity === 'info'), lines, colored);
        lines.push('');
      }
    } else {
      lines.push(colored ? chalk.green('No issues found.') : 'No issues found.');
      lines.push('');
    }
    
    // AST visualization if requested
    if (includeAst) {
      lines.push(colored ? chalk.bold.green('Abstract Syntax Tree:') : 'Abstract Syntax Tree:');
      lines.push(AstVisualizer.visualize(ast, colored));
      lines.push('');
    }
    
    return lines.join('\n');
  }
  
  /**
   * Generate an HTML report from analysis results
   * @param contractPath Path to the analyzed contract
   * @param ast The parsed AST
   * @param result Analysis results
   * @param options Report options
   */
  public generateHtmlReport(
    contractPath: string,
    ast: ClarityAst,
    result: AnalysisResult,
    options: ReportOptions = {}
  ): string {
    const { includeAst = false, verbose = false } = options;
    const { issues, metrics } = result;
    
    const errorCount = issues.filter((issue: AnalysisIssue) => issue.severity === 'error').length;
    const warningCount = issues.filter((issue: AnalysisIssue) => issue.severity === 'warning').length;
    const infoCount = issues.filter((issue: AnalysisIssue) => issue.severity === 'info').length;
    
    // Convert AST to JSON for HTML display
    const astJson = includeAst ? JSON.stringify(ast, null, 2) : '';
    
    // HTML Template
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clarity Contract Audit Report</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #1a73e8;
    }
    .summary-box {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .summary-item {
      flex: 1;
      padding: 15px;
      border-radius: 5px;
      text-align: center;
    }
    .error {
      background-color: #fdecea;
      color: #d50000;
    }
    .warning {
      background-color: #fff8e1;
      color: #ff6d00;
    }
    .info {
      background-color: #e8f0fe;
      color: #1a73e8;
    }
    .metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 20px;
    }
    .metric-item {
      background-color: #f5f5f5;
      padding: 10px;
      border-radius: 5px;
      flex: 1;
      min-width: 200px;
    }
    .issue {
      border-left: 3px solid #ccc;
      padding: 10px;
      margin-bottom: 10px;
    }
    .issue.error {
      border-left-color: #d50000;
    }
    .issue.warning {
      border-left-color: #ff6d00;
    }
    .issue.info {
      border-left-color: #1a73e8;
    }
    .issue-type {
      font-weight: bold;
    }
    .issue-message {
      margin: 5px 0;
    }
    .issue-suggestion {
      color: #666;
      font-style: italic;
    }
    pre {
      background-color: #f5f5f5;
      padding: 10px;
      border-radius: 5px;
      overflow-x: auto;
    }
    .severity-label {
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.8em;
    }
  </style>
</head>
<body>
  <h1>Clarity Contract Audit Report</h1>
  <p>Contract: ${contractPath}</p>
  
  <h2>Summary</h2>
  <div class="summary-box">
    <div class="summary-item error">
      <h3>${errorCount}</h3>
      <p>Errors</p>
    </div>
    <div class="summary-item warning">
      <h3>${warningCount}</h3>
      <p>Warnings</p>
    </div>
    <div class="summary-item info">
      <h3>${infoCount}</h3>
      <p>Infos</p>
    </div>
  </div>
  
  <h2>Metrics</h2>
  <div class="metrics">
    <div class="metric-item">
      <h4>Functions</h4>
      <p>${metrics.functionCount} total</p>
      <ul>
        <li>${metrics.publicFunctionCount} public</li>
        <li>${metrics.privateFunctionCount} private</li>
        <li>${metrics.readOnlyFunctionCount} read-only</li>
      </ul>
    </div>
    <div class="metric-item">
      <h4>Data Structures</h4>
      <ul>
        <li>${metrics.mapCount} maps</li>
        <li>${metrics.constantCount} constants</li>
        <li>${metrics.varCount} variables</li>
      </ul>
    </div>
    <div class="metric-item">
      <h4>Complexity</h4>
      <p>Score: ${metrics.complexityScore}</p>
    </div>
  </div>
  
  <h2>Issues</h2>
  ${issues.length === 0 ? '<p>No issues found.</p>' : this.generateHtmlIssues(issues)}
  
  ${includeAst ? `
  <h2>Abstract Syntax Tree</h2>
  <pre>${this.escapeHtml(astJson)}</pre>
  ` : ''}
</body>
</html>`;
  }
  
  /**
   * Add issues of a specific type to the report
   * @param issues The issues to add
   * @param lines The report lines to append to
   * @param colored Whether to use colored output
   */
  private addIssuesByType(issues: AnalysisIssue[], lines: string[], colored: boolean): void {
    issues.forEach((issue, i) => {
      const issueType = colored ? chalk.cyan(issue.type) : issue.type;
      lines.push(`${i + 1}. ${issueType}: ${issue.message}`);
      
      if (issue.suggestion) {
        lines.push(`   ${colored ? chalk.gray(`Suggestion: ${issue.suggestion}`) : `Suggestion: ${issue.suggestion}`}`);
      }
      
      if (issue.location) {
        const locationStr = `Line: ${issue.location.line || 'unknown'}, Column: ${issue.location.column || 'unknown'}`;
        lines.push(`   ${colored ? chalk.gray(`Location: ${locationStr}`) : `Location: ${locationStr}`}`);
      }
      
      if (issue.code) {
        lines.push(`   ${colored ? chalk.gray('Code:') : 'Code:'}`);
        lines.push(`   ${issue.code}`);
      }
    });
  }
  
  /**
   * Generate HTML for issues section
   * @param issues The issues to display
   */
  private generateHtmlIssues(issues: AnalysisIssue[]): string {
    const errorIssues = issues.filter(issue => issue.severity === 'error');
    const warningIssues = issues.filter(issue => issue.severity === 'warning');
    const infoIssues = issues.filter(issue => issue.severity === 'info');
    
    let html = '';
    
    if (errorIssues.length > 0) {
      html += '<h3>Errors</h3>';
      html += this.issuesListToHtml(errorIssues);
    }
    
    if (warningIssues.length > 0) {
      html += '<h3>Warnings</h3>';
      html += this.issuesListToHtml(warningIssues);
    }
    
    if (infoIssues.length > 0) {
      html += '<h3>Infos</h3>';
      html += this.issuesListToHtml(infoIssues);
    }
    
    return html;
  }
  
  /**
   * Convert a list of issues to HTML
   * @param issues The issues to convert
   */
  private issuesListToHtml(issues: AnalysisIssue[]): string {
    return issues.map(issue => `
      <div class="issue ${issue.severity}">
        <div class="issue-type">
          ${this.escapeHtml(issue.type)}
          <span class="severity-label ${issue.severity}">${issue.severity.toUpperCase()}</span>
        </div>
        <div class="issue-message">${this.escapeHtml(issue.message)}</div>
        ${issue.suggestion ? `<div class="issue-suggestion">${this.escapeHtml(issue.suggestion)}</div>` : ''}
        ${issue.location ? `<div class="issue-location">Location: Line ${issue.location.line || 'unknown'}, Column ${issue.location.column || 'unknown'}</div>` : ''}
        ${issue.code ? `<pre>${this.escapeHtml(issue.code)}</pre>` : ''}
      </div>
    `).join('');
  }
  
  /**
   * Escape HTML special characters
   * @param str String to escape
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
