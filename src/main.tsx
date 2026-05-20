import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/animations.css'
import App from './App'
import ParticleBackground from './components/common/ParticleBackground'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ParticleBackground />
    <App />
  </StrictMode>,
)
