"use client";
import { useEffect, useRef, useState } from "react";

/** State of the transition/progress animation */
type TransitionState = "initial" | "in-progress" | "completing" | "complete";

/** Return value of the useTransitionMount hook */
interface TransitionMountReturn {
  /** Current state of the transition */
  state: TransitionState;
  /** Current progress value (0-100) */
  value: number;
  /** Starts the transition, moving to "in-progress" state */
  start: () => void;
  /** Completes the transition, moving to "completing" state */
  done: () => void;
  /** Resets the transition back to "initial" state */
  reset: () => void;
}

/**
 * A hook that manages a transition/progress state with animated values.
 *
 * @description
 * Provides animated transitions through different states with corresponding
 * numeric values from 0 to 100. Useful for progress bars, loading states,
 * or any UI element that needs staged transitions.
 *
 * @example
 * ```tsx
 * function ProgressBar() {
 *   const { value, state, start, done, reset } = useTransitionMount();
 *
 *   return (
 *     <div>
 *       <div style={{ width: '100%', backgroundColor: '#eee' }}>
 *         <div
 *           style={{
 *             width: `${value}%`,
 *             height: '20px',
 *             backgroundColor: '#007bff',
 *             transition: 'width 0.3s ease-in-out'
 *           }}
 *         />
 *       </div>
 *       <div>State: {state}</div>
 *       <button onClick={start}>Start</button>
 *       <button onClick={done}>Complete</button>
 *       <button onClick={reset}>Reset</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @remarks
 * Progress simulation varies by current value:
 * - At 0%: +15
 * - Below 50%: +1-10 (random)
 * - Above 50%: +1-5 (random)
 * Updates every 750ms in "in-progress" state.
 */
export function useTransitionMount(): TransitionMountReturn {
  const [state, setState] = useState<TransitionState>("initial");
  const [value, setValue] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    if (state === "initial") {
      setValue(0);
    } else if (state === "completing") {
      setValue(100);
    } else if (state === "in-progress") {
      // Simulate progress
      timeoutRef.current = setInterval(() => {
        setValue((prev) => {
          if (prev >= 99) return prev;
          if (prev === 0) return prev + 15;
          if (prev < 50) return prev + rand(1, 10);
          return prev + rand(1, 5);
        });
      }, 750);
    }

    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
    };
  }, [state]);

  useEffect(() => {
    if (value === 100) {
      setState("complete");
    }
  }, [value]);

  function reset() {
    setState("initial");
  }

  function start() {
    setState("in-progress");
  }

  function done() {
    setState((state) =>
      state === "initial" || state === "in-progress" ? "completing" : state,
    );
  }

  return { state, value, start, done, reset };
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
