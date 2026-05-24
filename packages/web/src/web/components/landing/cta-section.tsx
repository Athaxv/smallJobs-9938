import { DownloadButton } from "./download-button";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden px-6 py-16 text-center lg:py-20">
      <div
        className="absolute inset-0 bg-[url('/bg-onboarding.png')] bg-[length:100%_auto] bg-top bg-no-repeat"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-sky-100/10 via-transparent to-white/40"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-lg">
        <h2 className="font-serif text-[clamp(1.75rem,4vw,2.25rem)] leading-tight tracking-tight text-sj-primary">
          Ready to find help
          <br />
          around the corner?
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-sj-muted">
          Download the app and start posting or browsing gigs near you right
          now.
        </p>
        <div className="mt-9 flex justify-center">
          <DownloadButton label="Download APK" loadingLabel="Starting…" />
        </div>
      </div>
    </section>
  );
}
