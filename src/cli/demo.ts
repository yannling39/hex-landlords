import { runDeterministicRun } from './run.js';

const result = runDeterministicRun(2026);
process.stdout.write(`${result.output}\n`);
