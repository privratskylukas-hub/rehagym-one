"use client";

interface AnimatedLogoProps {
  size?: number;
  className?: string;
}

/**
 * RehaGym animated logo
 *
 * Concept: central figure representing movement and healing.
 * - Outer rings pulsing outward (breathing / recovery)
 * - Dynamic figure in motion with flowing curves
 * - Brand colors: Lagoon teal + Orange accent on dark turquoise
 */
export function AnimatedLogo({ size = 180, className = "" }: AnimatedLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="RehaGym"
    >
      <defs>
        {/* Teal radial gradient for outer glow */}
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00A3B3" stopOpacity="0.4" />
          <stop offset="60%" stopColor="#00818E" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#00818E" stopOpacity="0" />
        </radialGradient>

        {/* Gradient for ring strokes */}
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00BFD1" />
          <stop offset="100%" stopColor="#00818E" />
        </linearGradient>

        {/* Accent gradient */}
        <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFC233" />
          <stop offset="100%" stopColor="#FFAD00" />
        </linearGradient>

        {/* Figure gradient */}
        <linearGradient id="figureGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00BFD1" />
          <stop offset="100%" stopColor="#00818E" />
        </linearGradient>
      </defs>

      {/* Ambient glow behind everything */}
      <circle cx="100" cy="100" r="95" fill="url(#glow)">
        <animate
          attributeName="r"
          values="90;100;90"
          dur="4s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.8;1;0.8"
          dur="4s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Outer pulsing ring — breath / recovery */}
      <circle
        cx="100"
        cy="100"
        r="82"
        stroke="url(#ringGrad)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.4"
      >
        <animate
          attributeName="r"
          values="78;88;78"
          dur="3s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.2;0.6;0.2"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Second pulsing ring (offset for layered effect) */}
      <circle
        cx="100"
        cy="100"
        r="70"
        stroke="url(#ringGrad)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
      >
        <animate
          attributeName="r"
          values="68;78;68"
          dur="3s"
          begin="0.75s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.3;0.7;0.3"
          dur="3s"
          begin="0.75s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Rotating arc — motion / activity */}
      <g transform="translate(100 100)">
        <circle
          r="62"
          stroke="url(#ringGrad)"
          strokeWidth="3"
          fill="none"
          strokeDasharray="30 330"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0"
            to="360"
            dur="12s"
            repeatCount="indefinite"
          />
        </circle>
      </g>

      {/* Counter-rotating accent arc */}
      <g transform="translate(100 100)">
        <circle
          r="55"
          stroke="url(#accentGrad)"
          strokeWidth="2.5"
          fill="none"
          strokeDasharray="20 325"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="360"
            to="0"
            dur="9s"
            repeatCount="indefinite"
          />
        </circle>
      </g>

      {/* Central wellness figure: abstract person in motion */}
      {/* Head */}
      <circle cx="100" cy="72" r="8" fill="url(#figureGrad)">
        <animate
          attributeName="cy"
          values="72;70;72"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Body - curved spine suggesting movement */}
      <path
        d="M100 82 Q102 100 100 125"
        stroke="url(#figureGrad)"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      >
        <animate
          attributeName="d"
          values="M100 82 Q102 100 100 125;M100 80 Q98 100 100 123;M100 82 Q102 100 100 125"
          dur="2s"
          repeatCount="indefinite"
        />
      </path>

      {/* Arms raised in motion */}
      <path
        d="M100 92 Q85 88 75 95"
        stroke="url(#figureGrad)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      >
        <animate
          attributeName="d"
          values="M100 92 Q85 88 75 95;M100 92 Q85 82 72 80;M100 92 Q85 88 75 95"
          dur="2s"
          repeatCount="indefinite"
        />
      </path>
      <path
        d="M100 92 Q115 88 125 95"
        stroke="url(#figureGrad)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      >
        <animate
          attributeName="d"
          values="M100 92 Q115 88 125 95;M100 92 Q115 82 128 80;M100 92 Q115 88 125 95"
          dur="2s"
          repeatCount="indefinite"
        />
      </path>

      {/* Legs in stride */}
      <path
        d="M100 125 Q92 138 88 150"
        stroke="url(#figureGrad)"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      >
        <animate
          attributeName="d"
          values="M100 125 Q92 138 88 150;M100 125 Q94 138 90 150;M100 125 Q92 138 88 150"
          dur="2s"
          repeatCount="indefinite"
        />
      </path>
      <path
        d="M100 125 Q108 138 112 150"
        stroke="url(#figureGrad)"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      >
        <animate
          attributeName="d"
          values="M100 125 Q108 138 112 150;M100 125 Q106 138 110 150;M100 125 Q108 138 112 150"
          dur="2s"
          repeatCount="indefinite"
        />
      </path>

      {/* Accent dot — highlight orange */}
      <circle cx="100" cy="72" r="2" fill="#FFAD00">
        <animate
          attributeName="opacity"
          values="0;1;0"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}
