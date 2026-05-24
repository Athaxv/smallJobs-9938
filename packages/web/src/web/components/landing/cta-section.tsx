import { DownloadButton } from "./download-button";

export function CtaSection() {
  return (
    <section className="bg-sj-primary px-6 py-16 text-center lg:py-20">
      <div className="mx-auto max-w-lg">
        <h2 className="font-serif text-[clamp(1.75rem,4vw,2.25rem)] leading-tight tracking-tight text-white">
          Ready to find help
          <br />
          around the corner?
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-white/50">
          Download the app and start posting or browsing gigs near you right
          now.
        </p>
        <div className="mt-9 flex justify-center">
          <DownloadButton
            variant="inverse"
            label="Download APK"
            loadingLabel="Starting…"
          />
        </div>
      </div>
    </section>
  );
}
