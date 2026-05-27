import { DownloadButton } from "./download-button";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-black/5">
      {/* Background layers */}
      <div
        className="footer-surface pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div
        className="footer-top-fade pointer-events-none absolute inset-x-0 top-0 h-12"
        aria-hidden="true"
      />
      <div
        className="footer-dot-grid pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
      />
      <div
        className="footer-dot-grid-fine pointer-events-none absolute inset-x-0 bottom-0 h-[60%] opacity-55"
        aria-hidden="true"
      />

      {/* Band A — Content */}
      <div className="landing-container relative z-10 flex min-h-[180px] flex-col gap-8 py-12 sm:flex-row sm:items-end sm:justify-between lg:min-h-[200px] lg:py-14">
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

        <div className="flex flex-col items-start gap-4 sm:items-end">
          <DownloadButton compact label="Download APK" loadingLabel="Starting…" />
          <p className="text-sm text-sj-placeholder">© 2026 SmallJobs</p>
        </div>
      </div>

      {/* Band B — Dotted divider */}
      <div className="relative z-10 px-6 lg:px-8">
        <div className="landing-container">
          <div className="footer-divider-dotted w-full" aria-hidden="true" />
        </div>
      </div>

      {/* Band C — Watermark */}
      <div className="relative z-10 h-[clamp(7rem,20vw,12rem)] overflow-hidden">
        <p
          className="footer-watermark animate-footer-watermark"
          aria-hidden="true"
        >
          SmallJobs
        </p>
      </div>
    </footer>
  );
}
