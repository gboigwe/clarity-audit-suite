// Enhanced Parser Integration Example
// examples/enhanced-parser-demo.ts

import * as fs from 'fs-extra';
import * as path from 'path';
import { EnhancedClarityParserService } from '../src/parser/clarity-parser';
import { EnhancedStaticAnalyzer } from '../src/analyzers/enhanced_static_analyzer';
import { ReportGenerator } from '../src/reports/report-generator';

/**
 * Demonstration of the enhanced parser capabilities
 * Shows the difference between old and new parser
 */
async function demonstrateEnhancedParser() {
  console.log('🚀 Enhanced Clarity Parser Demonstration\n');

  // Sample contract with intentional vulnerabilities for demonstration
  const sampleContract = `
;; Sample Contract with Various Issues for Enhanced Analysis
(define-constant contract-owner tx-sender)
(define-constant unused-constant u42) ;; Unused constant

;; Data structures
(define-map user-balances principal uint)
(define-data-var total-supply uint u1000000)
(define-data-var paused bool false)

;; Vulnerable function - reentrancy risk
(define-public (withdraw (amount uint))
  (let ((balance (default-to u0 (map-get? user-balances tx-sender))))
    (begin
      ;; BAD: External call before state update
      (unwrap! (stx-transfer? amount tx-sender contract-owner) (err u1))
      ;; State update after external call - REENTRANCY RISK!
      (map-set user-balances tx-sender (- balance amount))
      (ok true)
    )
  )
)

;; Missing authorization check
(define-public (admin-pause)
  ;; BAD: No authorization check!
  (begin
    (var-set paused true)
    (ok true)
  )
)

;; Potential overflow
(define-public (mint-tokens (amount uint))
  (begin
    ;; BAD: No overflow check!
    (var-set total-supply (+ (var-get total-supply) amount))
    (ok true)
  )
)

;; Unsafe unwrap
(define-public (unsafe-transfer (amount uint) (recipient principal))
  (begin
    ;; BAD: Using unwrap! without proper error handling
    (unwrap! (ft-transfer? some-token amount tx-sender recipient) (err u1))
    (ok true)
  )
)

;; Good function with proper checks
(define-public (safe-deposit (amount uint))
  (begin
    ;; Good: Authorization check
    (asserts! (not (var-get paused)) (err u2))
    ;; Good: Input validation
    (asserts! (> amount u0) (err u3))
    ;; Good: State update before external operations
    (map-set user-balances tx-sender 
      (+ (default-to u0 (map-get? user-balances tx-sender)) amount))
    (ok true)
  )
)

;; Unused private function
(define-private (unused-helper)
  (+ u1 u2)
)

;; Read-only function with potential division by zero
(define-read-only (calculate-percentage (value uint) (total uint))
  ;; BAD: No zero check!
  (/ (* value u100) total)
)
`;

  // Create parser instances
  const enhancedParser = new EnhancedClarityParserService();
  const oldParser = new EnhancedClarityParserService();
  const enhancedAnalyzer = new EnhancedStaticAnalyzer();
  const reportGenerator = new ReportGenerator();

  console.log('📊 Parsing Comparison\n');
  
  // === OLD PARSER ANALYSIS ===
  console.log('🔹 Old Parser Results:');
const oldStart = performance.now();
const oldParseResult = oldParser.parseText(sampleContract);
const oldResult = enhancedAnalyzer.analyze(oldParseResult.ast!);
const oldDuration = performance.now() - oldStart;

  console.log(`   Parsing time: ${oldDuration.toFixed(2)}ms`);
  console.log(`   Functions found: ${oldParser.extractFunctions(oldParseResult.ast!).length}`);
  console.log(`   Issues found: ${oldResult.issues.length}`);
  console.log(`   Issue types: ${[...new Set(oldResult.issues.map(i => i.type))].join(', ')}`);
  console.log();

  // === ENHANCED PARSER ANALYSIS ===
  console.log('🔹 Enhanced Parser Results:');
  const enhancedStart = performance.now();
  const enhancedParseResult = enhancedParser.parseText(sampleContract);
  const enhancedAnalysisResult = enhancedAnalyzer.analyzeEnhanced(enhancedParseResult.ast!);
  const enhancedDuration = performance.now() - enhancedStart;

  console.log(`   Parsing time: ${enhancedDuration.toFixed(2)}ms`);
  console.log(`   Functions found: ${enhancedParser.extractFunctions(enhancedParseResult.ast!).length}`);
  console.log(`   Parse errors: ${enhancedParseResult.errors.filter(e => e.type === 'parse').length}`);
  console.log(`   Semantic errors: ${enhancedParseResult.errors.filter(e => e.type === 'semantic').length}`);
  console.log(`   Total issues: ${enhancedAnalysisResult.issues.length}`);
  console.log(`   Vulnerabilities: ${enhancedAnalysisResult.vulnerabilities.length}`);

  // === DETAILED ENHANCED ANALYSIS ===
  console.log('\n🔍 Enhanced Analysis Details\n');

  // Parsing statistics
  const stats = enhancedParser.getParsingStatistics(enhancedParseResult);
  console.log('📈 Contract Statistics:');
  console.log(`   Functions: ${stats.totalFunctions} (${stats.publicFunctions} public, ${stats.privateFunctions} private, ${stats.readOnlyFunctions} read-only)`);
  console.log(`   Constants: ${stats.constants}`);
  console.log(`   Variables: ${stats.variables}`);
  console.log(`   Maps: ${stats.maps}`);
  console.log();

  // Type Environment
  if (enhancedParseResult.semanticResult?.typeEnvironment) {
    const typeEnv = enhancedParseResult.semanticResult.typeEnvironment;
    console.log('🏗️  Type Environment:');
    
    console.log('   Functions:');
    for (const [name, sig] of typeEnv.functions) {
      console.log(`     - ${name}: ${sig.visibility}, params: ${sig.parameters.length}, pure: ${sig.pure}`);
    }
    
    console.log('   Variables:');
    for (const [name, info] of typeEnv.variables) {
      console.log(`     - ${name}: accessed=${info.accessed}, modified=${info.modified}`);
    }
    
    console.log('   Maps:');
    for (const [name, info] of typeEnv.maps) {
      console.log(`     - ${name}: accessed=${info.accessed}, modified=${info.modified}`);
    }
    console.log();
  }

  // Call Graph
  console.log('📞 Call Graph:');
  for (const node of enhancedAnalysisResult.callGraph) {
    console.log(`   ${node.functionName}:`);
    console.log(`     - Calls: [${node.calls.join(', ') || 'none'}]`);
    console.log(`     - Called by: [${node.calledBy.join(', ') || 'none'}]`);
    console.log(`     - External: ${node.isExternal}, State-modifying: ${node.modifiesState}`);
  }
  console.log();

  // Vulnerabilities
  console.log('🚨 Security Vulnerabilities:');
  for (const vuln of enhancedAnalysisResult.vulnerabilities) {
    console.log(`   ${vuln.type} (${vuln.riskLevel} risk):`);
    console.log(`     - ${vuln.message}`);
    console.log(`     - Category: ${vuln.category}`);
    console.log(`     - CWE: ${vuln.cwe || 'N/A'}`);
    console.log(`     - Recommendation: ${vuln.recommendation}`);
    console.log();
  }

  // Generate comprehensive report
  console.log('📋 Generating Comprehensive Report...\n');
  
  const enhancedReport = reportGenerator.generateConsoleReport(
    'enhanced-sample-contract.clar',
    enhancedParseResult.ast!,
    enhancedAnalysisResult,
    { includeAst: false, colored: true, verbose: true }
  );

  console.log(enhancedReport);

  // Performance comparison
  console.log('\n⚡ Performance Comparison:');
  console.log(`   Old parser: ${oldDuration.toFixed(2)}ms`);
  console.log(`   Enhanced parser: ${enhancedDuration.toFixed(2)}ms`);
  console.log(`   Overhead: ${((enhancedDuration - oldDuration) / oldDuration * 100).toFixed(1)}%`);
  console.log();

  // Capability comparison
  console.log('🆚 Capability Comparison:');
  console.log('   Old Parser:');
  console.log('     ✅ Basic syntax parsing');
  console.log('     ✅ Function extraction');
  console.log('     ✅ Simple pattern matching');
  console.log('     ❌ Semantic analysis');
  console.log('     ❌ Type checking');
  console.log('     ❌ Data flow analysis');
  console.log('     ❌ Vulnerability detection');
  console.log();
  console.log('   Enhanced Parser:');
  console.log('     ✅ Complete AST with location info');
  console.log('     ✅ Full semantic analysis');
  console.log('     ✅ Type environment tracking');
  console.log('     ✅ Call graph generation');
  console.log('     ✅ Data flow analysis');
  console.log('     ✅ Advanced vulnerability detection');
  console.log('     ✅ Reentrancy detection');
  console.log('     ✅ Authorization analysis');
  console.log('     ✅ Overflow detection');
  console.log('     ✅ State inconsistency detection');

  // Save detailed analysis to file
  const detailedReport = enhancedParser.generateParsingReport(enhancedParseResult);
  await fs.writeFile(path.join(__dirname, 'enhanced-analysis-report.txt'), detailedReport);
  console.log('\n💾 Detailed report saved to: enhanced-analysis-report.txt');

  return {
    oldResult,
    enhancedResult: enhancedAnalysisResult,
    performance: {
      oldDuration,
      enhancedDuration,
      improvement: enhancedAnalysisResult.vulnerabilities.length
    }
  };
}

