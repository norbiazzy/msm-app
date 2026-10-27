import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ServerStatusBanner from './ServerStatusBanner';
import NetworkStatusBanner from './NetworkStatusBanner';
import './styles.css';
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
