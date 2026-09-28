#!/usr/bin/env node
import { scan } from './scan';

function printUsage(): void {
  console.log(`
ngx-safe-subscribe — RxJS subscription leak scanner

Usage:
  ngx-safe-subscribe scan <path> [--json]

Examples:
  ngx-safe-subscribe scan ./src
  ngx-safe-subscribe scan "src/**/*.ts" --json

Exit codes:
  0  no risky subscriptions found
  1  risky subscriptions found (useful in CI to fail the build)
`);
}

function main(): void {
  const [, , command, targetArg, ...rest] = process.argv;

  if (command === '--help' || command === '-h' || !command) {
    printUsage();
    process.exit(0);
  }

  if (command !== 'scan') {
    console.error(`Unknown command: "${command}"`);
    printUsage();
    process.exit(1);
  }

  const target = targetArg || './src';
  const asJson = rest.includes('--json');

  const result = scan(target);

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.findings.length > 0 ? 1 : 0);
  }

  console.log(`\n🔍  Scanned ${result.filesScanned} file(s) in "${target}"\n`);

  if (result.findings.length === 0) {
    console.log('✅  No unmanaged subscriptions found!\n');
  } else {
    console.log(`⚠️   ${result.findings.length} potentially unmanaged subscription(s):\n`);
    for (const f of result.findings) {
      console.log(`  ${f.file}:${f.line}:${f.column}`);
      console.log(`     ${f.snippet}\n`);
    }
  }

  const safe = result.totalSubscribes - result.findings.length;
  console.log(
    `Summary: ${result.findings.length} risky / ${safe} safe / ${result.totalSubscribes} total subscriptions.\n`
  );

  process.exit(result.findings.length > 0 ? 1 : 0);
}

main();
