"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var JSONSummaryReporter = /** @class */ (function () {
    function JSONSummaryReporter() {
        this.durationInMS = -1;
        this.passed = [];
        this.skipped = [];
        this.failed = [];
        this.warned = [];
        this.interrupted = [];
        this.timedOut = [];
        this.flakey = [];
        this.retries = {};
        this.status = 'unknown';
        this.startedAt = 0;
    }
    JSONSummaryReporter.prototype.onBegin = function () {
        this.startedAt = Date.now();
    };
    JSONSummaryReporter.prototype.onTestEnd = function (test, result) {
        var title = [];
        var fileName = [];
        var clean = true;
        for (var _i = 0, _a = test.titlePath(); _i < _a.length; _i++) {
            var s = _a[_i];
            if (s === '' && clean)
                continue;
            clean = false;
            title.push(s);
            if (s.includes('.ts') || s.includes('.js')) {
                fileName.push(s);
            }
        }
        // This will publish the file name + line number test begins on
        var location = "".concat(fileName[0], ":").concat(test.location.line, ":").concat(test.location.column);
        // Using the t variable in the push will push a full test name + test description
        var name = title.join(' > ');
        // Create the test entry object
        var testEntry = {
            location: location,
            name: name
        };
        // Set the status
        var status = !['passed', 'skipped'].includes(result.status) && name.includes('@warn')
            ? 'warned'
            : result.status;
        // Store retry count for this test
        if (result.retry > 0) {
            this.retries[location] = result.retry;
        }
        // Logic to push the results into the correct array
        if (result.status === 'passed' && result.retry >= 1) {
            this.flakey.push(testEntry);
        }
        else {
            this[status].push(testEntry);
        }
        this[status].push(testEntry);
    };
    JSONSummaryReporter.prototype.onEnd = function (result) {
        var _this = this;
        this.durationInMS = Date.now() - this.startedAt;
        this.status = result.status;
        // removing duplicate tests from passed array
        this.passed = this.passed.filter(function (element, index) {
            return _this.passed.findIndex(function (e) { return e.location === element.location; }) === index;
        });
        // removing duplicate tests from the failed array
        this.failed = this.failed.filter(function (element, index) {
            if (!_this.passed.some(function (e) { return e.location === element.location; }))
                return _this.failed.findIndex(function (e) { return e.location === element.location; }) === index;
        });
        // removing duplicate tests from the skipped array
        this.skipped = this.skipped.filter(function (element, index) {
            return _this.skipped.findIndex(function (e) { return e.location === element.location; }) === index;
        });
        // removing duplicate tests from the timedOut array
        this.timedOut = this.timedOut.filter(function (element, index) {
            return _this.timedOut.findIndex(function (e) { return e.location === element.location; }) === index;
        });
        // removing duplicate tests from the interrupted array
        this.interrupted = this.interrupted.filter(function (element, index) {
            return _this.interrupted.findIndex(function (e) { return e.location === element.location; }) === index;
        });
        var fileName = 'summary.json';
        var filePath = './';
        if (typeof process.env.PLAYWRIGHT_JSON_OUTPUT_DIR !== 'undefined') {
            filePath = process.env.PLAYWRIGHT_JSON_OUTPUT_DIR;
        }
        if (typeof process.env.PLAYWRIGHT_JSON_OUTPUT_NAME !== 'undefined') {
            fileName = process.env.PLAYWRIGHT_JSON_OUTPUT_NAME;
        }
        var outputFile = path.join(filePath, fileName);
        fs.writeFileSync(outputFile, JSON.stringify(this, null, '  '));
    };
    return JSONSummaryReporter;
}());
exports.default = JSONSummaryReporter;
