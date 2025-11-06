import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { vscodeApi } from '../utils/vscode-api';

interface NewSourceFormProps {
  onCancel?: () => void;
  onSuccess?: (sourceId: string) => void;
}

export const NewSourceForm: React.FC<NewSourceFormProps> = ({ onCancel, onSuccess }) => {
  const [form, setForm] = useState({
    name: '',
    gitUrl: '',
    branch: 'main',
    subPath: '/',
    authType: 'none',
    token: '',
    sshKeyPath: '',
    sshPassphrase: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    { state: 'idle' | 'testing' | 'ok' | 'fail'; message?: string } | undefined
  >({ state: 'idle' });

  useEffect(() => {
    // 监听来自后端的状态消息
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'addSourceStatus') {
        const { status, message: msg, sourceId } = message.payload;

        switch (status) {
          case 'testing':
            setTesting(true);
            setConnectionStatus({ state: 'testing', message: msg });
            break;
          case 'cloning':
          case 'parsing':
          case 'generating':
            setProgress(msg);
            break;

          case 'success':
            setProgress(null);
            setSubmitting(false);
            setError(null);
            if (onSuccess && sourceId) {
              onSuccess(sourceId);
            }
            break;

          case 'error':
            setProgress(null);
            setSubmitting(false);
            setError(msg || 'Failed to add source');
            break;
        }
      } else if (message.type === 'testConnectionResult') {
        const { success, error: errMsg } = message.payload || {};
        setTesting(false);
        if (success) {
          setConnectionStatus({ state: 'ok', message: 'Connection OK' });
        } else {
          setConnectionStatus({ state: 'fail', message: errMsg || 'Connection failed' });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAuthTypeChange = (type: string) => {
    setForm((prev) => ({ ...prev, authType: type }));
    // 切换认证方式不再自动触发测试；按钮常驻在右侧由用户主动点击
  };

  const validateForTest = (authType?: string): string | null => {
    const url = form.gitUrl.trim();
    if (!url) return 'Git repository URL is required to test connection.';
    if (!/^https?:\/\/.+|^git@.+/.test(url)) return 'Invalid Git URL.';
    const type = authType || form.authType;
    if (type === 'token' && !form.token.trim()) return 'Please enter a Token to test.';
    if (type === 'ssh' && !form.sshKeyPath.trim()) return 'Please enter SSH key path to test.';
    return null;
  };

  const triggerTestConnection = (authType?: string) => {
    const err = validateForTest(authType);
    if (err) {
      setConnectionStatus({ state: 'fail', message: err });
      return;
    }
    setTesting(true);
    setConnectionStatus({ state: 'testing', message: 'Testing connection...' });
    vscodeApi.postMessage('testConnection', {
      gitUrl: form.gitUrl.trim(),
      authType: authType || form.authType,
      token: (authType || form.authType) === 'token' ? form.token.trim() : undefined,
      sshKeyPath: (authType || form.authType) === 'ssh' ? form.sshKeyPath.trim() : undefined,
      sshPassphrase: (authType || form.authType) === 'ssh' ? form.sshPassphrase.trim() : undefined,
    });
  };

  const validate = () => {
    if (!form.name.trim()) return 'Source name is required.';
    if (!form.gitUrl.trim()) return 'Git repository URL is required.';
    if (!/^https?:\/\/.+|^git@.+/.test(form.gitUrl.trim())) return 'Invalid Git URL.';
    if (form.authType === 'token' && !form.token.trim()) return 'Token is required.';
    if (form.authType === 'ssh' && !form.sshKeyPath.trim()) return 'SSH key path is required.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);
    setProgress('Submitting...');

    vscodeApi.postMessage('addSource', {
      name: form.name.trim(),
      gitUrl: form.gitUrl.trim(),
      branch: form.branch.trim(),
      subPath: form.subPath.trim(),
      authType: form.authType,
      token: form.authType === 'token' ? form.token.trim() : undefined,
      sshKeyPath: form.authType === 'ssh' ? form.sshKeyPath.trim() : undefined,
      sshPassphrase: form.authType === 'ssh' ? form.sshPassphrase.trim() : undefined,
    });
  };

  return (
    <form className="new-source-form" onSubmit={handleSubmit}>
      <Card>
        <h2>Add New Rule Source</h2>
        {error && <div className="error-box">{error}</div>}
        {progress && (
          <div
            className="progress-box"
            style={{
              padding: '12px',
              marginBottom: '16px',
              backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
              borderRadius: '4px',
              color: 'var(--vscode-foreground)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="spinner">⏳</div>
              <span>{progress}</span>
            </div>
          </div>
        )}
        <div className="form-group">
          <label className="form-label" htmlFor="name">
            Source Name
          </label>
          <Input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="e.g., My Team's Rules"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="gitUrl">
            Git Repository URL
          </label>
          <Input
            id="gitUrl"
            name="gitUrl"
            value={form.gitUrl}
            onChange={handleChange}
            required
            placeholder="https://github.com/user/repo.git"
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="branch">
              Branch
            </label>
            <Input id="branch" name="branch" value={form.branch} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="subPath">
              Sub Path
            </label>
            <Input id="subPath" name="subPath" value={form.subPath} onChange={handleChange} />
          </div>
        </div>
      </Card>
      <Card>
        <div className="form-group">
          <label className="form-label">Authentication</label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <div className="auth-options" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                type={form.authType === 'none' ? 'primary' : 'secondary'}
                onClick={() => handleAuthTypeChange('none')}
              >
                None (Public Repo)
              </Button>
              <Button
                type={form.authType === 'token' ? 'primary' : 'secondary'}
                onClick={() => handleAuthTypeChange('token')}
              >
                Personal Access Token
              </Button>
              <Button
                type={form.authType === 'ssh' ? 'primary' : 'secondary'}
                onClick={() => handleAuthTypeChange('ssh')}
              >
                SSH Key
              </Button>
            </div>
            <div>
              <Button
                type="secondary"
                onClick={() => triggerTestConnection()}
                disabled={testing || submitting}
              >
                Test Connection
              </Button>
            </div>
          </div>
          {/* 连接性状态展示 */}
          {connectionStatus && connectionStatus.state !== 'idle' && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {connectionStatus.state === 'testing' && <span>⏳</span>}
              {connectionStatus.state === 'ok' && <span>✅</span>}
              {connectionStatus.state === 'fail' && <span>❌</span>}
              <span
                style={{
                  color:
                    connectionStatus.state === 'fail'
                      ? 'var(--vscode-errorForeground)'
                      : 'var(--vscode-foreground)',
                }}
              >
                {connectionStatus.message}
              </span>
            </div>
          )}
        </div>
        {form.authType === 'token' && (
          <div className="form-group">
            <label className="form-label" htmlFor="token">
              Token
            </label>
            <Input
              id="token"
              name="token"
              type="password"
              value={form.token}
              onChange={(e) => {
                handleChange(e);
                // 凭证变化后，提示可重新测试
                setConnectionStatus({ state: 'idle' });
              }}
              placeholder="ghp_... or similar"
            />
          </div>
        )}
        {form.authType === 'ssh' && (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="sshKeyPath">
                SSH Private Key Path
              </label>
              <Input
                id="sshKeyPath"
                name="sshKeyPath"
                value={form.sshKeyPath}
                onChange={(e) => {
                  handleChange(e);
                  setConnectionStatus({ state: 'idle' });
                }}
                placeholder="~/.ssh/id_rsa"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="sshPassphrase">
                SSH Key Passphrase (Optional)
              </label>
              <Input
                id="sshPassphrase"
                name="sshPassphrase"
                type="password"
                value={form.sshPassphrase}
                onChange={(e) => {
                  handleChange(e);
                  setConnectionStatus({ state: 'idle' });
                }}
              />
            </div>
          </>
        )}
      </Card>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '16px',
          marginTop: '16px',
        }}
      >
        <Button type="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <button type="submit" className="button button-primary" disabled={submitting}>
          Add Source
        </button>
      </div>
    </form>
  );
};
