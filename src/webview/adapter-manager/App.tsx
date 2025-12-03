import React from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AdapterManager } from './AdapterManager';
import '../global.css';
import './adapter-manager.css';

/**
 * Adapter Manager 应用入口组件
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AdapterManager />
    </ErrorBoundary>
  );
};

export { App };
