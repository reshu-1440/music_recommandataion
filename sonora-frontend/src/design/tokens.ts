/**
 * SONORA Design System Tokens
 * Style inspiration: Spotify, Apple Music, Linear
 * Clean, dark, minimal, generous whitespace, single lime accent.
 */

export const tokens = {
  colors: {
    // Backgrounds & Surface Layers
    bgApp: '#0B0B0C', // Near-black base canvas
    bgSurface1: '#121214', // Sidebars, navigation containers, large cards
    bgSurface2: '#18181B', // Cards, input backgrounds, active panels
    bgSurface3: '#222226', // Hover states, elevated chips, dropdowns
    bgSurface4: '#2C2C32', // Active controls, pressed states
    bgGlass: 'rgba(18, 18, 20, 0.85)', // Player bar & floating glass blur

    // Borders & Dividers
    borderSubtle: 'rgba(255, 255, 255, 0.06)', // Card borders, dividers
    borderMedium: 'rgba(255, 255, 255, 0.12)', // Input borders, active chips
    borderFocus: 'rgba(198, 242, 107, 0.5)', // Glow on focus
    borderActive: 'rgba(255, 255, 255, 0.2)',

    // Single Primary Accent (Lime / Mint)
    accent: '#C6F26B',
    accentHover: '#D8F79A',
    accentActive: '#B4E652',
    accentMuted: 'rgba(198, 242, 107, 0.12)',
    accentBorder: 'rgba(198, 242, 107, 0.28)',
    accentGlow: '0 0 20px rgba(198, 242, 107, 0.18)',

    // Accessible Text Hierarchy (WCAG AA Compliant)
    textPrimary: '#FFFFFF', // High-contrast headers, active labels (>15:1)
    textSecondary: '#D4D4D8', // Body text, readable subheadings (~11.5:1)
    textMuted: '#A1A1AA', // Metadata, secondary artists, labels (~7:1)
    textSubtle: '#71717A', // Captions, timestamps, subtle indicators (~4.6:1)

    // Semantic Statuses
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA'
  },

  typography: {
    fontSans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontMono: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
    sizes: {
      display: 'clamp(2.75rem, 5vw, 4.25rem)', // 44px - 68px
      h1: 'clamp(1.75rem, 3vw, 2.25rem)', // 28px - 36px
      h2: '1.375rem', // 22px
      h3: '1.125rem', // 18px
      bodyLg: '1rem', // 16px
      body: '0.875rem', // 14px
      caption: '0.75rem', // 12px
      mini: '0.6875rem' // 11px
    },
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800
    },
    letterSpacing: {
      tight: '-0.03em',
      snug: '-0.015em',
      normal: '0',
      wide: '0.04em',
      wider: '0.08em',
      widest: '0.12em'
    }
  },

  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    playerHeight: '84px',
    sidebarWidth: '248px'
  },

  radii: {
    xs: '4px',
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
    pill: '9999px'
  },

  shadows: {
    card: '0 4px 24px -2px rgba(0, 0, 0, 0.45)',
    cardHover: '0 12px 32px -4px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)',
    popover: '0 16px 48px -8px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)',
    player: '0 -10px 40px rgba(0, 0, 0, 0.65)',
    glowLime: '0 0 24px rgba(198, 242, 107, 0.2)'
  },

  transitions: {
    fast: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
    normal: '220ms cubic-bezier(0.16, 1, 0.3, 1)',
    slow: '350ms cubic-bezier(0.16, 1, 0.3, 1)'
  }
} as const;

export type DesignTokens = typeof tokens;
