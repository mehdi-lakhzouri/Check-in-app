/**
 * Design System Tokens
 * ====================
 * Enterprise-grade design tokens for consistent UI theming.
 * 
 * Color Palette:
 * - Deep Indigo (#2D3282) - Primary, headers, key buttons, active states
 * - Soft Lavender (#E0E4F7) - Active link backgrounds, subtle highlights
 * - Pale Lavender (#F0F2FD) - Hover states, secondary backgrounds
 * - Pressed Lavender (#D0D6F2) - On-click/pressed feedback
 * - Neutral Grey (#4A4A4A) - Inactive text, secondary elements
 * - Pure White (#FFFFFF) - Primary backgrounds, cards
 */

// ============================================
// COLOR TOKENS
// ============================================

export const colors = {
  // Brand Colors
  brand: {
    indigo: {
      DEFAULT: '#2D3282',
      light: '#6B72C9',
      dark: '#1E2259',
      foreground: '#ffffff',
    },
    lavender: {
      DEFAULT: '#E0E4F7',
      light: '#F0F2FD',
      dark: '#D0D6F2',
      foreground: '#2D3282',
    },
    cerulean: {
      DEFAULT: '#3a6ea5',
      light: '#5b8fc6',
      dark: '#2a5280',
      foreground: '#ffffff',
    },
    azure: {
      DEFAULT: '#004e98',
      light: '#2563eb',
      dark: '#003a72',
      foreground: '#ffffff',
    },
    platinum: {
      DEFAULT: '#ebebeb',
      light: '#f5f5f5',
      dark: '#d4d4d4',
    },
    silver: {
      DEFAULT: '#c0c0c0',
      light: '#d4d4d4',
      dark: '#a0a0a0',
    },
  },

  // Semantic Colors
  semantic: {
    primary: {
      light: '#2D3282',
      dark: '#6B72C9',
    },
    secondary: {
      light: '#F0F2FD',
      dark: '#2D3282',
    },
    accent: {
      light: '#E0E4F7',
      dark: '#3D4494',
    },
    success: {
      light: '#16a34a',
      dark: '#22c55e',
      foreground: {
        light: '#ffffff',
        dark: '#0f172a',
      },
    },
    warning: {
      light: '#f59e0b',
      dark: '#fbbf24',
      foreground: {
        light: '#1a1a2e',
        dark: '#0f172a',
      },
    },
    destructive: {
      light: '#dc2626',
      dark: '#ef4444',
      foreground: '#ffffff',
    },
    info: {
      light: '#3a6ea5',
      dark: '#5b8fc6',
      foreground: {
        light: '#ffffff',
        dark: '#0f172a',
      },
    },
  },

  // Surface Colors
  surface: {
    background: {
      light: '#fafafa',
      dark: '#0f172a',
    },
    card: {
      light: '#ffffff',
      dark: '#1e293b',
    },
    muted: {
      light: '#f5f5f5',
      dark: '#1e293b',
    },
  },

  // Text Colors
  text: {
    primary: {
      light: '#1a1a2e',
      dark: '#f8fafc',
    },
    secondary: {
      light: '#64748b',
      dark: '#94a3b8',
    },
    muted: {
      light: '#64748b',
      dark: '#94a3b8',
    },
  },

  // Border Colors
  border: {
    DEFAULT: {
      light: '#c0c0c0',
      dark: 'rgba(255, 255, 255, 0.1)',
    },
    focus: {
      light: '#3a6ea5',
      dark: '#5b8fc6',
    },
  },
} as const;

// ============================================
// SPACING TOKENS
// ============================================

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
} as const;

// ============================================
// TYPOGRAPHY TOKENS
// ============================================

export const typography = {
  fontFamily: {
    sans: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
    mono: 'var(--font-geist-mono), ui-monospace, monospace',
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
    '6xl': ['3.75rem', { lineHeight: '1' }],
  },
  fontWeight: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ============================================
// BORDER RADIUS TOKENS
// ============================================

export const borderRadius = {
  none: '0',
  sm: 'calc(0.625rem - 4px)',   // ~6px
  DEFAULT: 'calc(0.625rem - 2px)', // ~8px
  md: 'calc(0.625rem - 2px)',   // ~8px
  lg: '0.625rem',               // 10px
  xl: 'calc(0.625rem + 4px)',   // ~14px
  '2xl': '1rem',                // 16px
  '3xl': '1.5rem',              // 24px
  full: '9999px',
} as const;

// ============================================
// SHADOW TOKENS
// ============================================

export const shadows = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
  // Brand colored shadows
  primary: '0 4px 14px -3px rgba(58, 110, 165, 0.3)',
  accent: '0 4px 14px -3px rgba(255, 103, 0, 0.3)',
  azure: '0 4px 14px -3px rgba(0, 78, 152, 0.3)',
} as const;

// ============================================
// ANIMATION / TRANSITION TOKENS
// ============================================

export const transitions = {
  duration: {
    fastest: '50ms',
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
    slowest: '700ms',
  },
  timing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    // Custom bezier curves
    bouncy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    snappy: 'cubic-bezier(0.2, 0, 0, 1)',
  },
} as const;

// ============================================
// Z-INDEX TOKENS
// ============================================

export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  toast: 1600,
  tooltip: 1700,
} as const;

// ============================================
// BREAKPOINT TOKENS
// ============================================

export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================
// COMPONENT SIZE TOKENS
// ============================================

export const componentSizes = {
  button: {
    sm: { height: '2rem', padding: '0.75rem', fontSize: '0.75rem' },
    default: { height: '2.25rem', padding: '1rem', fontSize: '0.875rem' },
    lg: { height: '2.5rem', padding: '1.5rem', fontSize: '0.875rem' },
    xl: { height: '3rem', padding: '2rem', fontSize: '1rem' },
  },
  input: {
    sm: { height: '2rem', padding: '0.5rem', fontSize: '0.75rem' },
    default: { height: '2.25rem', padding: '0.75rem', fontSize: '0.875rem' },
    lg: { height: '2.75rem', padding: '1rem', fontSize: '1rem' },
  },
  icon: {
    xs: '0.75rem',
    sm: '1rem',
    default: '1.25rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '2.5rem',
  },
} as const;

// ============================================
// ACCESSIBILITY TOKENS
// ============================================

export const accessibility = {
  // Minimum touch target size (WCAG 2.1)
  minTouchTarget: '44px',
  // Focus ring configuration
  focusRing: {
    width: '2px',
    offset: '2px',
    color: 'var(--ring)',
  },
  // Contrast ratios (for reference)
  contrastRatios: {
    aa: {
      normalText: 4.5,
      largeText: 3,
      uiComponents: 3,
    },
    aaa: {
      normalText: 7,
      largeText: 4.5,
    },
  },
} as const;

// ============================================
// EXPORT ALL TOKENS
// ============================================

export const designTokens = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  componentSizes,
  accessibility,
} as const;

export default designTokens;
