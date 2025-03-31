# Clarity Contract Audit Automation Suite

An AI-assisted auditing tool for Clarity smart contracts on the Stacks blockchain.

## Overview

The Clarity Contract Audit Automation Suite is a comprehensive tool designed to detect vulnerabilities, optimize gas usage, and ensure best practices in Clarity smart contracts. It leverages static analysis, symbolic execution, and formal verification techniques to provide comprehensive security audits.

## Features

- **Static Analysis**: Identify syntax issues, code smells, and basic vulnerabilities
- **Clarity-Specific Checks**: Detect vulnerabilities unique to the Clarity language
- **Gas Optimization**: Suggestions for improving contract efficiency
- **Formal Verification**: Mathematically prove the correctness of critical contract properties
- **Interactive Reports**: Detailed, actionable audit reports with remediation suggestions

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

```bash
# Analyze a single Clarity contract
npm run start -- analyze path/to/contract.clar

# Generate a full audit report
npm run start -- audit path/to/contract.clar --output report.html
```

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
