import React, { useState } from 'react';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Toolbar } from '../components/Toolbar';
import { vscodeApi } from '../utils/vscode-api';
import '../global.css';
import './welcome.css';

// VS Code API 类型定义
interface VscodeMessage {
  command: string;
  [key: string]: unknown;
}

declare const vscode: {
  postMessage: (message: VscodeMessage) => void;
};

interface Template {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const templates: Template[] = [
  {
    id: 'typescript',
    icon: 'TS',
    name: 'TypeScript Best Practices',
    description: 'Coding standards and style guide for TypeScript projects',
  },
  {
    id: 'react',
    icon: '⚛️',
    name: 'React Development Rules',
    description: 'Component patterns and React hooks best practices',
  },
  {
    id: 'python',
    icon: '🐍',
    name: 'Python Style Guide',
    description: 'PEP 8 compliant coding standards for Python',
  },
];

export const App: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleAddSource = () => {
    vscodeApi.postMessage('addSource');
  };

  const handleSyncRules = () => {
    vscode.postMessage({ command: 'syncRules' });
  };

  const handleGenerateConfigs = () => {
    vscode.postMessage({ command: 'generateConfigs' });
  };

  const handleViewDocs = () => {
    vscode.postMessage({ command: 'openDocs' });
  };

  const handleGetHelp = () => {
    vscode.postMessage({ command: 'getHelp' });
  };

  const handleDismiss = () => {
    vscode.postMessage({ command: 'dismissWelcome' });
  };

  const handleTemplateClick = (templateId: string) => {
    setSelectedTemplate(templateId);
    vscode.postMessage({ command: 'useTemplate', template: templateId });
  };

  return (
    <div className="container">
      <div className="hero">
        <h1>🚀 Welcome to Turbo AI Rules</h1>
        <p className="subtitle">
          Sync AI coding rules from Git repositories and automatically generate configuration files
        </p>
      </div>

      <div className="steps">
        <Card className="step-card">
          <div className="step-number">1</div>
          <div className="step-content">
            <h2>Add a Rule Source</h2>
            <p>Configure your first Git repository to sync rules from</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button type="primary" icon="add" onClick={handleAddSource}>
                Add Source
              </Button>
              <Button
                type="secondary"
                icon="list-tree"
                onClick={() => vscode.postMessage({ command: 'selectRules' })}
              >
                Select Rules
              </Button>
            </div>
          </div>
        </Card>
        <Card className="step-card">
          <div className="step-number">2</div>
          <div className="step-content">
            <h2>Sync Rules</h2>
            <p>Fetch and update AI rules from your configured sources</p>
            <Button type="primary" icon="sync" onClick={handleSyncRules}>
              Sync Now
            </Button>
          </div>
        </Card>
        <Card className="step-card">
          <div className="step-number">3</div>
          <div className="step-content">
            <h2>Generate Configs</h2>
            <p>Create configuration files for your AI coding tools</p>
            <Button type="secondary" icon="file-code" onClick={handleGenerateConfigs}>
              Generate Configs
            </Button>
          </div>
        </Card>
      </div>

      <div className="templates">
        <h2>📚 Quick Start Templates</h2>
        <p className="section-desc">Popular rule repositories to get you started</p>
        <div className="template-grid">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
            >
              <div onClick={() => handleTemplateClick(template.id)} style={{ cursor: 'pointer' }}>
                <div className="template-icon">{template.icon}</div>
                <h3>{template.name}</h3>
                <p>{template.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Toolbar className="footer">
        <Button type="secondary" icon="book" onClick={handleViewDocs}>
          Documentation
        </Button>
        <Button type="secondary" icon="question" onClick={handleGetHelp}>
          Get Help
        </Button>
        <Button type="secondary" icon="check" onClick={handleDismiss}>
          Don't Show Again
        </Button>
      </Toolbar>
    </div>
  );
};
