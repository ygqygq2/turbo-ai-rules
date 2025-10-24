import * as assert from 'assert';
import { after } from 'mocha';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../extension';

describe('Extension Test Suite1', () => {
  after(() => {
    vscode.window.showInformationMessage('All tests done!');
  });

  it('Sample test1', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });
});

describe('Extension Test Suite2', () => {
  after(() => {
    vscode.window.showInformationMessage('All tests done!');
  });

  it('Sample test2', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });
});
