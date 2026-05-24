import { useEffect, useState } from "react";
import { DownloadButton } from "./download-button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "landing-container pointer-events-auto relative flex items-center justify-between transition-all duration-300 ease-out",
          scrolled
            ? "mx-auto mt-3 h-14 rounded-2xl border border-black/5 bg-white/80 px-3 shadow-sm backdrop-blur-md sm:px-4"
            : "h-16 bg-transparent lg:h-[72px]",
        )}
      >
        <a
          href="#top"
          className={cn(
            "font-serif tracking-tight text-sj-primary transition-all duration-300",
            scrolled ? "text-lg" : "text-[22px]",
          )}
        >
          SmallJobs
        </a>
        <div
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 transition-opacity duration-300 sm:right-4",
            scrolled
              ? "opacity-100"
              : "pointer-events-none opacity-0",
          )}
        >          <DownloadButton
            compact
            label="Download APK"
            loadingLabel="Starting…"
          />
        </div>
      </div>
    </header>
  );
}
