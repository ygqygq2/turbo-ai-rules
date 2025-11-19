import React, { useState, useEffect } from 'react';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { t } from '../utils/i18n';
import { vscodeApi } from '../utils/vscode-api';
import '../global.css';
import './welcome.css';

interface Template {
  id: string;
  name: string;
  icon: string;
  gitUrl: string;
  description: string;
}

const templates: Template[] = [
  {
    id: 'ygqygq2-ai-rules',
    icon: '🚀',
    name: "ygqygq2's AI Rules",
    gitUrl: 'https://github.com/ygqygq2/ai-rules.git',
    description: 'Common rules templates for various programming languages',
  },
];

export const App: React.FC = () => {
  const [hasSource, setHasSource] = useState<boolean>(false);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  useEffect(() => {
    // 监听来自扩展的消息
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'initialState':
          // 接收初始状态（当命令打开 Welcome 页时，显示当前的设置）
          if (message.payload?.dontShowAgain !== undefined) {
            setDontShowAgain(message.payload.dontShowAgain);
          }
          break;
        case 'rulesSelectionState':
          // 接收规则源状态（是否有源）
          if (message.payload?.enabled !== undefined) {
            setHasSource(message.payload.enabled);
          }
          break;
        case 'syncStage':
          // TODO: 可以显示同步进度
          break;
      }
    };

    window.addEventListener('message', messageHandler);

    // VSCode 最佳实践: 前端加载完成后通知后端，请求初始状态
    vscodeApi.postMessage('ready');

    return () => window.removeEventListener('message', messageHandler);
  }, []);

  const handleAddSource = () => {
    vscodeApi.postMessage('addSource');
  };

  const handleSelectRules = () => {
    vscodeApi.postMessage('selectRules');
  };

  const handleSyncAndGenerate = () => {
    vscodeApi.postMessage('syncAndGenerate');
  };

  const handleViewDocs = () => {
    vscodeApi.postMessage('viewDocs');
  };

  const handleGetHelp = () => {
    vscodeApi.postMessage('getHelp');
  };

  const handleDismissChange = (checked: boolean) => {
    setDontShowAgain(checked);
    // 只发送状态更新消息，不关闭页面
    vscodeApi.postMessage('updateDontShowAgain', { checked });
  };

  const handleTemplateClick = (template: Template) => {
    vscodeApi.postMessage('useTemplate', { template: template.id });
  };

  return (
    <div className="welcome-container">
      <header className="header">
        <h1>{t('welcome.title')}</h1>
        <p className="subtitle">{t('welcome.subtitle')}</p>
      </header>

      <main className="main-content">
        {/* Step 1: Add Source */}
        <Card className="step-card">
          <div className="step-header">
            <div className="step-number">1</div>
            <h2>{t('welcome.step1.title')}</h2>
            <div className="step-actions">
              <Button type="primary" icon="add" onClick={handleAddSource}>
                {t('welcome.step1.button')}
              </Button>
            </div>
          </div>
          <div className="step-description">{t('welcome.step1.description')}</div>
        </Card>

        {/* Step 2: Select Rules */}
        <Card className="step-card">
          <div className="step-header">
            <div className="step-number">2</div>
            <h2>{t('welcome.step2.title')}</h2>
            <div className="step-actions">
              <Button
                type="primary"
                icon="list-selection"
                onClick={handleSelectRules}
                disabled={!hasSource}
              >
                {t('welcome.step2.button')}
              </Button>
            </div>
          </div>
          <div className="step-description">
            {t('welcome.step2.description')}
            {!hasSource && <div className="step-hint">{t('welcome.step2.hint')}</div>}
          </div>
        </Card>

        {/* Step 3: Sync & Generate */}
        <Card className="step-card">
          <div className="step-header">
            <div className="step-number">3</div>
            <h2>{t('welcome.step3.title')}</h2>
            <div className="step-actions">
              <Button type="primary" icon="sync" onClick={handleSyncAndGenerate}>
                {t('welcome.step3.button')}
              </Button>
            </div>
          </div>
          <div className="step-description">{t('welcome.step3.description')}</div>
        </Card>

        {/* Templates Section */}
        <Card className="templates-card">
          <div className="step-info">
            <h2>{t('welcome.templates.title')}</h2>
            <p>{t('welcome.templates.description')}</p>
          </div>
          <div className="template-grid">
            {templates.map((template) => (
              <div
                key={template.id}
                className="template-button"
                onClick={() => handleTemplateClick(template)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleTemplateClick(template);
                  }
                }}
              >
                <div className="template-icon">{template.icon}</div>
                <div className="template-name">{template.name}</div>
              </div>
            ))}
          </div>
        </Card>
      </main>

      <footer className="footer">
        <div className="footer-links">
          <button className="link-button" onClick={handleViewDocs}>
            <i className="codicon codicon-book"></i>
            <span>{t('welcome.footer.documentation')}</span>
          </button>
          <button className="link-button" onClick={handleGetHelp}>
            <i className="codicon codicon-comment-discussion"></i>
            <span>{t('welcome.footer.getHelp')}</span>
          </button>
        </div>
        <div className="checkbox-container">
          <input
            type="checkbox"
            id="dont-show-again"
            checked={dontShowAgain}
            onChange={(e) => handleDismissChange(e.target.checked)}
          />
          <label htmlFor="dont-show-again">{t('welcome.footer.dontShowAgain')}</label>
        </div>
      </footer>
    </div>
  );
};
