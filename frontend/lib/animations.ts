/**
 * Dashboard Animation Library
 * 
 * A comprehensive collection of micro-interactions and animations
 * designed for SaaS dashboards. Clean, soft, and performant.
 * 
 * Built with Framer Motion
 * @author Senior Frontend Engineer
 */

import { Variants, Transition, TargetAndTransition } from 'framer-motion';

// =============================================================================
// TIMING & EASING CONSTANTS
// =============================================================================

export const TIMING = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  slower: 0.7,
  sluggish: 1.0,
} as const;

export const EASING = {
  // Smooth, natural feeling
  smooth: [0.4, 0, 0.2, 1],
  // Quick start, gentle end
  easeOut: [0, 0, 0.2, 1],
  // Gentle start, quick end
  easeIn: [0.4, 0, 1, 1],
  // Bouncy, playful
  bounce: [0.68, -0.55, 0.265, 1.55],
  // Snappy, responsive
  snappy: [0.25, 0.1, 0.25, 1],
  // Spring-like
  spring: [0.175, 0.885, 0.32, 1.275],
  // Elegant deceleration
  elegant: [0.23, 1, 0.32, 1],
} as const;

// =============================================================================
// SPRING CONFIGURATIONS
// =============================================================================

export const SPRING = {
  // Gentle, floaty
  gentle: { type: 'spring', stiffness: 120, damping: 14, mass: 1 },
  // Responsive, snappy
  snappy: { type: 'spring', stiffness: 400, damping: 30, mass: 1 },
  // Bouncy, playful
  bouncy: { type: 'spring', stiffness: 300, damping: 10, mass: 0.8 },
  // Stiff, minimal overshoot
  stiff: { type: 'spring', stiffness: 500, damping: 35, mass: 1 },
  // Soft landing
  soft: { type: 'spring', stiffness: 200, damping: 20, mass: 1 },
  // Wobbly entrance
  wobbly: { type: 'spring', stiffness: 180, damping: 12, mass: 1 },
} as const;

// =============================================================================
// PAGE TRANSITIONS
// =============================================================================

export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: TIMING.normal,
      ease: EASING.smooth,
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: TIMING.fast,
      ease: EASING.easeIn,
    },
  },
};

export const pageSlideIn: Variants = {
  initial: {
    opacity: 0,
    x: -30,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: TIMING.normal,
      ease: EASING.elegant,
    },
  },
  exit: {
    opacity: 0,
    x: 30,
    transition: {
      duration: TIMING.fast,
    },
  },
};

// =============================================================================
// CONTAINER & STAGGER ANIMATIONS
// =============================================================================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

// =============================================================================
// CARD ANIMATIONS
// =============================================================================

export const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: TIMING.normal,
      ease: EASING.smooth,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: {
      duration: TIMING.fast,
    },
  },
};

export const cardHover: TargetAndTransition = {
  y: -4,
  scale: 1.02,
  boxShadow: '0 12px 40px -12px rgba(0, 0, 0, 0.15)',
  transition: {
    duration: TIMING.fast,
    ease: EASING.smooth,
  },
};

export const cardTap: TargetAndTransition = {
  scale: 0.98,
  transition: {
    duration: TIMING.instant,
  },
};

export const statsCardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.9,
  },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: TIMING.normal,
      ease: EASING.elegant,
    },
  }),
  hover: {
    y: -6,
    scale: 1.03,
    transition: {
      duration: TIMING.fast,
      ease: EASING.smooth,
    },
  },
};

// =============================================================================
// TABLE & LIST ANIMATIONS
// =============================================================================

export const tableRowVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: TIMING.fast,
      ease: EASING.smooth,
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: TIMING.fast,
    },
  },
};

export const tableRowHover: TargetAndTransition = {
  backgroundColor: 'rgba(0, 0, 0, 0.02)',
  transition: {
    duration: TIMING.instant,
  },
};

export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: TIMING.fast,
      ease: EASING.smooth,
    },
  }),
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: TIMING.fast,
    },
  },
};

// =============================================================================
// BUTTON & INTERACTIVE ELEMENT ANIMATIONS
// =============================================================================

