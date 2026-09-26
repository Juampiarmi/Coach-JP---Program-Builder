import { useId } from 'react'

interface Props {
  size?: number
  className?: string
  glow?: boolean
}

/** Isotipo Coach JP: escudo oro con rayo negro. */
export function ShieldLogo({ size = 64, className, glow = false }: Props) {
  const gid = 'jpg' + useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <svg
      width={size}
      height={(size * 74) / 64}
      viewBox="0 0 64 74"
      fill="none"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 0 10px rgba(255,214,0,.45))' } : undefined}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="64" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFE873" />
          <stop offset=".38" stopColor="#FFD600" />
          <stop offset=".72" stopColor="#C9A100" />
          <stop offset="1" stopColor="#8A6B00" />
        </linearGradient>
      </defs>
      <path
        d="M32 2 L60 12 L60 36 C60 54 47 66 32 72 C17 66 4 54 4 36 L4 12 Z"
        fill={`url(#${gid})`}
        stroke="#FFF0A8"
        strokeWidth="1.6"
      />
      <path
        d="M32 8.5 L54.5 16.5 L54.5 36 C54.5 50.5 44.5 60.5 32 65.5 C19.5 60.5 9.5 50.5 9.5 36 L9.5 16.5 Z"
        stroke="#6B5400"
        strokeOpacity=".55"
        strokeWidth="1.4"
      />
      <path d="M36 18 L21 40 L30 40 L27 58 L43 34 L33 34 Z" fill="#07080A" />
    </svg>
  )
}
