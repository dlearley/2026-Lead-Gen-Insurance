import React from 'react';
import { createRoot } from 'react-dom/client';
import { LeadsPage } from './pages';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <div className="app-container">
      <LeadsPage />
    </div>
  </React.StrictMode>
);