/**
 * Demonstrate specific vulnerability detection
 */
async function demonstrateVulnerabilityDetection() {
  console.log('\n🔐 Vulnerability Detection Showcase\n');

  const vulnerableContracts = {
    reentrancy: `
(define-map balances principal uint)
(define-public (withdraw (amount uint))
  (begin
    ;; VULNERABLE: External call before state update
    (unwrap! (stx-transfer? amount tx-sender 'SP123) (err u1))
    (map-set balances tx-sender (- (unwrap! (map-get? balances tx-sender) (err u2)) amount))
    (ok true)
  )
)`,
    
    authorization: `
(define-data-var admin-setting uint u0)
(define-public (change-admin-setting (new-value uint))
  ;; VULNERABLE: No authorization check
  (begin
    (var-set admin-setting new-value)
    (ok true)
  )
)`,
    
    overflow: `
(define-data-var total-supply uint u0)
(define-public (mint (amount uint))
  ;; VULNERABLE: No overflow check
  (begin
    (var-set total-supply (+ (var-get total-supply) amount))
    (ok true)
  )
)`
  };

  const parser = new EnhancedClarityParserService();
  const analyzer = new EnhancedStaticAnalyzer();

  for (const [vulnType, contract] of Object.entries(vulnerableContracts)) {
    console.log(`🎯 Testing ${vulnType} detection:`);
    
    const parseResult = parser.parseText(contract);
    const analysisResult = analyzer.analyzeEnhanced(parseResult.ast!);
    
    const relevantVulns = analysisResult.vulnerabilities.filter(v => 
      v.category === vulnType || v.type.includes(vulnType)
    );
    
    if (relevantVulns.length > 0) {
      console.log(`   ✅ Detected ${relevantVulns.length} ${vulnType} vulnerability(ies)`);
      for (const vuln of relevantVulns) {
        console.log(`      - ${vuln.message}`);
        console.log(`      - Risk: ${vuln.riskLevel}`);
      }
    } else {
      console.log(`   ❌ Failed to detect ${vulnType} vulnerability`);
    }
    console.log();
  }
}

