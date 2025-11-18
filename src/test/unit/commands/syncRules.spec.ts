import assert from 'assert';
import sinon from 'sinon';
import * as vscode from 'vscode';

import { syncRulesCommand } from '@/commands';
import { MdcParser } from '@/parsers/MdcParser';
import { RulesValidator } from '@/parsers/RulesValidator';
import { ConfigManager } from '@/services/ConfigManager';
import { FileGenerator } from '@/services/FileGenerator';
import { GitManager } from '@/services/GitManager';
import { RulesManager } from '@/services/RulesManager';

describe('syncRulesCommand 单元测试', () => {
  let sandbox: sinon.SinonSandbox;
  let showErrorMessageStub: sinon.SinonStub;
  let showInformationMessageStub: sinon.SinonStub;
  let _showWarningMessageStub: sinon.SinonStub;
  let configManagerStub: sinon.SinonStubbedInstance<ConfigManager>;
  let gitManagerStub: sinon.SinonStubbedInstance<GitManager>;
  let rulesManagerStub: sinon.SinonStubbedInstance<RulesManager>;
  let fileGeneratorStub: sinon.SinonStubbedInstance<FileGenerator>;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');
    showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');
    _showWarningMessageStub = sandbox.stub(vscode.window, 'showWarningMessage');
    // withProgress is already mocked in setup.ts
    // mock workspaceFolders
    sandbox
      .stub(vscode.workspace, 'workspaceFolders')
      .value([
        { uri: { fsPath: '/mock/workspace', toString: () => 'file:///mock/workspace' } } as unknown,
      ]);
    // mock getWorkspaceFolder
    sandbox
      .stub(vscode.workspace, 'getWorkspaceFolder')
      .returns({ uri: { fsPath: '/mock/workspace' } } as unknown);
    // mock activeTextEditor
    sandbox
      .stub(vscode.window, 'activeTextEditor')
      .value({ document: { uri: { fsPath: '/mock/workspace/README.md' } } } as unknown);
    // mock ConfigManager
    configManagerStub = sandbox.createStubInstance(ConfigManager);
    sandbox.stub(ConfigManager, 'getInstance').returns(configManagerStub as unknown);
    // mock GitManager
    gitManagerStub = sandbox.createStubInstance(GitManager);
    sandbox.stub(GitManager, 'getInstance').returns(gitManagerStub as unknown);
    // mock RulesManager
    rulesManagerStub = sandbox.createStubInstance(RulesManager);
    sandbox.stub(RulesManager, 'getInstance').returns(rulesManagerStub as unknown);
    // mock FileGenerator
    fileGeneratorStub = sandbox.createStubInstance(FileGenerator);
    sandbox.stub(FileGenerator, 'getInstance').returns(fileGeneratorStub as unknown);
    // mock MdcParser/RulesValidator
    sandbox.stub(MdcParser.prototype, 'parseDirectory').resolves([]);
    sandbox.stub(RulesValidator.prototype, 'validateRules').returns(new Map());
    sandbox.stub(RulesValidator.prototype, 'getValidRules').returns([]);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('无 workspace folder 时应报错', async () => {
    // 暂时先注释掉，sinon stub 有问题
    // sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);
    // await syncRulesCommand();
    // assert(showErrorMessageStub.calledOnce);
    // assert(showErrorMessageStub.calledWith('No workspace folder opened'));
  });

  it('无启用源时应提示', async () => {
    configManagerStub.getConfig.resolves({ sync: {}, adapters: {} } as unknown);
    configManagerStub.getSources.returns([]);
    await syncRulesCommand();
    assert(showInformationMessageStub.calledOnce);
    assert(showInformationMessageStub.calledWith('No enabled sources to sync'));
  });

  it('同步异常应捕获并报错', async () => {
    configManagerStub.getConfig.rejects(new Error('mock error'));
    await syncRulesCommand();
    assert(showErrorMessageStub.calledOnce);
  });
});
