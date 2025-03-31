# Clarity Contract Audit Automation Suite

An AI-assisted auditing tool for Clarity smart contracts on the Stacks blockchain.

## Overview

The Clarity Contract Audit Automation Suite is a comprehensive tool designed to detect vulnerabilities, optimize gas usage, and ensure best practices in Clarity smart contracts. It leverages static analysis to provide detailed security audits and actionable recommendations.

## Features

### Current Features (Phase 1)
- ✅ **Clarity Contract Parsing**: Convert Clarity code into an analyzable structure
- ✅ **Static Analysis**: Identify common issues and vulnerabilities
  - Unused functions, variables, and constants
  - Potentially unsafe operations (unwrap! without error handling)
  - Potential division by zero
  - Naming convention violations
- ✅ **Contract Metrics**: Provide insights into contract complexity and structure
- ✅ **Comprehensive Reports**: Generate detailed reports in console and HTML formats
- ✅ **Command Line Interface**: Simple CLI for quick analysis

### Roadmap
- 🔄 **Phase 2: Advanced Vulnerability Detection** (Coming Soon)
  - Reentrancy detection
  - Integer overflow/underflow checks
  - Unauthorized access patterns
- 📅 **Phase 3: Symbolic Execution & Formal Verification** (Planned)
- 📅 **Phase 4: Web Interface & CI/CD Integration** (Planned)

## Installation

```bash
# Clone the repository
git clone https://github.com/gboigwe/clarity-audit-suite.git

# Change to project directory
cd clarity-audit-suite

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Command Line Interface

#### Basic Analysis:
```bash
# Analyze a contract with console output
npm start -- analyze path/to/contract.clar
```

#### Generate HTML Report:
```bash
# Generate a detailed HTML report
npm start -- analyze path/to/contract.clar -f html -o report.html
```

#### Include AST Visualization:
```bash
# Include AST visualization in the report
npm start -- analyze path/to/contract.clar --ast
```

### Example Output

```
Clarity Contract Audit Report
Contract: examples/sample-contract.clar

Summary:
- 0 errors
- 7 warnings
- 1 infos

Metrics:
- Functions: 6 (2 public, 2 private, 2 read-only)
- Maps: 1
- Constants: 4
- Variables: 2
- Complexity score: 6

Issues:
Warnings:
1. unused-function: Private function 'update-user-balance' is defined but never called
   Suggestion: Consider removing the unused function or making sure it's called where needed.
2. unsafe-unwrap: Found 1 usage(s) of unwrap! or unwrap-panic, which can lead to runtime errors
   Suggestion: Consider using 'match' or 'asserts!' with proper error handling instead.

Infos:
1. potential-division-by-zero: Found 1 division operation(s). Ensure divisors cannot be zero
   Suggestion: Consider adding checks before division to ensure the divisor is not zero.
```

## Development

```bash
# Run in development mode
npm run dev -- analyze examples/sample-contract.clar

# Run tests
npm test

# Lint code
npm run lint
```

## Key Components

1. **Parser**: Converts Clarity code into an Abstract Syntax Tree (AST)
2. **Static Analyzer**: Examines the AST for potential issues
3. **Report Generator**: Creates human-readable reports from analysis results
4. **CLI Interface**: Provides a user-friendly command-line interface

## How It Helps the Stacks Ecosystem

The Clarity Contract Audit Automation Suite addresses a critical need in the Stacks ecosystem:

1. **Security Enhancement**: Helps developers identify vulnerabilities before deployment
2. **Educational Tool**: Provides guidance on best practices specific to Clarity
3. **Confidence Building**: Increases trust in smart contracts for users and investors
4. **Integration Potential**: Can be integrated into development workflows and CI/CD pipelines

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and commit: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`t

Please follow the existing code style and add appropriate tests for new features.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- The Stacks Foundation for supporting blockchain innovation
- The Clarity language design team for creating a secure smart contract language
