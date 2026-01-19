/**
 * Animation Hooks & Components
 * 
 * React hooks and utility components for easily applying animations
 * throughout the dashboard.
 */

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { 
  useAnimation, 
  useInView, 
  useReducedMotion,
  useMotionValue,
  useSpring,
  animate,
} from 'framer-motion';
import { TIMING, EASING, SPRING } from './animations';

// =============================================================================
// useAnimateOnView - Trigger animation when element enters viewport
// =============================================================================

interface UseAnimateOnViewOptions {
  threshold?: number;
  triggerOnce?: boolean;
  delay?: number;
}

export function useAnimateOnView(options: UseAnimateOnViewOptions = {}) {
  const { threshold = 0.1, triggerOnce = true, delay = 0 } = options;
  const controls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: triggerOnce, amount: threshold });
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      controls.set('visible');
      return;
    }

    if (isInView) {
      const timer = setTimeout(() => {
        controls.start('visible');
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, controls, delay, prefersReducedMotion]);

  return { ref, controls, isInView };
}

// =============================================================================
// useStaggerAnimation - Staggered animations for lists
// =============================================================================

export function useStaggerAnimation(itemCount: number, staggerDelay: number = 0.08) {
  const controls = useAnimation();
  const prefersReducedMotion = useReducedMotion();

  const startAnimation = useCallback(async () => {
    if (prefersReducedMotion) {
      controls.set('visible');
      return;
    }
    await controls.start('visible');
  }, [controls, prefersReducedMotion]);

  const getItemDelay = useCallback((index: number) => {
    if (prefersReducedMotion) return 0;
    return index * staggerDelay;
  }, [staggerDelay, prefersReducedMotion]);

  return { controls, startAnimation, getItemDelay };
}

// =============================================================================
// useCountUp - Animated number counting
// =============================================================================

interface UseCountUpOptions {
  from?: number;
  to: number;
  duration?: number;
  delay?: number;
  formatter?: (value: number) => string;
}

export function useCountUp(options: UseCountUpOptions) {
  const { from = 0, to, duration = 1.5, delay = 0, formatter = (v) => Math.round(v).toString() } = options;
  const [displayValue, setDisplayValue] = useState(formatter(from));
  const prefersReducedMotion = useReducedMotion();
  const hasAnimated = useRef(false);

  const startCounting = useCallback(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    if (prefersReducedMotion) {
      setDisplayValue(formatter(to));
      return;
    }

    const controls = animate(from, to, {
      duration,
      delay,
      ease: EASING.easeOut as unknown as [number, number, number, number],
      onUpdate: (value) => {
        setDisplayValue(formatter(value));
      },
    });

    return () => controls.stop();
  }, [from, to, duration, delay, formatter, prefersReducedMotion]);

  const reset = useCallback(() => {
    hasAnimated.current = false;
    setDisplayValue(formatter(from));
  }, [from, formatter]);

  return { displayValue, startCounting, reset };
}

// =============================================================================
// useHover - Track hover state with animation support
// =============================================================================

export function useHover() {
  const [isHovered, setIsHovered] = useState(false);
  
  const hoverProps = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
    onFocus: () => setIsHovered(true),
    onBlur: () => setIsHovered(false),
  };

  return { isHovered, hoverProps };
}

// =============================================================================
// usePress - Track press/click state with animation support
// =============================================================================

export function usePress() {
  const [isPressed, setIsPressed] = useState(false);
  
  const pressProps = {
    onMouseDown: () => setIsPressed(true),
    onMouseUp: () => setIsPressed(false),
    onMouseLeave: () => setIsPressed(false),
    onTouchStart: () => setIsPressed(true),
    onTouchEnd: () => setIsPressed(false),
  };

  return { isPressed, pressProps };
}

// =============================================================================
// useDelayedRender - Delay rendering for staggered effects
// =============================================================================

