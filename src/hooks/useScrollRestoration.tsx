import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Persist scroll Y per pathname so that navigating away & back (or returning to the tab)
// restores the user's position instead of jumping to top.
const KEY = "nexus:scroll";

function readMap(): Record<string, number> {
  try { return JSON.parse(sessionStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function writeMap(m: Record<string, number>) {
  try { sessionStorage.setItem(KEY, JSON.stringify(m)); } catch {}
}

export default function ScrollRestoration() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  // Save scroll continuously while on this route
  useEffect(() => {
    const onScroll = () => {
      const m = readMap();
      m[pathname] = window.scrollY;
      writeMap(m);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("beforeunload", onScroll);
    return () => {
      onScroll();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("beforeunload", onScroll);
    };
  }, [pathname]);

  // Restore on route change
  useEffect(() => {
    const m = readMap();
    const y = m[pathname] ?? 0;
    // Defer to next frame so the new page has rendered
    requestAnimationFrame(() => window.scrollTo({ top: y, left: 0, behavior: "auto" }));
  }, [pathname, navType]);

  return null;
}
