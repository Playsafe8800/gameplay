/* eslint-disable */
const { danger, fail, warn, markdown } = require('danger');
import coverage from 'danger-plugin-coverage'; // https://www.npmjs.com/package/danger-plugin-coverage
const includes = require('lodash.includes');

const outputFile = require('output.json');
const testStageStatus = outputFile.testStageFailure;
const lintStageStatus = outputFile.lintStageFailure;
if (testStageStatus) {
  let failureMessage = '\n\n### The following tests have failed :\n';
  const resultFile = require('.jest/result.json');
  const testFilesCount = resultFile.testResults.length;
  for (let i = 1; i <= testFilesCount; i++) {
    if (resultFile.testResults[i - 1].status === 'failed') {
      const testFileName = resultFile.testResults[i - 1].name
        .split('/')
        .pop();
      failureMessage += `${i}. ${testFileName}\n`;
    }
  }
  fail(
    'Unit Test stage has failed. Please find the corresponding list of tests',
  );
  markdown(failureMessage);
} else {
  coverage({
    successMessage: ':+1: Test coverage is looking good.',
    failureMessage:
      'Test coverage is looking a little low for the files created ' +
      'or modified in this PR, perhaps we need to improve this.',
    cloverReportPath: '.jest/clover.xml',
    maxRows: 3,
    maxChars: 100,
    maxUncovered: 10,
    wrapFilenames: true,
    warnOnNoReport: true,
    showAllFiles: false,
  });

  const fs = require('fs');
  fs.readFile(
    '.jest/coverage-summary.json',
    'utf8',
    (err, coverageDataString) => {
      if (err) {
        console.log('Error reading coverage file:', err);
        return;
      }

      try {
        const coverageData = JSON.parse(coverageDataString);
        const linesCoverage = coverageData.total.lines.pct;
        const functionsCoverage = coverageData.total.functions.pct;
        const branchesCoverage = coverageData.total.branches.pct;
        const statementsCoverage = coverageData.total.statements.pct;
        const coverageHeader =
          '\n\n### Unit Test Coverage report (entire project)';
        let commentDataString =
          '|   | **Coverage (in %)**|\n| --- | --- |\n';
        commentDataString += `|**Lines covered**|${linesCoverage}|\n`;
        commentDataString += `|**Statements covered**|${statementsCoverage}|\n`;
        commentDataString += `|**Functions covered**|${functionsCoverage}|\n`;
        commentDataString += `|**Branches covered**|${branchesCoverage}|\n`;
        const report = [coverageHeader, commentDataString].join(
          '\n\n',
        );
        markdown(report);
      } catch (err) {
        console.log('Error parsing coverage string:', err);
      }
    },
  );
}

const packageChanged = includes(
  danger.git.modified_files,
  'package.json',
);
if (packageChanged) {
  const title = ':lock: package.json';
  const idea =
    'Changes were made to package.json. ' +
    'Please get your change verified by core review team';
  warn(`${title} - ${idea}`);
}