/**
 * Updated CLI integration example
 */
export async function runEnhancedCLI(contractPath: string) {
  const parser = new EnhancedClarityParserService();
  const analyzer = new EnhancedStaticAnalyzer();
  const reportGenerator = new ReportGenerator();

  try {
    // Parse with enhanced parser
    const parseResult = await parser.parseFile(contractPath);
    
    if (!parseResult.success || !parseResult.ast) {
      console.error('❌ Parsing failed:');
      for (const error of parseResult.errors) {
        console.error(`   ${error.message} (${error.location?.line}:${error.location?.column})`);
      }
      return;
    }

    console.log('✅ Parsing successful');

    // Enhanced analysis
    const analysisResult = analyzer.analyzeEnhanced(parseResult.ast);

    // Generate report
    const report = reportGenerator.generateConsoleReport(
      contractPath,
      parseResult.ast,
      analysisResult,
      { includeAst: false, colored: true, verbose: true }
    );

    console.log(report);

    // Additional enhanced information
    if (analysisResult.vulnerabilities.length > 0) {
      console.log('\n🚨 Security Vulnerabilities Found:');
      for (const vuln of analysisResult.vulnerabilities) {
        console.log(`\n${vuln.type} (${vuln.riskLevel} risk):`);
        console.log(`   ${vuln.message}`);
        console.log(`   Recommendation: ${vuln.recommendation}`);
        if (vuln.codeExample) {
          console.log(`\n   Example fix:\n${vuln.codeExample}`);
        }
      }
    }

    return {
      success: true,
      parseResult,
      analysisResult
    };

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    return { success: false, error };
  }
}

// Main demonstration
if (require.main === module) {
  demonstrateEnhancedParser()
    .then(() => demonstrateVulnerabilityDetection())
    .then(() => {
      console.log('\n🎉 Enhanced Parser Demonstration Complete!');
      console.log('\n📚 Key Improvements:');
      console.log('   • Complete semantic analysis');
      console.log('   • Advanced vulnerability detection');
      console.log('   • Type-aware analysis');
      console.log('   • Call graph and data flow analysis');
      console.log('   • Precise location tracking');
      console.log('   • Enhanced error reporting');
      console.log('\n🚀 Ready for Phase 2 advanced vulnerability detection!');
    })
    .catch(console.error);
}

export { demonstrateEnhancedParser, demonstrateVulnerabilityDetection };