export const buttonVariants: Variants = {
  idle: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: TIMING.instant,
      ease: EASING.smooth,
    },
  },
  tap: {
    scale: 0.97,
    transition: {
      duration: TIMING.instant,
    },
  },
  disabled: {
    opacity: 0.5,
    scale: 1,
  },
};

export const iconButtonVariants: Variants = {
  idle: {
    scale: 1,
    rotate: 0,
  },
  hover: {
    scale: 1.1,
    transition: {
      duration: TIMING.fast,
      ease: EASING.smooth,
    },
  },
  tap: {
    scale: 0.9,
    transition: {
      duration: TIMING.instant,
    },
  },
};

export const fabVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
    rotate: -180,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      ...SPRING.bouncy,
      delay: 0.2,
    },
  },
  hover: {
    scale: 1.1,
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
    transition: {
      duration: TIMING.fast,
    },
  },
  tap: {
    scale: 0.95,
  },
};

// =============================================================================
// MODAL & OVERLAY ANIMATIONS
// =============================================================================

export const overlayVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: TIMING.fast,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: TIMING.fast,
      delay: 0.1,
    },
  },
};

export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...SPRING.snappy,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: TIMING.fast,
    },
  },
};

export const slideUpModalVariants: Variants = {
  hidden: {
    opacity: 0,
    y: '100%',
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ...SPRING.gentle,
    },
  },
  exit: {
    opacity: 0,
    y: '100%',
    transition: {
      duration: TIMING.normal,
      ease: EASING.easeIn,
    },
  },
};

export const sheetVariants: Variants = {
  hidden: {
    x: '100%',
    opacity: 0.5,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      ...SPRING.gentle,
    },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: {
      duration: TIMING.normal,
      ease: EASING.easeIn,
    },
  },
};

// =============================================================================
// DROPDOWN & POPOVER ANIMATIONS
// =============================================================================

export const dropdownVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: TIMING.fast,
      ease: EASING.smooth,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: {
      duration: TIMING.instant,
    },
  },
};

export const popoverVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      ...SPRING.snappy,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: TIMING.instant,
    },
  },
};

export const tooltipVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 5,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: TIMING.instant,
      ease: EASING.smooth,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: TIMING.instant,
    },
  },
};

// =============================================================================
// NOTIFICATION & TOAST ANIMATIONS
// =============================================================================

export const toastVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
    scale: 0.9,
    x: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    x: 0,
    transition: {
      ...SPRING.snappy,
    },
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: {
      duration: TIMING.fast,
      ease: EASING.easeIn,
    },
  },
};

export const notificationBadgeVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      ...SPRING.bouncy,
    },
  },
  pulse: {
    scale: [1, 1.2, 1],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      repeatDelay: 2,
    },
  },
};

// =============================================================================
// LOADING & SKELETON ANIMATIONS
// =============================================================================

export const skeletonPulse: Variants = {
  initial: {
    opacity: 0.4,
  },
  animate: {
    opacity: [0.4, 0.7, 0.4],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const shimmer: Variants = {
  initial: {
    backgroundPosition: '-200% 0',
  },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const dotLoadingVariants: Variants = {
  initial: { y: 0 },
  animate: (i: number) => ({
    y: [-4, 0, -4],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      delay: i * 0.1,
      ease: 'easeInOut',
    },
  }),
};

// =============================================================================
// SUCCESS & ERROR STATE ANIMATIONS
// =============================================================================

export const successCheckVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: 0.5,
        ease: EASING.easeOut,
      },
      opacity: {
        duration: 0.1,
      },
    },
  },
};

export const successCircleVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      ...SPRING.bouncy,
    },
  },
};

export const errorShakeVariants: Variants = {
  shake: {
    x: [-10, 10, -10, 10, 0],
    transition: {
      duration: 0.4,
      ease: 'easeInOut',
    },
  },
};

// =============================================================================
// BADGE & TAG ANIMATIONS
// =============================================================================

export const badgeVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      ...SPRING.bouncy,
    },
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: {
      duration: TIMING.instant,
    },
  },
};

export const tagVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    x: -10,
  },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: TIMING.fast,
      ease: EASING.smooth,
    },
  }),
  hover: {
    scale: 1.05,
    transition: {
      duration: TIMING.instant,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: TIMING.instant,
    },
  },
};

