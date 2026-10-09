import * as React from "react";

// Keep equal to `--breakpoint-sidebar` in src/common/styles/globals.css. The
// layout is driven by that media query, so the first paint is correct without
// this hook. Use the hook only where JavaScript needs the boolean.
const MOBILE_BREAKPOINT = 1250;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-once matchMedia sync (converges: same value bails out); useSyncExternalStore is not an option, this hook is imported through a barrel into server components
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
