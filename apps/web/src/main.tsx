import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { initSentry } from './lib/sentry';
import App from './App';
import './i18n';
import './index.css';

// Initialize Sentry before rendering
initSentry();

// Defer Mixpanel initialization to reduce TBT (Total Blocking Time)
// Mixpanel is non-critical for initial render
const initMixpanel = () => {
  import('mixpanel-browser').then(({ default: mixpanel }) => {
    mixpanel.init('6c0eca6726c12dd30b4e4a1cdef97adc', {
      debug: false,
      track_pageview: true,
      persistence: 'localStorage',
      autocapture: true,
      record_sessions_percent: 100,
    });
  });
};

if ('requestIdleCallback' in window) {
  requestIdleCallback(initMixpanel);
} else {
  setTimeout(initMixpanel, 2000);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              fontSize: '13px',
              background: '#18181b',
              color: '#fafafa',
              border: '1px solid #27272a',
              borderRadius: '8px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#18181b' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#18181b' }, duration: 4000 },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