// =============================================================================
// CHART & DATA VISUALIZATION ANIMATIONS
// =============================================================================

export const chartBarVariants: Variants = {
  hidden: {
    scaleY: 0,
    originY: 1,
  },
  visible: (i: number = 0) => ({
    scaleY: 1,
    transition: {
      delay: i * 0.05,
      duration: TIMING.slow,
      ease: EASING.elegant,
    },
  }),
};

export const chartLineVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: 1,
        ease: EASING.easeOut,
      },
      opacity: {
        duration: TIMING.fast,
      },
    },
  },
};

export const pieChartVariants: Variants = {
  hidden: {
    scale: 0,
    rotate: -90,
    opacity: 0,
  },
  visible: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      duration: TIMING.slow,
      ease: EASING.elegant,
    },
  },
};

// =============================================================================
// NUMBER & COUNTER ANIMATIONS
// =============================================================================

export const numberChangeVariants: Variants = {
  initial: {
    opacity: 0,
    y: -20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: TIMING.fast,
      ease: EASING.smooth,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: {
      duration: TIMING.fast,
    },
  },
};

// =============================================================================
// SIDEBAR & NAVIGATION ANIMATIONS
// =============================================================================

export const sidebarVariants: Variants = {
  expanded: {
    width: 280,
    transition: {
      duration: TIMING.normal,
      ease: EASING.smooth,
    },
  },
  collapsed: {
    width: 80,
    transition: {
      duration: TIMING.normal,
      ease: EASING.smooth,
    },
  },
};

export const navItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: (i: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: TIMING.fast,
      ease: EASING.smooth,
    },
  }),
  hover: {
    x: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    transition: {
      duration: TIMING.instant,
    },
  },
  active: {
    x: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
};

export const menuIconVariants: Variants = {
  open: {
    rotate: 180,
    transition: {
      duration: TIMING.normal,
      ease: EASING.smooth,
    },
  },
  closed: {
    rotate: 0,
    transition: {
      duration: TIMING.normal,
      ease: EASING.smooth,
    },
  },
};

// =============================================================================
// ACCORDION & EXPANDABLE ANIMATIONS
// =============================================================================

export const accordionVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: {
        duration: TIMING.normal,
        ease: EASING.smooth,
      },
      opacity: {
        duration: TIMING.fast,
      },
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: {
        duration: TIMING.normal,
        ease: EASING.smooth,
      },
      opacity: {
        duration: TIMING.fast,
        delay: 0.1,
      },
    },
  },
};

export const expandIconVariants: Variants = {
  collapsed: {
    rotate: 0,
  },
  expanded: {
    rotate: 180,
  },
};

// =============================================================================
// TAB & SEGMENT ANIMATIONS
// =============================================================================

export const tabIndicatorVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      ...SPRING.snappy,
    },
  },
};

export const tabContentVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: TIMING.fast,
      ease: EASING.smooth,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: TIMING.fast,
    },
  },
};

// =============================================================================
// FORM & INPUT ANIMATIONS
// =============================================================================

export const inputFocusVariants: Variants = {
  idle: {
    scale: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  focus: {
    scale: 1.01,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
    transition: {
      duration: TIMING.fast,
    },
  },
  error: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)',
  },
};

export const labelFloatVariants: Variants = {
  idle: {
    y: 0,
    scale: 1,
    color: 'rgba(0, 0, 0, 0.5)',
  },
  float: {
    y: -24,
    scale: 0.85,
    color: 'rgba(59, 130, 246, 1)',
    transition: {
      duration: TIMING.fast,
      ease: EASING.smooth,
    },
  },
};

// =============================================================================
// SPECIAL EFFECTS
// =============================================================================

