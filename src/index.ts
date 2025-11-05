import * as fs from 'fs';
import * as path from 'path';

import {
  TestCase,
  TestResult,
  Reporter,
  FullResult,
} from '@playwright/test/reporter';

export interface TestEntry {
  location: string;
  name: string;
}

export interface Summary {
  durationInMS: number;
  passed: TestEntry[];
  skipped: TestEntry[];
  failed: TestEntry[];
  warned: TestEntry[];
  interrupted: TestEntry[];
  timedOut: TestEntry[];
  flakey: TestEntry[];
  retries: Record<string, number>;

  status: FullResult['status'] | 'unknown' | 'warned' | 'skipped';
}

class JSONSummaryReporter implements Reporter, Summary {
  durationInMS = -1;
  passed: TestEntry[] = [];
  skipped: TestEntry[] = [];
  failed: TestEntry[] = [];
  warned: TestEntry[] = [];
  interrupted: TestEntry[] = [];
  timedOut: TestEntry[] = [];
  flakey: TestEntry[] = [];
  retries: Record<string, number> = {};

  status: Summary['status'] = 'unknown';
  startedAt = 0;

  onBegin() {
    this.startedAt = Date.now();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const title = [];
    const fileName = [];
    let clean = true;
    for (const s of test.titlePath()) {
      if (s === '' && clean) continue;
      clean = false;
      title.push(s);
      if (s.includes('.ts') || s.includes('.js')) {
        fileName.push(s);
      }
    }

    // This will publish the file name + line number test begins on
    const location = `${fileName[0]}:${test.location.line}:${test.location.column}`;

    // Using the t variable in the push will push a full test name + test description
    const name = title.join(' > ');

    // Create the test entry object
    const testEntry: TestEntry = {
      location: location,
      name: name
    };

    // Set the status
    const status =
      !['passed', 'skipped'].includes(result.status) && name.includes('@warn')
        ? 'warned'
        : result.status;

    // Store retry count for this test
    if (result.retry > 0) {
      this.retries[location] = result.retry;
    }

    // Logic to push the results into the correct array
    if (result.status === 'passed' && result.retry >= 1) {
      this.flakey.push(testEntry);
    } else {
      this[status].push(testEntry);
    }
    this[status].push(testEntry);
  }

  onEnd(result: FullResult) {
    this.durationInMS = Date.now() - this.startedAt;
    this.status = result.status;

    // removing duplicate tests from passed array
    this.passed = this.passed.filter((element, index) => {
      return this.passed.findIndex(e => e.location === element.location) === index;
    });

    // removing duplicate tests from the failed array
    this.failed = this.failed.filter((element, index) => {
      if (!this.passed.some(e => e.location === element.location))
        return this.failed.findIndex(e => e.location === element.location) === index;
    });

    // removing duplicate tests from the skipped array
    this.skipped = this.skipped.filter((element, index) => {
      return this.skipped.findIndex(e => e.location === element.location) === index;
    });

    // removing duplicate tests from the timedOut array
    this.timedOut = this.timedOut.filter((element, index) => {
      return this.timedOut.findIndex(e => e.location === element.location) === index;
    });

    // removing duplicate tests from the interrupted array
    this.interrupted = this.interrupted.filter((element, index) => {
      return this.interrupted.findIndex(e => e.location === element.location) === index;
    });

    let fileName = 'summary.json';
    let filePath = './'
    
    if (typeof process.env.PLAYWRIGHT_JSON_OUTPUT_DIR !== 'undefined') {
      filePath = process.env.PLAYWRIGHT_JSON_OUTPUT_DIR;
    }

    if (typeof process.env.PLAYWRIGHT_JSON_OUTPUT_NAME !== 'undefined') {
      fileName = process.env.PLAYWRIGHT_JSON_OUTPUT_NAME;
    }

    let outputFile = path.join(filePath, fileName);

    fs.writeFileSync(outputFile, JSON.stringify(this, null, '  '));
  }
}

export default JSONSummaryReporter;