export function useDelayedRender(delay: number, show: boolean = true) {
  const [shouldRender, setShouldRender] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use callback-based setTimeout to avoid direct setState in effect body
  useEffect(() => {
    if (!show) {
      // Clear any pending timer and reset
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // Schedule the state update via callback
      timerRef.current = setTimeout(() => setShouldRender(false), 0);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    if (prefersReducedMotion) {
      timerRef.current = setTimeout(() => setShouldRender(true), 0);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    timerRef.current = setTimeout(() => {
      setShouldRender(true);
    }, delay * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [delay, show, prefersReducedMotion]);

  return shouldRender;
}

// =============================================================================
// useScrollProgress - Track scroll progress for parallax effects
// =============================================================================

export function useScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollTop / docHeight : 0;
      setScrollProgress(Math.min(1, Math.max(0, progress)));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollProgress;
}

// =============================================================================
// useParallax - Simple parallax effect
// =============================================================================

export function useParallax(speed: number = 0.5) {
  const y = useMotionValue(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleScroll = () => {
      y.set(window.scrollY * speed);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [y, speed, prefersReducedMotion]);

  return y;
}

// =============================================================================
// useMousePosition - Track mouse position for interactive effects
// =============================================================================

export function useMousePosition(ref?: React.RefObject<HTMLElement>) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const element = ref?.current || window;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (ref?.current) {
        const rect = ref.current.getBoundingClientRect();
        setPosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      } else {
        setPosition({ x: e.clientX, y: e.clientY });
      }
    };

    element.addEventListener('mousemove', handleMouseMove as EventListener);
    return () => element.removeEventListener('mousemove', handleMouseMove as EventListener);
  }, [ref]);

  return position;
}

// =============================================================================
// useTilt - 3D tilt effect on hover
// =============================================================================

interface UseTiltOptions {
  max?: number;
  perspective?: number;
  scale?: number;
}

export function useTilt(options: UseTiltOptions = {}) {
  const { max = 10, perspective = 1000, scale = 1.02 } = options;
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const scaleValue = useMotionValue(1);

  const springRotateX = useSpring(rotateX, SPRING.gentle);
  const springRotateY = useSpring(rotateY, SPRING.gentle);
  const springScale = useSpring(scaleValue, SPRING.gentle);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || prefersReducedMotion) return;
    
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const percentX = (e.clientX - centerX) / (rect.width / 2);
    const percentY = (e.clientY - centerY) / (rect.height / 2);
    
    rotateX.set(-percentY * max);
    rotateY.set(percentX * max);
    scaleValue.set(scale);
  }, [max, scale, rotateX, rotateY, scaleValue, prefersReducedMotion]);

  const handleMouseLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    scaleValue.set(1);
  }, [rotateX, rotateY, scaleValue]);

  const style = {
    perspective,
    rotateX: springRotateX,
    rotateY: springRotateY,
    scale: springScale,
  };

  return { 
    ref, 
    style, 
    handlers: { 
      onMouseMove: handleMouseMove, 
      onMouseLeave: handleMouseLeave 
    } 
  };
}

// =============================================================================
// useTypewriter - Typewriter text effect
// =============================================================================

interface UseTypewriterOptions {
  text: string;
  speed?: number;
  delay?: number;
}

export function useTypewriter(options: UseTypewriterOptions) {
  const { text, speed = 50, delay = 0 } = options;
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayText(text);
      setIsComplete(true);
      return;
    }

    setDisplayText('');
    setIsComplete(false);

    const delayTimer = setTimeout(() => {
      let currentIndex = 0;
      
      const typeTimer = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(typeTimer);
          setIsComplete(true);
        }
      }, speed);

      return () => clearInterval(typeTimer);
    }, delay);

    return () => clearTimeout(delayTimer);
  }, [text, speed, delay, prefersReducedMotion]);

  return { displayText, isComplete };
}

// =============================================================================
// useShakeOnError - Shake animation for form errors
// =============================================================================

