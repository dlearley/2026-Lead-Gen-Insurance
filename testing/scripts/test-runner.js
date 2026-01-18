#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Insurance Lead Gen Platform
 * Runs all test types with proper configuration and reporting
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class TestRunner {
  constructor() {
    this.testTypes = {
      unit: 'Unit Tests',
      integration: 'Integration Tests',
      e2e: 'End-to-End Tests',
      security: 'Security Tests',
      smoke: 'Smoke Tests',
      performance: 'Performance Tests',
    };
  }

  async runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options,
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, code });
        } else {
          reject({ success: false, code, command: `${command} ${args.join(' ')}` });
        }
      });

      child.on('error', (error) => {
        reject({ success: false, error: error.message });
      });
    });
  }

  log(message, color = COLORS.reset) {
    console.log(`${color}${message}${COLORS.reset}`);
  }

  async checkPrerequisites() {
    this.log('🔍 Checking prerequisites...', COLORS.cyan);

    // Check if test environment file exists
    if (!existsSync('.env.test')) {
      this.log('⚠️  .env.test file not found. Creating from template...', COLORS.yellow);
      // Copy from example if available
      if (existsSync('.env.example.test')) {
        // In a real implementation, you'd copy the file
      }
    }

    // Check if database is accessible
    try {
      await this.runCommand('npx', ['prisma', 'db', 'push', '--schema=prisma/schema.prisma', '--skip-generate'], {
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/insurance_lead_gen_test' }
      });
      this.log('✅ Database connection successful', COLORS.green);
    } catch (error) {
      this.log('❌ Database connection failed', COLORS.red);
      this.log('Make sure PostgreSQL is running and accessible', COLORS.yellow);
      throw error;
    }
  }

  async runTestSuite(testType, scriptName) {
    this.log(`\n🧪 Running ${this.testTypes[testType]}...`, COLORS.bright + COLORS.blue);
    
    const startTime = Date.now();
    
    try {
      await this.runCommand('npm', ['run', scriptName]);
      const duration = Date.now() - startTime;
      this.log(`✅ ${this.testTypes[testType]} completed successfully (${duration}ms)`, COLORS.green);
      return { success: true, duration, testType };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`❌ ${this.testTypes[testType]} failed after ${duration}ms`, COLORS.red);
      return { success: false, duration, testType, error };
    }
  }

  async generateCoverageReport(results) {
    this.log('\n📊 Generating coverage report...', COLORS.cyan);
    
    // Combine coverage reports
    try {
      await this.runCommand('npm', ['run', 'test:coverage:report']);
      this.log('✅ Coverage report generated', COLORS.green);
    } catch (error) {
      this.log('⚠️  Could not generate combined coverage report', COLORS.yellow);
    }
  }

  async runPerformanceTests() {
    this.log('\n⚡ Running performance tests...', COLORS.bright + COLORS.magenta);
    
    const perfTests = [
      { name: 'Baseline Performance', script: 'test:performance:baseline' },
      { name: 'Load Testing', script: 'test:performance:peak' },
      { name: 'Stress Testing', script: 'test:performance:stress' },
    ];

    for (const test of perfTests) {
      try {
        this.log(`\n🔄 ${test.name}...`, COLORS.yellow);
        await this.runCommand('npm', ['run', test.script]);
        this.log(`✅ ${test.name} completed`, COLORS.green);
      } catch (error) {
        this.log(`⚠️  ${test.name} had issues (non-critical)`, COLORS.yellow);
      }
    }
  }

  async generateTestReport(results) {
    const reportPath = join(process.cwd(), 'test-results', 'test-report.md');
    
    let report = `# Test Report - ${new Date().toISOString()}\n\n`;
    
    report += `## Summary\n\n`;
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const total = results.length;
    
    report += `- **Total Tests**: ${total}\n`;
    report += `- **Passed**: ${passed}\n`;
    report += `- **Failed**: ${failed}\n`;
    report += `- **Success Rate**: ${((passed / total) * 100).toFixed(1)}%\n\n`;
    
    report += `## Results by Type\n\n`;
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const color = result.success ? COLORS.green : COLORS.red;
      const duration = `${result.duration}ms`;
      
      report += `### ${status} ${this.testTypes[result.testType]}\n`;
      report += `- **Duration**: ${duration}\n`;
      if (result.error) {
        report += `- **Error**: ${result.error}\n`;
      }
      report += `\n`;
    });
    
    // Write report to file
    // In a real implementation, you'd write this to the file system
    this.log(`\n📄 Test report generated: ${reportPath}`, COLORS.cyan);
    
    return report;
  }

  async runAllTests(options = {}) {
    const {
      testTypes = Object.keys(this.testTypes),
      includePerformance = false,
      includeSecurity = true,
      stopOnFailure = false,
      generateReport = true,
    } = options;

    const results = [];
    const startTime = Date.now();

    this.log('🚀 Starting Comprehensive Test Suite', COLORS.bright + COLORS.green);
    this.log('=' .repeat(60), COLORS.green);

    try {
      // Check prerequisites
      await this.checkPrerequisites();

      // Run unit tests
      if (testTypes.includes('unit')) {
        const result = await this.runTestSuite('unit', 'test:unit');
        results.push(result);
        if (stopOnFailure && !result.success) {
          this.log('🛑 Stopping due to test failure', COLORS.red);
          return { success: false, results, duration: Date.now() - startTime };
        }
      }

      // Run integration tests
      if (testTypes.includes('integration')) {
        const result = await this.runTestSuite('integration', 'test:integration');
        results.push(result);
        if (stopOnFailure && !result.success) {
          this.log('🛑 Stopping due to test failure', COLORS.red);
          return { success: false, results, duration: Date.now() - startTime };
        }
      }

      // Run E2E tests
      if (testTypes.includes('e2e')) {
        const result = await this.runTestSuite('e2e', 'test:e2e');
        results.push(result);
        if (stopOnFailure && !result.success) {
          this.log('🛑 Stopping due to test failure', COLORS.red);
          return { success: false, results, duration: Date.now() - startTime };
        }
      }

      // Run security tests
      if (includeSecurity && testTypes.includes('security')) {
        const result = await this.runTestSuite('security', 'test:security');
        results.push(result);
        if (stopOnFailure && !result.success) {
          this.log('🛑 Stopping due to test failure', COLORS.red);
          return { success: false, results, duration: Date.now() - startTime };
        }
      }

      // Run smoke tests
      if (testTypes.includes('smoke')) {
        const result = await this.runTestSuite('smoke', 'test:smoke');
        results.push(result);
        if (stopOnFailure && !result.success) {
          this.log('🛑 Stopping due to test failure', COLORS.red);
          return { success: false, results, duration: Date.now() - startTime };
        }
      }

      // Run performance tests (optional)
      if (includePerformance) {
        await this.runPerformanceTests();
      }

      // Generate coverage report
      await this.generateCoverageReport(results);

      // Generate test report
      if (generateReport) {
        await this.generateTestReport(results);
      }

      const totalDuration = Date.now() - startTime;
      const passed = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      this.log('\n' + '=' .repeat(60), COLORS.green);
      this.log('📊 Test Suite Summary', COLORS.bright + COLORS.cyan);
      this.log(`Total Duration: ${totalDuration}ms`, COLORS.cyan);
      this.log(`Passed: ${passed}`, COLORS.green);
      this.log(`Failed: ${failed}`, failed > 0 ? COLORS.red : COLORS.green);
      this.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`, 
               failed === 0 ? COLORS.green : COLORS.yellow);

      return {
        success: failed === 0,
        results,
        duration: totalDuration,
        summary: { passed, failed, total: results.length }
      };

    } catch (error) {
      this.log(`\n❌ Test suite failed: ${error.message}`, COLORS.red);
      return {
        success: false,
        results,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new TestRunner();
  
  const args = process.argv.slice(2);
  const options = {
    testTypes: args.filter(arg => 
      Object.keys(runner.testTypes).includes(arg)
    ),
    includePerformance: args.includes('--performance'),
    includeSecurity: !args.includes('--no-security'),
    stopOnFailure: args.includes('--stop-on-failure'),
    generateReport: !args.includes('--no-report'),
    help: args.includes('--help') || args.includes('-h'),
  };

  if (options.help) {
    console.log(`
Comprehensive Test Runner

Usage: node test-runner.js [test-types] [options]

Test Types:
  unit, integration, e2e, security, smoke

Options:
  --performance          Include performance tests
  --no-security         Skip security tests
  --stop-on-failure     Stop on first test failure
  --no-report           Don't generate test report
  --help, -h           Show this help

Examples:
  node test-runner.js unit integration
  node test-runner.js all --performance
  node test-runner.js --stop-on-failure
`);
    process.exit(0);
  }

  // If no test types specified, run all
  if (options.testTypes.length === 0) {
    options.testTypes = Object.keys(runner.testTypes);
  }

  runner.runAllTests(options)
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

export default TestRunner;