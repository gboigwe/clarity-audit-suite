import * as fs from 'fs-extra';
import * as path from 'path';
import { Command } from 'commander';
// Import the simplified parser instead of the chevrotain-based one
import { SimplifiedClarityParser } from './parser/clarity-parser';
import { StaticAnalyzer } from './analyzers/static-analyzer';
import { ReportGenerator } from './reports/report-generator';
// import { ClarityParserService } from './parser/clarity-parser';

// Create a program instance
const program = new Command();

program
  .name('clarity-audit-suite')
  .description('AI-assisted auditing tool for Clarity smart contracts')
  .version('0.1.0');

// Command to analyze a contract
program
  .command('analyze')
  .description('Analyze a Clarity contract for issues')
  .argument('<file>', 'path to Clarity contract file')
  .option('-o, --output <file>', 'output file for report (default: stdout)')
  .option('-f, --format <format>', 'output format (console, html)', 'console')
  .option('--ast', 'include AST in report')
  .option('--no-color', 'disable colored output')
  .option('-v, --verbose', 'show verbose output')
  .action(async (file, cmdOptions) => {
    try {
      const contractPath = path.resolve(file);
      
      if (!fs.existsSync(contractPath)) {
        console.error(`Error: File not found: ${contractPath}`);
        process.exit(1);
      }
      
      // Parse the contract
      const parser = new SimplifiedClarityParser();
      const ast = await parser.parseFile(contractPath);
      
      // Analyze the contract
      const analyzer = new StaticAnalyzer();
      const result = analyzer.analyze(ast);
      
      // Generate the report
      const reportGenerator = new ReportGenerator();
      const reportOptions = {
        includeAst: cmdOptions.ast,
        colored: cmdOptions.color,
        verbose: cmdOptions.verbose
      };
      
      let report: string;
      if (cmdOptions.format === 'html') {
        report = reportGenerator.generateHtmlReport(contractPath, ast, result, reportOptions);
      } else {
        report = reportGenerator.generateConsoleReport(contractPath, ast, result, reportOptions);
      }
      
      // Write the report to the output file or stdout
      if (cmdOptions.output) {
        const outputPath = path.resolve(cmdOptions.output);
        await fs.writeFile(outputPath, report);
        console.log(`Report written to ${outputPath}`);
      } else {
        console.log(report);
      }
    } catch (error) {
      console.error('Error analyzing contract:', error);
      process.exit(1);
    }
  });

// Command to perform a comprehensive audit
program
  .command('audit')
  .description('Perform a comprehensive audit of a Clarity contract')
  .argument('<file>', 'path to Clarity contract file')
  .option('-o, --output <file>', 'output file for report (default: stdout)')
  .option('-f, --format <format>', 'output format (console, html)', 'html')
  .option('--ast', 'include AST in report')
  .option('--no-color', 'disable colored output')
  .option('-v, --verbose', 'show verbose output')
  .action(async (file, cmdOptions) => {
    // For now, this is just an alias for 'analyze' with different defaults
    // In the future, this would perform more comprehensive checks
    try {
      const contractPath = path.resolve(file);
      
      if (!fs.existsSync(contractPath)) {
        console.error(`Error: File not found: ${contractPath}`);
        process.exit(1);
      }
      
      // Parse the contract
      const parser = new SimplifiedClarityParser();
      const ast = await parser.parseFile(contractPath);
      
      // Analyze the contract
      const analyzer = new StaticAnalyzer();
      const result = analyzer.analyze(ast);
      
      // Generate the report
      const reportGenerator = new ReportGenerator();
      const reportOptions = {
        includeAst: cmdOptions.ast,
        colored: cmdOptions.color,
        verbose: cmdOptions.verbose
      };
      
      let report: string;
      if (cmdOptions.format === 'html') {
        report = reportGenerator.generateHtmlReport(contractPath, ast, result, reportOptions);
      } else {
        report = reportGenerator.generateConsoleReport(contractPath, ast, result, reportOptions);
      }
      
      // Write the report to the output file or stdout
      if (cmdOptions.output) {
        const outputPath = path.resolve(cmdOptions.output);
        await fs.writeFile(outputPath, report);
        console.log(`Report written to ${outputPath}`);
      } else {
        console.log(report);
      }
    } catch (error) {
      console.error('Error auditing contract:', error);
      process.exit(1);
    }
  });

// Execute the program
program.parse(process.argv);
