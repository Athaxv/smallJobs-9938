import { DownloadButton } from "./download-button";
import { PhoneMockup } from "./phone-mockup";

export function Hero() {
  return (
    <section
      id="top"
      className="relative min-h-[100svh] overflow-hidden bg-sj-surface"
    >
      {/* Background image — mobile full bleed; desktop left-side accent */}
      <div
        className="absolute inset-0 bg-[url('/bg-onboarding.png')] bg-cover bg-top bg-no-repeat lg:bg-[length:55%_auto] lg:bg-left-top"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/[0.04] lg:bg-gradient-to-r lg:from-transparent lg:via-white/20 lg:to-white"
        aria-hidden="true"
      />

      <div className="relative flex min-h-[100svh] flex-col justify-end pt-16 lg:justify-center lg:pt-[72px]">
        {/* Desktop layout */}
        <div className="landing-container hidden lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-20">
          <div className="animate-hero-card max-w-xl">
            <h1 className="font-serif text-[clamp(2.5rem,4vw,3.5rem)] leading-[1.12] tracking-tight text-sj-primary">
              Find work
              <br />
              near you
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-sj-muted">
              Post gigs, discover local opportunities, and connect with your
              community.
            </p>
            <div className="animate-hero-btn mt-8 flex flex-col items-start gap-3">
              <DownloadButton className="w-full max-w-sm" />
              <p className="text-xs text-sj-placeholder">
                Android APK · Free · No sign-in required to install
              </p>
            </div>
          </div>
          <div className="animate-hero-logo flex justify-center lg:justify-end">
            <PhoneMockup />
          </div>
        </div>

        {/* Mobile layout — bottom sheet card */}
        <div className="lg:hidden">
          <div className="animate-hero-card relative mx-auto w-full max-w-lg rounded-t-[28px] bg-white px-7 pb-12 pt-9 shadow-[0_-4px_32px_rgba(0,0,0,0.08)]">
            <h1 className="font-serif text-[clamp(2.25rem,8vw,3rem)] leading-[1.15] tracking-tight text-sj-primary">
              Find work
              <br />
              near you
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-sj-muted">
              Post gigs, discover local opportunities,
              <br />
              and connect with your community.
            </p>
            <div className="animate-hero-btn mt-8">
              <DownloadButton className="w-full" />
              <p className="mt-3.5 text-center text-xs text-sj-placeholder">
                Android APK · Free · No sign-in required to install
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