export function useShakeOnError(hasError: boolean) {
  const controls = useAnimation();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (hasError && !prefersReducedMotion) {
      controls.start({
        x: [-10, 10, -10, 10, 0],
        transition: { duration: 0.4 },
      });
    }
  }, [hasError, controls, prefersReducedMotion]);

  return controls;
}

// =============================================================================
// usePulseOnUpdate - Pulse animation when value changes
// =============================================================================

export function usePulseOnUpdate<T>(value: T) {
  const controls = useAnimation();
  const prevValue = useRef(value);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prevValue.current !== value && !prefersReducedMotion) {
      controls.start({
        scale: [1, 1.1, 1],
        transition: { duration: 0.3 },
      });
    }
    prevValue.current = value;
  }, [value, controls, prefersReducedMotion]);

  return controls;
}

// =============================================================================
// useRipple - Material-style ripple effect
// =============================================================================

interface RippleState {
  x: number;
  y: number;
  size: number;
  id: number;
}

export function useRipple() {
  const [ripples, setRipples] = useState<RippleState[]>([]);
  const nextId = useRef(0);
  const prefersReducedMotion = useReducedMotion();

  const addRipple = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (prefersReducedMotion) return;

    const element = e.currentTarget;
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    
    const ripple: RippleState = {
      x: e.clientX - rect.left - size / 2,
      y: e.clientY - rect.top - size / 2,
      size,
      id: nextId.current++,
    };

    setRipples((prev) => [...prev, ripple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
    }, 600);
  }, [prefersReducedMotion]);

  return { ripples, addRipple };
}

// =============================================================================
// useSequentialAnimation - Run animations in sequence
// =============================================================================

export function useSequentialAnimation() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const start = useCallback((totalSteps: number, stepDuration: number = 0.3) => {
    setIsRunning(true);
    setCurrentStep(0);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= totalSteps) {
        clearInterval(interval);
        setIsRunning(false);
      }
      setCurrentStep(step);
    }, stepDuration * 1000);

    return () => {
      clearInterval(interval);
      setIsRunning(false);
    };
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setIsRunning(false);
  }, []);

  return { currentStep, isRunning, start, reset };
}

// =============================================================================
// useDragConstraints - Boundary constraints for draggable elements
// =============================================================================

export function useDragConstraints() {
  const constraintsRef = useRef(null);
  return constraintsRef;
}

// =============================================================================
// useAnimationState - Manage complex animation states
// =============================================================================

type AnimationState = 'idle' | 'entering' | 'entered' | 'exiting' | 'exited';

export function useAnimationState(isVisible: boolean) {
  const [state, setState] = useState<AnimationState>(isVisible ? 'entered' : 'exited');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (isVisible) {
      // Use setTimeout to schedule state updates
      timerRef.current = setTimeout(() => setState('entering'), 0);
      const enteredTimer = setTimeout(() => setState('entered'), TIMING.normal * 1000);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        clearTimeout(enteredTimer);
      };
    } else {
      timerRef.current = setTimeout(() => setState('exiting'), 0);
      const exitedTimer = setTimeout(() => setState('exited'), TIMING.normal * 1000);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        clearTimeout(exitedTimer);
      };
    }
  }, [isVisible]);

  return {
    state,
    isEntering: state === 'entering',
    isEntered: state === 'entered',
    isExiting: state === 'exiting',
    isExited: state === 'exited',
    shouldRender: state !== 'exited',
  };
}

// =============================================================================
// Exports
// =============================================================================

const animationHooks = {
  useAnimateOnView,
  useStaggerAnimation,
  useCountUp,
  useHover,
  usePress,
  useDelayedRender,
  useScrollProgress,
  useParallax,
  useMousePosition,
  useTilt,
  useTypewriter,
  useShakeOnError,
  usePulseOnUpdate,
  useRipple,
  useSequentialAnimation,
  useDragConstraints,
  useAnimationState,
};

export default animationHooks;
