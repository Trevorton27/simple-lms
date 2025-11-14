#!/usr/bin/env node

import { spawn } from 'child_process';

// ANSI color codes
const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// Clear console
console.clear();

// Print banner
console.log(`${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}║         LMS Platform - Development Server                 ║${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

// Print clickable links
console.log(`${colors.bold}${colors.green}🚀 Applications:${colors.reset}\n`);

console.log(`${colors.bold}  Main LMS App:${colors.reset}`);
console.log(`  ${colors.blue}➜${colors.reset}  Local:   ${colors.cyan}\x1b]8;;http://localhost:3000\x1b\\http://localhost:3000\x1b]8;;\x1b\\${colors.reset}`);
console.log(`  ${colors.blue}➜${colors.reset}  Admin:   ${colors.cyan}\x1b]8;;http://localhost:3000/admin\x1b\\http://localhost:3000/admin\x1b]8;;\x1b\\${colors.reset}`);
console.log(`  ${colors.blue}➜${colors.reset}  Tester:  ${colors.cyan}\x1b]8;;http://localhost:3000/admin/api-tester\x1b\\http://localhost:3000/admin/api-tester\x1b]8;;\x1b\\${colors.reset}\n`);

console.log(`${colors.bold}  AICT Service:${colors.reset}`);
console.log(`  ${colors.blue}➜${colors.reset}  Service: ${colors.magenta}\x1b]8;;http://localhost:3001\x1b\\http://localhost:3001\x1b]8;;\x1b\\${colors.reset}\n`);

console.log(`${colors.yellow}────────────────────────────────────────────────────────────${colors.reset}\n`);

// Start Next.js dev server
const nextDev = spawn('next', ['dev'], {
  stdio: 'inherit',
  shell: true,
});

// Handle process termination
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Shutting down dev server...${colors.reset}`);
  nextDev.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  nextDev.kill('SIGTERM');
  process.exit(0);
});

nextDev.on('exit', (code) => {
  process.exit(code);
});
