import { useEffect, useRef, useState } from "react";

export function useMobileViewport() {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [visualViewportHeight, setVisualViewportHeight] = useState<number>(0);
  const headerRef = useRef<HTMLDivElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    // Check on mount
    checkMobile();

    // Listen for resize events
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Use VisualViewport API to handle keyboard and keep header visible (mobile only)
  useEffect(() => {
    if (!isMobile) return;

    // Check if VisualViewport API is supported
    if (!window.visualViewport) {
      // Fallback: use window height
      const updateHeight = () => {
        setVisualViewportHeight(window.innerHeight);
      };
      updateHeight();
      window.addEventListener("resize", updateHeight);
      return () => window.removeEventListener("resize", updateHeight);
    }

    const viewport = window.visualViewport;

    const updateViewport = () => {
      // Update container height to match visual viewport
      setVisualViewportHeight(viewport.height);

      // Ensure header stays at top of visual viewport
      // Use offsetTop to position header relative to visual viewport
      if (headerRef.current) {
        const offsetTop = viewport.offsetTop;
        headerRef.current.style.transform = `translateY(${offsetTop}px)`;
      }
    };

    // Initial update
    updateViewport();

    // Listen to visual viewport changes (keyboard open/close, zoom, etc.)
    viewport.addEventListener("resize", updateViewport);
    viewport.addEventListener("scroll", updateViewport);

    return () => {
      viewport.removeEventListener("resize", updateViewport);
      viewport.removeEventListener("scroll", updateViewport);
    };
  }, [isMobile]);

  return {
    isMobile,
    visualViewportHeight,
    headerRef,
  };
}
