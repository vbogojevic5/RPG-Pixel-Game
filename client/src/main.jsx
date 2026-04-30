import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';
import './styles/ui.css';
import './styles/map.css';
import './styles/battle.css';
import './styles/manager.css';
import './styles/phase3.css';

const path = window.location.pathname;
if (path.startsWith('/admin')) {
  window.location.replace(`${window.location.protocol}//${window.location.hostname}:5174/`);
} else if (path !== '/') {
  window.history.replaceState(null, '', '/');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
