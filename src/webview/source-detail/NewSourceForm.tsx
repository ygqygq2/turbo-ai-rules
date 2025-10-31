import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { vscodeApi } from '../utils/vscode-api';

interface NewSourceFormProps {
  onCancel?: () => void;
}

export const NewSourceForm: React.FC<NewSourceFormProps> = ({ onCancel }) => {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAuthTypeChange = (type: string) => {
    setForm((prev) => ({ ...prev, authType: type }));
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
    try {
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
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="new-source-form" onSubmit={handleSubmit}>
      <Card>
        <h2>Add New Rule Source</h2>
        {error && <div className="error-box">{error}</div>}
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
          <div className="auth-options" style={{ display: 'flex', gap: '8px' }}>
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
              onChange={handleChange}
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
                onChange={handleChange}
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
                onChange={handleChange}
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
