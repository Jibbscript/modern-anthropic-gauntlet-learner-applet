import { useId, type CSSProperties } from 'react'

/**
 * The Gauntlet app mark: three rising rounded blocks (the levels of the loop)
 * and a gold dot on a violet-to-indigo tile, matching public/icon.svg.
 */
export function LogoMark({ size = 28, className, style }: { size?: number; className?: string; style?: CSSProperties }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg
      className={className}
      style={{ flex: 'none', ...style }}
      width={size}
      height={size}
      viewBox="0 0 512 512"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b6dff" />
          <stop offset="1" stopColor="#4b5bff" />
        </linearGradient>
        <linearGradient id={`${id}-gl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".45" />
          <stop offset=".55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill={`url(#${id}-bg)`} />
      <rect width="512" height="512" rx="128" fill={`url(#${id}-gl)`} />
      <rect x="104" y="292" width="88" height="116" rx="24" fill="#fff" opacity=".72" />
      <rect x="212" y="214" width="88" height="194" rx="24" fill="#fff" opacity=".86" />
      <rect x="320" y="128" width="88" height="280" rx="24" fill="#fff" />
      <circle cx="364" cy="94" r="20" fill="#ffd02b" />
    </svg>
  )
}

/** Mark + "Gauntlet" wordmark. `size` is the mark's edge length in px. */
export function Logo({ size = 28, wordmark = true, className }: { size?: number; wordmark?: boolean; className?: string }) {
  return (
    <span
      className={className}
      role="img"
      aria-label="Gauntlet"
      style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.3), minWidth: 0 }}
    >
      <LogoMark size={size} />
      {wordmark && (
        <span
          aria-hidden="true"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: Math.round(size * 0.78),
            letterSpacing: '-0.035em',
            lineHeight: 1,
            color: 'var(--ink)',
            whiteSpace: 'nowrap',
          }}
        >
          Gauntlet
        </span>
      )}
    </span>
  )
}

export default Logo
