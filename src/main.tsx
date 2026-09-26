import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { startUrlSync } from './state/urlState';
import './styles/app.css';

startUrlSync();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
