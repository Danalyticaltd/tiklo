export default function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20, background: '#fff'
    }}>
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        <svg width="56" height="56" viewBox="0 0 56 56" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="28" cy="28" r="24" fill="none" stroke="#f0f0f0" strokeWidth="2.5"/>
          <circle cx="28" cy="28" r="24" fill="none" stroke="#FF5733" strokeWidth="2.5"
            strokeLinecap="round" strokeDasharray="96" strokeDashoffset="96"
            style={{
              animation: 'tiklo-arc 1.6s ease-in-out infinite',
              transformOrigin: '28px 28px',
              transform: 'rotate(-90deg)'
            }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          animation: 'tiklo-float 2s ease-in-out infinite'
        }}>
          <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="13" width="40" height="22" rx="5.5" stroke="#FF5733" strokeWidth="2"/>
            <circle cx="4"  cy="24" r="5.5" fill="white" stroke="#FF5733" strokeWidth="2"/>
            <circle cx="44" cy="24" r="5.5" fill="white" stroke="#FF5733" strokeWidth="2"/>
            <line x1="12" y1="24" x2="36" y2="24" stroke="#FF5733" strokeWidth="1.5" strokeDasharray="3 2.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      <span style={{
        fontFamily: 'system-ui, sans-serif', fontSize: 11,
        fontWeight: 700, letterSpacing: 4, color: '#ccc', textTransform: 'uppercase'
      }}>tiklo</span>

      <style>{`
        @keyframes tiklo-arc {
          0%   { stroke-dashoffset: 96; }
          50%  { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 96; }
        }
        @keyframes tiklo-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  )
}
