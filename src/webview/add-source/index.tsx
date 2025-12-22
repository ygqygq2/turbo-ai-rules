import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initI18n } from '../utils/i18n';

initI18n().then(() => {
  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
