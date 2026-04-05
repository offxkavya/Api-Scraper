import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Global error handler for boot-up crashes
window.onerror = (message, source, lineno, colno, error) => {
  const root = document.getElementById('root');
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `
      <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #09090b; color: white; font-family: sans-serif; padding: 20px; text-align: center;">
        <h1 style="color: #ef4444; margin-bottom: 10px;">App Initialization Error</h1>
        <p style="color: #71717a; max-width: 400px; line-height: 1.5;">${message}</p>
        <p style="margin-top: 20px; font-size: 14px; color: #3b82f6;">Check your Vercel Environment Variables and browser console.</p>
      </div>
    `;
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
