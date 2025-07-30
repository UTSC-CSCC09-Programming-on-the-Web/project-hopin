import { useEffect, useState } from "react";

export function useIsMobile(breakpoint = 425) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // check if current window size is mobile or not
    const checkMobile = () => setIsMobile(window.innerWidth <= breakpoint);
    checkMobile();
    // when window is resized, check it again
    window.addEventListener("resize", checkMobile); 
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
}
