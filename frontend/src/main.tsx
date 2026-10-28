import './msm-design-v11.css';
import './msm-invoice-table-v11_2.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ServerStatusBanner from './ServerStatusBanner';
import NetworkStatusBanner from './NetworkStatusBanner';
import './styles.css'
import './recognition.css';
import './serverStatus.css';
import './networkStatus.css';

window.Telegram?.WebApp?.ready();
window.Telegram?.WebApp?.expand();

if ('serviceWorker' in navigator) {
  window.addEventListener(
    'load',
    () => {
      void navigator.serviceWorker
        .register('/sw.js')
        .catch((error) => {
          console.warn(
            'Не удалось включить offline-режим',
            error,
          );
        });
    },
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NetworkStatusBanner />
    <ServerStatusBanner />
    <App />
  </StrictMode>,
);

import './msm-ui-update.css';

import './msm-payments-ui.css';

import './msm-documents-v3.css';
import './msm-supplier-workflow-v6.css';

import './msm-unified-uploads-v7.css';

import './msm-unified-attachments-v8.css';
import './msm-document-flow-v9.css';
import './msm-fixes-v10.css';
import './msm-mobile-compact-v12.css';
import './msm-ui-v13.css';
import './msm-mobile-nav-v13_1.css';

import "./msm-ui-v15.css";

import './msm-supplier-v17.css';
