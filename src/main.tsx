import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './styles/tokens.css'
import './styles/base.css'

const isGallery = import.meta.env.DEV && new URLSearchParams(location.search).has('gallery')
const Root = isGallery ? lazy(() => import('./dev/Gallery').then((m) => ({ default: m.Gallery }))) : App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Root />
    </Suspense>
  </StrictMode>,
)

// offline support for the hosted build (not inside sandboxed artifact frames)
if (!__ARTIFACT__ && import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
