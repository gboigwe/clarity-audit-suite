import * as fs from 'fs-extra';
import * as path from 'path';
import { Command } from 'commander';
// Updated imports for enhanced parser
import { EnhancedClarityParserService } from './parser/clarity-parser';
import { EnhancedStaticAnalyzer } from './analyzers/enhanced_static_analyzer';
import { ReportGenerator } from './reports/report-generator';

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
  .option('--vulnerabilities', 'show detailed vulnerability analysis')
  .option('--call-graph', 'include call graph in report')
  .option('--data-flow', 'include data flow analysis')
  .action(async (file, cmdOptions) => {
    try {
      const contractPath = path.resolve(file);
      
      if (!fs.existsSync(contractPath)) {
        console.error(`Error: File not found: ${contractPath}`);
        process.exit(1);
      }
      
      // Parse the contract with enhanced parser
      const parser = new EnhancedClarityParserService();
      const parseResult = await parser.parseFile(contractPath);
      
      // Check for parsing errors
      if (!parseResult.success || !parseResult.ast) {
        console.error('❌ Parsing failed:');
        for (const error of parseResult.errors) {
          console.error(`   ${error.message} (Line ${error.location?.line || 'unknown'}:${error.location?.column || 'unknown'})`);
        }
        process.exit(1);
      }
      
      console.log('✅ Parsing successful');
      
      // Show parsing statistics if verbose
      if (cmdOptions.verbose) {
        const stats = parser.getParsingStatistics(parseResult);
        console.log('📊 Contract Statistics:');
        console.log(`   Functions: ${stats.totalFunctions} (${stats.publicFunctions} public, ${stats.privateFunctions} private, ${stats.readOnlyFunctions} read-only)`);
        console.log(`   Constants: ${stats.constants}, Variables: ${stats.variables}, Maps: ${stats.maps}`);
        console.log();
      }
      
      // Analyze the contract with enhanced analyzer
      const analyzer = new EnhancedStaticAnalyzer();
      const result = analyzer.analyzeEnhanced(parseResult.ast);
      
      // Generate the report
      const reportGenerator = new ReportGenerator();
      const reportOptions = {
        includeAst: cmdOptions.ast,
        colored: cmdOptions.color,
        verbose: cmdOptions.verbose
      };
      
      let report: string;
      if (cmdOptions.format === 'html') {
        report = reportGenerator.generateHtmlReport(contractPath, parseResult.ast, result, reportOptions);
      } else {
        report = reportGenerator.generateConsoleReport(contractPath, parseResult.ast, result, reportOptions);
      }
      
      // Write the report to the output file or stdout
      if (cmdOptions.output) {
        const outputPath = path.resolve(cmdOptions.output);
        await fs.writeFile(outputPath, report);
        console.log(`Report written to ${outputPath}`);
      } else {
        console.log(report);
      }
      
      // Show enhanced analysis results
      if (cmdOptions.vulnerabilities && result.vulnerabilities.length > 0) {
        console.log('\n🚨 Security Vulnerabilities Found:');
        for (const vuln of result.vulnerabilities) {
          console.log(`\n❌ ${vuln.type} (${vuln.riskLevel} risk):`);
          console.log(`   ${vuln.message}`);
          console.log(`   Category: ${vuln.category}`);
          if (vuln.cwe) console.log(`   CWE: ${vuln.cwe}`);
          console.log(`   💡 ${vuln.recommendation}`);
          if (vuln.codeExample && cmdOptions.verbose) {
            console.log(`\n   Code Example:\n${vuln.codeExample}`);
          }
        }
      }
      
      // Show call graph if requested
      if (cmdOptions.callGraph && result.callGraph.length > 0) {
        console.log('\n📞 Call Graph:');
        for (const node of result.callGraph) {
          console.log(`   ${node.functionName}:`);
          console.log(`     Calls: [${node.calls.join(', ') || 'none'}]`);
          console.log(`     Called by: [${node.calledBy.join(', ') || 'none'}]`);
          console.log(`     External: ${node.isExternal}, State-modifying: ${node.modifiesState}`);
        }
      }
      
      // Show data flow if requested
      if (cmdOptions.dataFlow && result.dataFlowGraph.length > 0) {
        console.log('\n🔄 Data Flow:');
        for (const node of result.dataFlowGraph.slice(0, 5)) { // Show first 5
          console.log(`   ${node.name} (${node.type}):`);
          console.log(`     Readers: [${node.readers.join(', ') || 'none'}]`);
          console.log(`     Writers: [${node.writers.join(', ') || 'none'}]`);
        }
        if (result.dataFlowGraph.length > 5) {
          console.log(`   ... and ${result.dataFlowGraph.length - 5} more`);
        }
      }
      
      // Exit with error code if vulnerabilities found
      if (result.vulnerabilities.some(v => v.riskLevel === 'high' || v.riskLevel === 'critical')) {
        console.log('\n⚠️  High/Critical vulnerabilities found. Exiting with error code 1.');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Error analyzing contract:', error);
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
    // Comprehensive audit with all enhanced features enabled
    try {
      const contractPath = path.resolve(file);
      
      if (!fs.existsSync(contractPath)) {
        console.error(`Error: File not found: ${contractPath}`);
        process.exit(1);
      }
      
      console.log('🔍 Starting comprehensive audit...\n');
      
      // Parse the contract
      const parser = new EnhancedClarityParserService();
      const parseResult = await parser.parseFile(contractPath);
      
      if (!parseResult.success || !parseResult.ast) {
        console.error('❌ Parsing failed:');
        for (const error of parseResult.errors) {
          console.error(`   ${error.message} (Line ${error.location?.line || 'unknown'})`);
        }
        process.exit(1);
      }
      
      // Enhanced analysis
      const analyzer = new EnhancedStaticAnalyzer();
      const result = analyzer.analyzeEnhanced(parseResult.ast);
      
      // Generate comprehensive report
      const reportGenerator = new ReportGenerator();
      const reportOptions = {
        includeAst: cmdOptions.ast,
        colored: cmdOptions.color,
        verbose: true // Always verbose for audit
      };
      
      let report: string;
      if (cmdOptions.format === 'html') {
        report = reportGenerator.generateHtmlReport(contractPath, parseResult.ast, result, reportOptions);
      } else {
        report = reportGenerator.generateConsoleReport(contractPath, parseResult.ast, result, reportOptions);
      }
      
      // Show parsing report
      const parsingReport = parser.generateParsingReport(parseResult);
      console.log(parsingReport);
      console.log('\n' + '='.repeat(80) + '\n');
      
      // Show main analysis report
      if (cmdOptions.output) {
        const outputPath = path.resolve(cmdOptions.output);
        await fs.writeFile(outputPath, report);
        console.log(`📋 Detailed report written to ${outputPath}`);
      } else {
        console.log(report);
      }
      
      // Always show vulnerabilities in audit mode
      if (result.vulnerabilities.length > 0) {
        console.log('\n🚨 SECURITY AUDIT RESULTS:');
        
        const critical = result.vulnerabilities.filter(v => v.riskLevel === 'critical');
        const high = result.vulnerabilities.filter(v => v.riskLevel === 'high');
        const medium = result.vulnerabilities.filter(v => v.riskLevel === 'medium');
        const low = result.vulnerabilities.filter(v => v.riskLevel === 'low');
        
        console.log(`   Critical: ${critical.length}`);
        console.log(`   High: ${high.length}`);
        console.log(`   Medium: ${medium.length}`);
        console.log(`   Low: ${low.length}`);
        
        // Show critical and high vulnerabilities
        [...critical, ...high].forEach((vuln, i) => {
          console.log(`\n${i + 1}. 🔴 ${vuln.type} (${vuln.riskLevel.toUpperCase()} RISK)`);
          console.log(`   ${vuln.message}`);
          console.log(`   Category: ${vuln.category}`);
          if (vuln.cwe) console.log(`   CWE: ${vuln.cwe}`);
          console.log(`   💡 Recommendation: ${vuln.recommendation}`);
        });
        
        // Summary
        console.log('\n📊 AUDIT SUMMARY:');
        if (critical.length > 0) {
          console.log('   🔴 CRITICAL ISSUES FOUND - Immediate action required');
        } else if (high.length > 0) {
          console.log('   🟠 HIGH RISK ISSUES - Should be addressed before deployment');
        } else if (medium.length > 0) {
          console.log('   🟡 MEDIUM RISK ISSUES - Recommended to address');
        } else {
          console.log('   🟢 No high-risk vulnerabilities found');
        }
      } else {
        console.log('\n✅ SECURITY AUDIT PASSED - No vulnerabilities detected');
      }
      
      // Always show call graph and data flow in audit mode
      if (result.callGraph.length > 0) {
        console.log('\n📞 Function Call Graph:');
        result.callGraph.forEach(node => {
          console.log(`   ${node.functionName}: calls [${node.calls.join(', ') || 'none'}]`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error during audit:', error);
      process.exit(1);
    }
  });

// New command for quick syntax validation
program
  .command('validate')
  .description('Quickly validate Clarity contract syntax')
  .argument('<file>', 'path to Clarity contract file')
  .action(async (file) => {
    try {
      const contractPath = path.resolve(file);
      
      if (!fs.existsSync(contractPath)) {
        console.error(`Error: File not found: ${contractPath}`);
        process.exit(1);
      }
      
      const contractSource = await fs.readFile(contractPath, 'utf8');
      const parser = new EnhancedClarityParserService();
      const validation = parser.validateSyntax(contractSource);
      
      if (validation.valid) {
        console.log('✅ Syntax validation passed');
      } else {
        console.log('❌ Syntax validation failed:');
        validation.errors.forEach(error => {
          console.log(`   Line ${error.line}:${error.column} - ${error.message}`);
        });
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Error during validation:', error);
      process.exit(1);
    }
  });

// Execute the program
program.parse(process.argv);
