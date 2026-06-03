import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import 'ohs-player-web-core/styles.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
