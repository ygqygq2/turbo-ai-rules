import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initI18n } from '../utils/i18n';

// 等待 i18n 初始化完成后再渲染 React
initI18n().then(() => {
  const root = createRoot(document.getElementById('root')!);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
