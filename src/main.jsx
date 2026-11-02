import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { runPlatformResetOnce } from './utils/platformReset'

// Zera a memória local da plataforma (uma única vez por versão) antes de qualquer componente ler o storage
runPlatformResetOnce()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
