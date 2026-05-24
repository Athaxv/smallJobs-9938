export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-black/5 bg-white">
      {/* Dotted background layers */}
      <div
        className="footer-dot-grid pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden="true"
      />
      <div
        className="footer-dot-grid-fine pointer-events-none absolute inset-x-0 bottom-0 h-[55%] opacity-50"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[repeating-linear-gradient(90deg,rgba(17,17,17,0.12)_0,rgba(17,17,17,0.12)_4px,transparent_4px,transparent_10px)]"
        aria-hidden="true"
      />

      <div className="landing-container relative z-10 flex flex-col gap-8 py-12 sm:flex-row sm:items-end sm:justify-between lg:py-14">
        <div>
          <a
            href="#top"
            className="font-serif text-2xl tracking-tight text-sj-primary transition-opacity hover:opacity-70"
          >
            SmallJobs
          </a>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-sj-muted">
            Hyperlocal gigs, favours, and paid work — right around the corner.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <a
            href="/smalljobs.apk"
            className="text-sm font-medium text-sj-primary underline decoration-dotted underline-offset-4 transition-opacity hover:opacity-70"
          >
            Download APK
          </a>
          <p className="text-sm text-sj-placeholder">© 2026 SmallJobs</p>
        </div>
      </div>

      <div className="relative z-10 border-t border-dotted border-black/10">
        <div className="overflow-hidden pb-0 pt-4">
          <p
            className="pointer-events-none translate-y-[18%] select-none text-center font-serif text-[clamp(4.5rem,20vw,11rem)] leading-none tracking-tight text-transparent"
            style={{
              WebkitTextStroke: "1px rgba(17,17,17,0.1)",
              paintOrder: "stroke fill",
            }}
            aria-hidden="true"
          >
            SmallJobs
          </p>
        </div>
      </div>
    </footer>
  );
}
