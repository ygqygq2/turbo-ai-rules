import React from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SourceManager } from './SourceManager';
import '../global.css';
import './source-manager.css';

/**
 * Source Manager 应用入口组件
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <SourceManager />
    </ErrorBoundary>
  );
};

export { App };
