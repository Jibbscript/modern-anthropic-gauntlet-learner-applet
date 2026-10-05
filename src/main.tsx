import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'

// the dev gallery ships only in dev and in the `smoke` build used by scripts/smoke.ts
const isGallery = (import.meta.env.DEV || import.meta.env.MODE === 'smoke') && new URLSearchParams(location.search).has('gallery')
// both lazy so the dev gallery never pulls in the app tree (and vice versa)
const Root = isGallery
  ? lazy(() => import('./dev/Gallery').then((m) => ({ default: m.Gallery })))
  : lazy(() => import('./app/App').then((m) => ({ default: m.App })))

// the artifact host supplies its own <html>: keep the language set for screen readers and CSS hyphenation
if (!document.documentElement.lang) document.documentElement.lang = 'en'

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
