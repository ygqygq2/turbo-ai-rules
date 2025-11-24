import React from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SourceForm } from './SourceForm';
import { t } from '../utils/i18n';
import '../global.css';
import './add-source.css';

interface WindowWithInitialMode extends Window {
  initialMode?: string;
  editSourceId?: string;
}

/**
 * 添加/编辑规则源页面
 */
const App: React.FC = () => {
  const mode = (window as WindowWithInitialMode).initialMode || 'new';
  const sourceId = (window as WindowWithInitialMode).editSourceId;
  const isEditMode = mode === 'edit' && sourceId;

  return (
    <ErrorBoundary>
      <div className="add-source-container">
        <header className="page-header">
          <h1>{isEditMode ? t('form.button.editSource') : t('form.button.addSource')}</h1>
          <p className="subtitle">
            {isEditMode ? t('form.hint.editDescription') : t('form.hint.addDescription')}
          </p>
        </header>
        <SourceForm mode={mode as 'new' | 'edit'} sourceId={sourceId} />
      </div>
    </ErrorBoundary>
  );
};

export { App };
