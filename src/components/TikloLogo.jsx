export default function TikloLogo({ size = 32 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {/* Icon */}
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect width="48" height="48" rx="13" fill="#FF5733"/>
        <rect x="7" y="16" width="34" height="18" rx="4.5" fill="white" opacity="0.2"/>
        <rect x="7" y="16" width="34" height="18" rx="4.5" stroke="white" strokeWidth="1.8"/>
        <circle cx="7"  cy="25" r="5" fill="#FF5733"/>
        <circle cx="41" cy="25" r="5" fill="#FF5733"/>
        <line x1="14" y1="25" x2="34" y2="25" stroke="white" strokeWidth="1.5" strokeDasharray="3 2.5" strokeLinecap="round"/>
        <circle cx="24" cy="21" r="2.5" fill="white"/>
      </svg>

      {/* Wordmark */}
      <svg width={size * 2.6} height={size * 0.85} viewBox="0 0 100 32" fill="none" aria-label="tiklo">
        <text
          x="0" y="26"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="30"
          fontWeight="700"
          letterSpacing="-1"
          fill="#1a1a1a"
        >Tikl<tspan fill="#FF5733">o</tspan></text>
      </svg>
    </span>
  )
}
