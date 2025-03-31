# Clarity Contract Audit Suite Setup

This document provides detailed instructions for setting up and running the Clarity Contract Audit Suite.

## Prerequisites

- Node.js v16 or higher
- npm v7 or higher

## Installation

### Option 1: From GitHub

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

### Option 2: Manual Setup

If you prefer to set up the project manually, follow these steps:

```bash
# Create project directory
mkdir -p clarity-audit-suite
cd clarity-audit-suite

# Create subdirectories
mkdir -p src/parser src/analyzers src/utils src/reports
mkdir -p examples tests

# Initialize npm project
npm init -y
```

Next, create the configuration files:

1. **tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

2. **package.json** - Update with scripts and dependencies
```bash
# Install dependencies
npm install @stacks/transactions@6.7.0 commander@10.0.1 fs-extra@11.1.1 chalk@4.1.2

# Install development dependencies
npm install --save-dev typescript@5.1.3 ts-node@10.9.1 @types/node@20.2.5 @types/fs-extra@11.0.1 @types/jest@29.5.2 jest@29.5.0 ts-jest@29.1.0 @typescript-eslint/eslint-plugin@5.59.9 @typescript-eslint/parser@5.59.9 eslint@8.42.0

# Add scripts to package.json
npm pkg set scripts.build="tsc"
npm pkg set scripts.start="node dist/index.js"
npm pkg set scripts.dev="ts-node src/index.ts"
npm pkg set scripts.test="jest"
npm pkg set scripts.lint="eslint . --ext .ts"
```

## Testing Your Installation

To verify that your installation is working correctly:

```bash
# Run the analyzer on the example contract
npm start -- analyze examples/sample-contract.clar

# Run unit tests
npm test
```

## Usage Guide

### Basic Analysis

To analyze a Clarity contract for issues:

```bash
npm start -- analyze path/to/your/contract.clar
```

### Generate an HTML Report

```bash
npm start -- analyze path/to/your/contract.clar -f html -o report.html
```

### Include AST Visualization

```bash
npm start -- analyze path/to/your/contract.clar --ast
```

### Full Audit

For a comprehensive audit (currently an alias for analyze with different defaults):

```bash
npm start -- audit path/to/your/contract.clar
```

## Command Line Options

- `-o, --output <file>` - Output file for report (default: stdout)
- `-f, --format <format>` - Output format (console, html) (default: console)
- `--ast` - Include AST in report
- `--no-color` - Disable colored output
- `-v, --verbose` - Show verbose output

## Project Structure

```
clarity-audit-suite/
├── src/
│   ├── index.ts                  # Main entry point and CLI
│   ├── parser/
│   │   ├── simplified-parser.ts  # Clarity contract parser
│   │   └── types.ts              # Type definitions for AST
│   ├── analyzers/
│   │   └── static-analyzer.ts    # Static analysis implementation
│   ├── utils/
│   │   └── ast-utils.ts          # AST utility functions
│   └── reports/
│       └── report-generator.ts   # Report generation
├── examples/
│   └── sample-contract.clar      # Example contract for testing
└── tests/
    ├── parser.test.ts            # Unit tests for parser
    └── test-analyzer.ts          # Integration test
```

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Make sure all dependencies are installed: `npm install`
   - Verify the correct directory structure

2. **TypeScript errors**
   - Check that you're using compatible TypeScript version: `npm list typescript`
   - Verify tsconfig.json is correctly set up

3. **Parsing errors**
   - Start with simpler contracts for testing
   - Verify the contract syntax is valid

### Getting Help

If you encounter issues not covered here, please:
1. Open an issue on the repository with details about your problem
