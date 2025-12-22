import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initI18n } from '../utils/i18n';

// 等待 i18n 初始化完成后再渲染 React
initI18n().then(() => {
  const root = document.getElementById('root');
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  }
});
