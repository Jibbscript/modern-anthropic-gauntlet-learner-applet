import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'

const isGallery = import.meta.env.DEV && new URLSearchParams(location.search).has('gallery')
// both lazy so the dev gallery never pulls in the app tree (and vice versa)
const Root = isGallery
  ? lazy(() => import('./dev/Gallery').then((m) => ({ default: m.Gallery })))
  : lazy(() => import('./app/App').then((m) => ({ default: m.App })))

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
