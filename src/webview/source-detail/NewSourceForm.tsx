import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { vscodeApi } from '../utils/vscode-api';
import { t } from '../utils/i18n';

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
            setError(msg || t('form.error.failed'));
            break;
        }
      } else if (message.type === 'testConnectionResult') {
        const { success, error: errMsg } = message.payload || {};
        setTesting(false);
        if (success) {
          setConnectionStatus({ state: 'ok', message: t('form.connection.ok') });
        } else {
          setConnectionStatus({ state: 'fail', message: errMsg || t('form.connection.failed') });
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
    if (!url) return t('form.connection.urlRequired');
    if (!/^https?:\/\/.+|^git@.+/.test(url)) return t('form.error.invalidGitUrl');
    const type = authType || form.authType;
    if (type === 'token' && !form.token.trim()) return t('form.connection.tokenRequired');
    if (type === 'ssh' && !form.sshKeyPath.trim()) return t('form.connection.sshKeyRequired');
    return null;
  };

  const triggerTestConnection = (authType?: string) => {
    const err = validateForTest(authType);
    if (err) {
      setConnectionStatus({ state: 'fail', message: err });
      return;
    }
    setTesting(true);
    setConnectionStatus({ state: 'testing', message: t('form.connection.testing') });
    vscodeApi.postMessage('testConnection', {
      gitUrl: form.gitUrl.trim(),
      authType: authType || form.authType,
      token: (authType || form.authType) === 'token' ? form.token.trim() : undefined,
      sshKeyPath: (authType || form.authType) === 'ssh' ? form.sshKeyPath.trim() : undefined,
      sshPassphrase: (authType || form.authType) === 'ssh' ? form.sshPassphrase.trim() : undefined,
    });
  };

  const validate = () => {
    if (!form.name.trim()) return t('form.error.nameRequired');
    if (!form.gitUrl.trim()) return t('form.error.gitUrlRequired');
    if (!/^https?:\/\/.+|^git@.+/.test(form.gitUrl.trim())) return t('form.error.invalidGitUrl');
    if (form.authType === 'token' && !form.token.trim()) return t('form.error.tokenRequired');
    if (form.authType === 'ssh' && !form.sshKeyPath.trim()) return t('form.error.sshKeyRequired');
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
    setProgress(t('form.submitting'));

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
        <h2>{t('form.button.addSource')}</h2>
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
            {t('form.name')}
          </label>
          <Input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder={t('form.placeholder.name')}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="gitUrl">
            {t('form.gitUrl')}
          </label>
          <Input
            id="gitUrl"
            name="gitUrl"
            value={form.gitUrl}
            onChange={handleChange}
            required
            placeholder={t('form.placeholder.gitUrl')}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="branch">
              {t('form.branch')}
            </label>
            <Input id="branch" name="branch" value={form.branch} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="subPath">
              {t('form.subPath')}
            </label>
            <Input id="subPath" name="subPath" value={form.subPath} onChange={handleChange} />
          </div>
        </div>
      </Card>
      <Card>
        <div className="form-group">
          <label className="form-label">{t('Source Authentication')}</label>
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
                {t('form.auth.none')}
              </Button>
              <Button
                type={form.authType === 'token' ? 'primary' : 'secondary'}
                onClick={() => handleAuthTypeChange('token')}
              >
                {t('form.auth.token')}
              </Button>
              <Button
                type={form.authType === 'ssh' ? 'primary' : 'secondary'}
                onClick={() => handleAuthTypeChange('ssh')}
              >
                {t('form.auth.ssh')}
              </Button>
            </div>
            <div>
              <Button
                type="secondary"
                onClick={() => triggerTestConnection()}
                disabled={testing || submitting}
              >
                {t('form.auth.testConnection')}
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
              {t('Personal Access Token (HTTPS)')}
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
              placeholder={t('form.placeholder.token')}
            />
          </div>
        )}
        {form.authType === 'ssh' && (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="sshKeyPath">
                {t('form.label.sshKeyPath')}
              </label>
              <Input
                id="sshKeyPath"
                name="sshKeyPath"
                value={form.sshKeyPath}
                onChange={(e) => {
                  handleChange(e);
                  setConnectionStatus({ state: 'idle' });
                }}
                placeholder={t('form.placeholder.sshKeyPath')}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="sshPassphrase">
                {t('form.label.sshPassphrase')}
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
          {t('form.cancel')}
        </Button>
        <button type="submit" className="button button-primary" disabled={submitting}>
          {t('form.button.addSource')}
        </button>
      </div>
    </form>
  );
};
