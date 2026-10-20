#!/usr/bin/env node
import { run } from './index.js';

void run(process.argv).then((code) => {
  process.exitCode = code;
});
