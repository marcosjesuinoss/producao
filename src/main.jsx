import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AccentProvider } from './context/AccentContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

// basename = base do Vite (ex.: '/producao') p/ as rotas funcionarem no GitHub Pages
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AccentProvider>
          <AuthProvider>
            <BrowserRouter basename={basename}>
              <App />
            </BrowserRouter>
          </AuthProvider>
        </AccentProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
