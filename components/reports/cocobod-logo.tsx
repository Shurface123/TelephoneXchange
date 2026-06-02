/**
 * COCOBOD Ghana Cocoa Board — Reusable SVG Logo Component
 * Circular emblem with cocoa pod, leaves, gold border, dark background
 */

interface CocobodLogoProps {
  size?: number
  className?: string
}

export function CocobodLogo({ size = 120, className = "" }: CocobodLogoProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Ghana Cocoa Board Logo"
    >
      {/* Outer gold ring */}
      <circle cx="60" cy="60" r="57" fill="none" stroke="#D4AF37" strokeWidth="4" />
      {/* Dark background */}
      <circle cx="60" cy="60" r="50" fill="#2C1810" />
      {/* Inner dashed decorative ring */}
      <circle cx="60" cy="60" r="46" fill="none" stroke="#D4AF37" strokeWidth="1.2" strokeDasharray="3 2.5" />

      {/* Cocoa pod body */}
      <ellipse cx="60" cy="63" rx="14" ry="22" fill="#7B5209" />
      <ellipse cx="60" cy="63" rx="10.5" ry="19" fill="#C8A034" />
      {/* Pod ridges */}
      {[-5, -2.5, 0, 2.5, 5].map((x, i) => (
        <line key={i} x1={60 + x} y1="44" x2={60 + x} y2="82" stroke="#7B5209" strokeWidth="0.7" opacity="0.55" />
      ))}

      {/* Stem */}
      <rect x="57" y="37" width="6" height="9" rx="3" fill="#5C3D11" />
      {/* Stem tip */}
      <ellipse cx="60" cy="37" rx="4" ry="2" fill="#7B5209" />

      {/* Upper-left leaf */}
      <path d="M47 52 Q28 36 31 18 Q46 34 47 52Z" fill="#2D5016" />
      <line x1="47" y1="52" x2="32" y2="23" stroke="#1A3A0A" strokeWidth="0.8" opacity="0.7" />

      {/* Upper-right leaf */}
      <path d="M73 52 Q92 36 89 18 Q74 34 73 52Z" fill="#2D5016" />
      <line x1="73" y1="52" x2="88" y2="23" stroke="#1A3A0A" strokeWidth="0.8" opacity="0.7" />

      {/* Lower-left leaf */}
      <path d="M50 74 Q26 78 23 58 Q40 66 50 74Z" fill="#3A6B1A" />
      {/* Lower-right leaf */}
      <path d="M70 74 Q94 78 97 58 Q80 66 70 74Z" fill="#3A6B1A" />

      {/* Top text arc */}
      <path id="topArcLogo" d="M 16 58 A 44 44 0 0 1 104 58" fill="none" />
      <text fontSize="7" fill="#D4AF37" fontFamily="Georgia, serif" fontWeight="bold" letterSpacing="0.8">
        <textPath href="#topArcLogo" startOffset="6%">GHANA COCOA BOARD</textPath>
      </text>

      {/* Bottom text arc */}
      <path id="botArcLogo" d="M 22 66 A 38 38 0 0 0 98 66" fill="none" />
      <text fontSize="6" fill="#D4AF37" fontFamily="Georgia, serif" letterSpacing="2">
        <textPath href="#botArcLogo" startOffset="15%">COCOBOD</textPath>
      </text>
    </svg>
  )
}

export default CocobodLogo
