import { useEffect, useState } from "react";
import { DownloadButton } from "./download-button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-black/5 bg-white/70 backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <div className="landing-container flex h-16 items-center justify-between lg:h-[72px]">
        <a
          href="#top"
          className="font-serif text-[22px] tracking-tight text-sj-primary"
        >
          SmallJobs
        </a>
        <DownloadButton
          label="Download APK"
          loadingLabel="Starting…"
          className="rounded-xl px-4 py-2.5 text-sm"
        />
      </div>
    </header>
  );
}
