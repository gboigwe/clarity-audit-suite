import * as path from 'path';
import { SimplifiedClarityParser } from '../src/parser/clarity-parser';
import { StaticAnalyzer } from '../src/analyzers/static-analyzer';
import { ReportGenerator } from '../src/reports/report-generator';

async function runTest() {
  try {
    // Path to our sample contract
    const contractPath = path.resolve(__dirname, '../examples/sample-contract.clar');
    
    console.log(`Analyzing contract: ${contractPath}`);
    
    // Parse the contract using simplified parser
    const parser = new SimplifiedClarityParser();
    const ast = await parser.parseFile(contractPath);
    
    console.log('Parsing completed successfully.');
    
    // Analyze the contract
    const analyzer = new StaticAnalyzer();
    const result = analyzer.analyze(ast);
    
    console.log('Analysis completed successfully.');
    console.log(`Found ${result.issues.length} issues:`);
    console.log(`- ${result.issues.filter(i => i.severity === 'error').length} errors`);
    console.log(`- ${result.issues.filter(i => i.severity === 'warning').length} warnings`);
    console.log(`- ${result.issues.filter(i => i.severity === 'info').length} infos`);
    
    // Generate the report
    const reportGenerator = new ReportGenerator();
    const report = reportGenerator.generateConsoleReport(
      contractPath,
      ast,
      result,
      { includeAst: true, colored: true }
    );
    
    console.log('\nGenerated Report:');
    console.log('='.repeat(80));
    console.log(report);
    
    return true;
  } catch (error) {
    console.error('Error during test:', error);
    return false;
  }
}

// Run the test
runTest().then(success => {
  if (success) {
    console.log('Test completed successfully!');
  } else {
    console.error('Test failed.');
    process.exit(1);
  }
});