if (!testStageStatus && !lintStageStatus) {
  try {
    const sizeHeader = '\n\n### Binary size comparison \n';
    let binarySizeData = '';
    let message = '';
    const fs = require('fs');
    for (const binaryPlatform in outputFile.binaryPlatformMap) {
      const baseBinaryPath =
        outputFile['binaryPlatformMap'][binaryPlatform][
          'baseBinaryPath'
        ];
      const currentBinaryPath =
        outputFile['binaryPlatformMap'][binaryPlatform][
          'currentBinaryPath'
        ];
      if (baseBinaryPath != '' && currentBinaryPath != '') {
        const baseBinaryStats = fs.statSync(baseBinaryPath);
        const currentBinaryStats = fs.statSync(currentBinaryPath);
        const baseBinarySizeFormatted = formatFileSize(
          baseBinaryStats.size,
        );
        const currentBinarySizeFormatted = formatFileSize(
          currentBinaryStats.size,
        );
        const sizeDiff =
          currentBinaryStats.size - baseBinaryStats.size;
        const sizeDiffFormatted = formatFileSize(sizeDiff);
        let sizeDiffFormattedPRDisplay = '';
        if (sizeDiff <= 0)
          sizeDiffFormattedPRDisplay = `${sizeDiffFormatted} :white_check_mark:`;
        else
          sizeDiffFormattedPRDisplay = `${sizeDiffFormatted} :warning:`;
        binarySizeData += `**${binaryPlatform.toUpperCase()}**|${baseBinarySizeFormatted}|${currentBinarySizeFormatted}|${sizeDiffFormattedPRDisplay}|\n`;
        if (sizeDiff >= 50000) {
          // size difference is more than 50 KB or less than 0. Post on slack
          message +=
            ':warning: React binary size for ' +
            binaryPlatform +
            ' platform has increased by _*' +
            sizeDiffFormatted +
            '*_\n';
        }
        if (sizeDiff <= -50000) {
          message +=
            ':white_check_mark: React binary size for ' +
            binaryPlatform +
            ' platform has decreased by _*' +
            sizeDiffFormatted +
            '*_\n';
        }
      } else {
        if (currentBinaryPath != '') {
          warn(
            'Current binary for ' +
              binaryPlatform +
              ' platform is not present. Skipping binary size comparison',
          );
        } else if (baseBinaryPath != '') {
          warn(
            'Base binary for ' +
              binaryPlatform +
              ' platform could not be downloaded from S3 :disappointed: Please compare the binary size manually',
          );
        }
      }
    }
    if (message) {
      message =
        message + 'Check <' + outputFile.prUrl + '|Pull Request>';
      const outputFileWriter = fs.readFileSync('output.json');
      const outputJson = JSON.parse(outputFileWriter);
      outputJson.sizeDifference = true;
      outputJson.message = message;
      const sizeDiffData = JSON.stringify(outputJson);
      fs.writeFile('output.json', sizeDiffData, (err) => {
        if (err) throw err;
        console.log('Size data added');
      });
    }
    if (binarySizeData != '') {
      binarySizeData =
        '| **Platform** |**Base binary size ([?](https://mplgaming.atlassian.net/wiki/spaces/DEVX/pages/2303721534/Apk+and+binary+comparison))** | **Current binary size**| **Size difference** |\n| --- | --- | --- | --- |\n' +
        binarySizeData;
      const binarySizeComparisonReport = [
        sizeHeader,
        binarySizeData,
      ].join('\n\n');
      markdown(binarySizeComparisonReport);
    }
  } catch (err) {
    console.log(err);
    warn(
      'Unable to compare binary sizes. Please check the binary size manually',
    );
  }
} else {
  warn(
    'Binary size comparison is being skipped due to existing failures. Please fix them first',
  );
}

try {
  const bitbucketPayload = JSON.parse(process.env.BITBUCKET_PAYLOAD);
  const projectName = bitbucketPayload.repository.name;
  const projectBitbucketURL =
    bitbucketPayload.repository.links.html.href;
  const jenkinsWorkspace = process.env.WORKSPACE;
  const pathToReplace = `${jenkinsWorkspace}/${projectName}/`;
  const prLatestSourceCommit =
    process.env
      .BITBUCKET_PULL_REQUEST_LATEST_COMMIT_FROM_SOURCE_BRANCH;

  let lintResultsTable = '';
  const lintHeading = '\n### ESLint Analysis Report\n';
  const lintTableHeaders =
    '\n|**ESLint Scanned Files With Issues**|**Message**|**Lint Issue Severity**|\n| --- | :---: | :---: |\n';

  const lintResults = require('eslint-result.json');
  for (let i = 0; i < lintResults.length; i++) {
    let lineNumbersAffected = '';
    for (let j = 0; j < lintResults[i].messages.length; j++) {
      const fileName = lintResults[i].filePath.replace(
        pathToReplace,
        '',
      );
      const fileBitbucketURL = `${projectBitbucketURL}/src/${prLatestSourceCommit}/${fileName}#lines-${lintResults[i].messages[j].line}`;
      lineNumbersAffected = `:${lintResults[i].messages[j].line}:${lintResults[i].messages[j].column}`;
      lintResultsTable += `|[${fileName}${lineNumbersAffected}](${fileBitbucketURL})|\`${lintResults[
        i
      ].messages[j].message.replace(/`/g, '')}\`|${fetchSeverityText(
        lintResults[i].messages[j].severity,
      )}|\n`;
    }
  }

  if (lintResultsTable) {
    const lintReportFinal =
      lintHeading + lintTableHeaders + lintResultsTable;
    markdown(lintReportFinal);
  } else
    markdown(
      '\n\n### ESLint analysis complete. No issues found :white_check_mark: ',
    );
} catch (err) {
  console.log(err);
  warn(':x: Unable to complete ESLint analysis :x:');
}

function fetchSeverityText(severity) {
  switch (severity) {
    case 1:
      return ':warning: **Warning**';
    case 2:
      return ':x: **Error**';
    default:
      return ':neutral_face: **Invalid ESLint Severity**';
  }
}

function formatFileSize(bytes) {
  let deltaSymbol = '';
  let bytesUpdated = bytes;
  if (bytesUpdated === 0) return '0 Bytes';
  else if (bytesUpdated <= 0) {
    deltaSymbol = '-';
    bytesUpdated = bytesUpdated * -1;
  }
  const k = 1000,
    dm = 2,
    sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
    i = Math.floor(Math.log(bytesUpdated) / Math.log(k));
  return `${deltaSymbol}${parseFloat(
    (bytesUpdated / Math.pow(k, i)).toFixed(dm),
  )} ${sizes[i]}`;
}
