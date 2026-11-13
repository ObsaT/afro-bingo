import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Capture PWA install prompt globally for APK installation
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.installPrompt = e;
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
