import React, { useState } from 'react';
import { t } from '../utils/i18n';
import { SourceDetails } from './SourceManager';

/**
 * Source Form 组件属性
 */
export interface SourceFormProps {
  initialData?: SourceDetails;
  onSave: (sourceData: Record<string, unknown>) => void;
  onCancel: () => void;
}

/**
 * Source Form 组件
 */
export const SourceForm: React.FC<SourceFormProps> = ({ initialData, onSave, onCancel }) => {
  const isEditMode = !!initialData;

  // 初始化表单数据
  const [form, setForm] = useState({
    name: initialData?.name || '',
    gitUrl: initialData?.gitUrl || '',
    branch: initialData?.branch || 'main',
    subPath: initialData?.subPath || '/',
    authType: initialData?.authType || 'none',
    token: '',
    sshKeyPath: '',
    sshPassphrase: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    { state: 'idle' | 'testing' | 'ok' | 'fail'; message?: string } | undefined
  >({ state: 'idle' });

  // 处理表单字段变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // 重置连接状态
    setConnectionStatus({ state: 'idle' });
  };

  // 处理认证类型变化
  const handleAuthTypeChange = (type: string) => {
    setForm((prev) => ({ ...prev, authType: type }));
    setConnectionStatus({ state: 'idle' });
  };

  // 验证表单
  const validate = (): string | null => {
    if (!form.name.trim()) return t('form.error.nameRequired');
    if (!form.gitUrl.trim()) return t('form.error.gitUrlRequired');
    if (!/^https?:\/\/.+|^git@.+/.test(form.gitUrl.trim())) return t('form.error.invalidGitUrl');
    if (form.authType === 'token' && !form.token.trim()) return t('form.error.tokenRequired');
    if (form.authType === 'ssh' && !form.sshKeyPath.trim()) return t('form.error.sshKeyRequired');
    return null;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setSubmitting(true);
    setError(null);
    setProgress(isEditMode ? t('form.updating') : t('form.submitting'));

    try {
      // 准备提交数据
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        gitUrl: form.gitUrl.trim(),
        branch: form.branch.trim(),
        subPath: form.subPath.trim(),
        authType: form.authType,
        enabled: initialData?.enabled ?? true,
      };

      // 根据认证类型添加相应的认证信息
      if (form.authType === 'token') {
        payload.authToken = form.token.trim();
      } else if (form.authType === 'ssh') {
        payload.sshKeyPath = form.sshKeyPath.trim();
        if (form.sshPassphrase) {
          payload.sshPassphrase = form.sshPassphrase.trim();
        }
      }

      // 调用父组件的保存方法
      onSave(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('form.error.failed'));
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  return (
    <div className="source-detail-card">
      <h2>{isEditMode ? t('form.button.editSource') : t('form.button.addSource')}</h2>

      <form onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-lg)' }}>
        {error && <div className="error-message">{error}</div>}

        {progress && (
          <div
            className="loading"
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              marginBottom: 'var(--spacing-md)',
              backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
              borderRadius: 'var(--border-radius)',
            }}
          >
            <i className="codicon codicon-sync codicon-modifier-spin"></i>
            <span>{progress}</span>
          </div>
        )}

        {/* 基本信息 */}
        <div className="form-group">
          <label className="form-label" htmlFor="name">
            {t('form.label.name')}
          </label>
          <input
            type="text"
            className="form-input"
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
            {t('form.label.gitUrl')}
          </label>
          <input
            type="url"
            className="form-input"
            id="gitUrl"
            name="gitUrl"
            value={form.gitUrl}
            onChange={handleChange}
            required
            disabled={isEditMode}
            placeholder={t('form.placeholder.gitUrl')}
            style={isEditMode ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          />
          {isEditMode && (
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--vscode-descriptionForeground)',
                marginTop: 'var(--spacing-xs)',
              }}
            >
              {t('form.hint.gitUrlReadonly')}
            </p>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-md)',
          }}
        >
          <div className="form-group">
            <label className="form-label" htmlFor="branch">
              {t('form.label.branch')}
            </label>
            <input
              type="text"
              className="form-input"
              id="branch"
              name="branch"
              value={form.branch}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="subPath">
              {t('form.label.subPath')}
            </label>
            <input
              type="text"
              className="form-input"
              id="subPath"
              name="subPath"
              value={form.subPath}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* 认证信息 */}
        <div className="form-group">
          <label className="form-label">{t('Source Authentication')}</label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--spacing-sm)',
              flexWrap: 'wrap',
              marginBottom: 'var(--spacing-md)',
            }}
          >
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`button ${form.authType === 'none' ? '' : 'button-secondary'}`}
                onClick={() => handleAuthTypeChange('none')}
              >
                {t('form.auth.none')}
              </button>
              <button
                type="button"
                className={`button ${form.authType === 'token' ? '' : 'button-secondary'}`}
                onClick={() => handleAuthTypeChange('token')}
              >
                {t('form.auth.token')}
              </button>
              <button
                type="button"
                className={`button ${form.authType === 'ssh' ? '' : 'button-secondary'}`}
                onClick={() => handleAuthTypeChange('ssh')}
              >
                {t('form.auth.ssh')}
              </button>
            </div>
          </div>

          {/* 连接状态 */}
          {connectionStatus && connectionStatus.state !== 'idle' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                marginBottom: 'var(--spacing-md)',
              }}
            >
              {connectionStatus.state === 'testing' && (
                <i className="codicon codicon-sync codicon-modifier-spin"></i>
              )}
              {connectionStatus.state === 'ok' && (
                <i
                  className="codicon codicon-pass-filled"
                  style={{ color: 'var(--vscode-testing-iconPassed)' }}
                ></i>
              )}
              {connectionStatus.state === 'fail' && (
                <i
                  className="codicon codicon-error"
                  style={{ color: 'var(--vscode-errorForeground)' }}
                ></i>
              )}
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

        {/* Token 认证 */}
        {form.authType === 'token' && (
          <div className="form-group">
            <label className="form-label" htmlFor="token">
              {t('Personal Access Token (HTTPS)')}
            </label>
            <input
              type="password"
              className="form-input"
              id="token"
              name="token"
              value={form.token}
              onChange={handleChange}
              placeholder={t('form.placeholder.token')}
            />
          </div>
        )}

        {/* SSH 认证 */}
        {form.authType === 'ssh' && (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="sshKeyPath">
                {t('form.label.sshKeyPath')}
              </label>
              <input
                type="text"
                className="form-input"
                id="sshKeyPath"
                name="sshKeyPath"
                value={form.sshKeyPath}
                onChange={handleChange}
                placeholder={t('form.placeholder.sshKeyPath')}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="sshPassphrase">
                {t('form.label.sshPassphrase')}
              </label>
              <input
                type="password"
                className="form-input"
                id="sshPassphrase"
                name="sshPassphrase"
                value={form.sshPassphrase}
                onChange={handleChange}
              />
            </div>
          </>
        )}

        {/* 操作按钮 */}
        <div
          className="action-buttons"
          style={{ justifyContent: 'flex-end', marginTop: 'var(--spacing-xl)' }}
        >
          <button
            type="button"
            className="button button-secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            {t('form.cancel')}
          </button>
          <button type="submit" className="button" disabled={submitting}>
            {isEditMode ? t('form.save') : t('form.button.addSource')}
          </button>
        </div>
      </form>
    </div>
  );
};
