import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

function syncVisualViewportVars() {
  const viewport = window.visualViewport
  document.documentElement.style.setProperty('--app-layout-width', `${window.innerWidth}px`)
  document.documentElement.style.setProperty('--app-layout-height', `${window.innerHeight}px`)
  document.documentElement.style.setProperty('--app-visual-width', `${viewport?.width || window.innerWidth}px`)
  document.documentElement.style.setProperty('--app-visual-height', `${viewport?.height || window.innerHeight}px`)
}

syncVisualViewportVars()
requestAnimationFrame(syncVisualViewportVars)
window.setTimeout(syncVisualViewportVars, 250)
window.visualViewport?.addEventListener('resize', syncVisualViewportVars)
window.visualViewport?.addEventListener('scroll', syncVisualViewportVars)
window.addEventListener('resize', syncVisualViewportVars)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
