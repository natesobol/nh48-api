#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

function getArgValue(flag, fallback = '') {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function toPositiveInt(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
}

function appendLog(logFile, line) {
  if (!logFile) return;
  fs.appendFileSync(logFile, `${line}\n`, 'utf8');
}

function runCommand(command, args, logFile) {
  const printable = `${command} ${args.join(' ')}`;
  console.log(`\n==> ${printable}`);
  appendLog(logFile, `==> ${printable}`);

  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8'
  });

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  if (stdout) {
    process.stdout.write(stdout);
    appendLog(logFile, stdout.trimEnd());
  }
  if (stderr) {
    process.stderr.write(stderr);
    appendLog(logFile, stderr.trimEnd());
  }

  const status = typeof result.status === 'number' ? result.status : 1;
  if (status !== 0) {
    console.error(`Command failed (${status}): ${printable}`);
    appendLog(logFile, `Command failed (${status}): ${printable}`);
  }
  return status;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const baseUrl = getArgValue('--url', 'https://nh48.info');
  const retries = toPositiveInt(getArgValue('--retries', '1'), 1);
  const delaySeconds = toPositiveInt(getArgValue('--delay-seconds', '20'), 20);
  const logFile = getArgValue('--log-file', '');

  if (logFile) {
    fs.writeFileSync(logFile, '', 'utf8');
  }

  const auditCommands = [
    ['node', ['scripts/audit-homepage-worker-seo.js', '--url', baseUrl]],
    ['node', ['scripts/audit-worker-breadcrumbs.js', '--url', baseUrl]],
    ['node', ['scripts/audit-peak-page-ui.js', '--url', baseUrl]],
    ['node', ['scripts/audit-peak-schema-parity.js', '--url', baseUrl]],
    ['node', ['scripts/audit-peak-image-metadata.js', '--url', baseUrl]]
  ];

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    console.log(`\n### Live SEO parity attempt ${attempt}/${retries} (${baseUrl})`);
    appendLog(logFile, `### Live SEO parity attempt ${attempt}/${retries} (${baseUrl})`);

    let failed = false;
    const statuses = [];
    for (const [command, args] of auditCommands) {
      const status = runCommand(command, args, logFile);
      statuses.push({ command: `${command} ${args.join(' ')}`, status });
      if (status !== 0) {
        failed = true;
      }
    }

    if (!failed) {
      console.log('\nLive peak SEO parity audits passed.');
      appendLog(logFile, 'Live peak SEO parity audits passed.');
      process.exit(0);
    }

    console.error('\nLive peak SEO parity audits failed for this attempt.');
    appendLog(logFile, 'Live peak SEO parity audits failed for this attempt.');
    statuses
      .filter((entry) => entry.status !== 0)
      .forEach((entry) => {
        const line = `- ${entry.command} => exit ${entry.status}`;
        console.error(line);
        appendLog(logFile, line);
      });

    if (attempt < retries) {
      const message = `Retrying in ${delaySeconds}s...`;
      console.log(message);
      appendLog(logFile, message);
      await sleep(delaySeconds * 1000);
    }
  }

  console.error('\nLive peak SEO parity audits failed after all attempts.');
  appendLog(logFile, 'Live peak SEO parity audits failed after all attempts.');
  process.exit(1);
}

main().catch((error) => {
  console.error(`Live peak SEO parity audit crashed: ${error.message}`);
  process.exit(1);
});