export const glowPulse: Variants = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(59, 130, 246, 0.2)',
      '0 0 40px rgba(59, 130, 246, 0.4)',
      '0 0 20px rgba(59, 130, 246, 0.2)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const rippleVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0.5,
  },
  animate: {
    scale: 2.5,
    opacity: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

export const confettiVariants: Variants = {
  hidden: {
    y: 0,
    opacity: 1,
    scale: 1,
  },
  visible: (i: number) => ({
    y: -100 - Math.random() * 100,
    x: (Math.random() - 0.5) * 200,
    opacity: 0,
    scale: 0,
    rotate: Math.random() * 720,
    transition: {
      duration: 1 + Math.random() * 0.5,
      delay: i * 0.02,
      ease: 'easeOut',
    },
  }),
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Creates a custom stagger container with specified delay
 */
export const createStaggerContainer = (
  staggerDelay: number = 0.08,
  initialDelay: number = 0.1
): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: initialDelay,
    },
  },
});

/**
 * Creates a fade-in-up animation with custom distance
 */
export const createFadeInUp = (distance: number = 20): Variants => ({
  hidden: {
    opacity: 0,
    y: distance,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: TIMING.normal,
      ease: EASING.smooth,
    },
  },
});

/**
 * Creates a scale animation with custom values
 */
export const createScaleIn = (
  from: number = 0.9,
  to: number = 1
): Variants => ({
  hidden: {
    opacity: 0,
    scale: from,
  },
  visible: {
    opacity: 1,
    scale: to,
    transition: {
      duration: TIMING.normal,
      ease: EASING.smooth,
    },
  },
});

/**
 * Creates a slide animation from specified direction
 */
export const createSlideIn = (
  direction: 'left' | 'right' | 'up' | 'down' = 'left',
  distance: number = 30
): Variants => {
  const isHorizontal = direction === 'left' || direction === 'right';
  const value = direction === 'left' || direction === 'up' ? -distance : distance;

  if (isHorizontal) {
    return {
      hidden: {
        opacity: 0,
        x: value,
      },
      visible: {
        opacity: 1,
        x: 0,
        transition: {
          duration: TIMING.normal,
          ease: EASING.smooth,
        },
      },
    };
  }

  return {
    hidden: {
      opacity: 0,
      y: value,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: TIMING.normal,
        ease: EASING.smooth,
      },
    },
  };
};

// =============================================================================
// ANIMATION PRESETS FOR COMMON USE CASES
// =============================================================================

export const PRESETS = {
  // Dashboard page entrance
  dashboardEnter: {
    container: staggerContainer,
    item: cardVariants,
  },
  
  // Table with animated rows
  animatedTable: {
    container: staggerContainerFast,
    row: tableRowVariants,
  },
  
  // Stats cards grid
  statsGrid: {
    container: staggerContainer,
    card: statsCardVariants,
  },
  
  // Modal with overlay
  modal: {
    overlay: overlayVariants,
    content: modalVariants,
  },
  
  // Side sheet
  sideSheet: {
    overlay: overlayVariants,
    content: sheetVariants,
  },
  
  // Dropdown menu
  dropdown: {
    container: dropdownVariants,
    item: listItemVariants,
  },
  
  // Form elements
  form: {
    input: inputFocusVariants,
    label: labelFloatVariants,
  },
  
  // Loading states
  loading: {
    skeleton: skeletonPulse,
    spinner: spinnerVariants,
    dots: dotLoadingVariants,
  },
  
  // Feedback states
  feedback: {
    success: successCircleVariants,
    error: errorShakeVariants,
    notification: toastVariants,
  },
} as const;

// =============================================================================
// CSS ANIMATION CLASSES (for non-Framer Motion usage)
// =============================================================================

export const CSS_ANIMATIONS = {
  fadeIn: 'animate-in fade-in duration-300',
  fadeOut: 'animate-out fade-out duration-200',
  slideInFromTop: 'animate-in slide-in-from-top duration-300',
  slideInFromBottom: 'animate-in slide-in-from-bottom duration-300',
  slideInFromLeft: 'animate-in slide-in-from-left duration-300',
  slideInFromRight: 'animate-in slide-in-from-right duration-300',
  zoomIn: 'animate-in zoom-in-95 duration-300',
  zoomOut: 'animate-out zoom-out-95 duration-200',
  spin: 'animate-spin',
  ping: 'animate-ping',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
} as const;

export default {
  TIMING,
  EASING,
  SPRING,
  PRESETS,
  CSS_ANIMATIONS,
};
