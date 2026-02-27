import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './index.css';
import App from './App.tsx';
import { initMocks } from './mocks';

const preloadReloadKey = 'vite_preload_reload_attempted_v2';
const chunkReloadKey = 'chunk_reload_attempted_v2';

const shouldReloadNow = (storageKey: string, intervalMs = 10000): boolean => {
  const lastReload = sessionStorage.getItem(storageKey);
  const now = Date.now();

  if (!lastReload || now - parseInt(lastReload, 10) > intervalMs) {
    sessionStorage.setItem(storageKey, now.toString());
    return true;
  }

  return false;
};

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();

  if (shouldReloadNow(preloadReloadKey)) {
    window.location.reload();
    return;
  }

  console.error('V2 preload CSS/asset error persists after reload. Please clear browser cache.');
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason?.message || reason?.toString?.() || '';

  const isChunkLoadError =
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('Loading CSS chunk') ||
    message.includes('Unable to preload CSS for') ||
    reason?.name === 'ChunkLoadError';

  if (!isChunkLoadError) {
    return;
  }

  event.preventDefault();

  if (shouldReloadNow(chunkReloadKey)) {
    window.location.reload();
    return;
  }

  console.error('V2 chunk load error persists after reload. Please clear browser cache.');
});

// Initialize MSW mocks in development
initMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
