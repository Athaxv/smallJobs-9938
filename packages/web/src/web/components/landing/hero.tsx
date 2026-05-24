import { DownloadButton } from "./download-button";
import { PhoneMockup } from "./phone-mockup";

export function Hero() {
  return (
    <section
      id="top"
      className="relative min-h-[100svh] overflow-hidden bg-sj-surface lg:h-svh lg:max-h-svh"
    >
      {/* Mobile: full-bleed background */}
      <div
        className="absolute inset-0 bg-[url('/bg-onboarding.png')] bg-cover bg-top bg-no-repeat lg:hidden"
        aria-hidden="true"
      />

      {/* Desktop: left panel — bottom-anchored cover (flowers visible) */}
      <div
        className="absolute inset-y-0 left-0 hidden w-[60%] bg-[url('/bg-onboarding.png')] bg-cover bg-left-bottom bg-no-repeat lg:block"
        aria-hidden="true"
      />

      {/* Desktop: right panel fill */}
      <div
        className="absolute inset-y-0 right-0 hidden w-[40%] bg-white lg:block"
        aria-hidden="true"
      />

      {/* Mobile gradient overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/[0.04] lg:hidden"
        aria-hidden="true"
      />

      <div className="relative flex h-full min-h-[100svh] flex-col justify-end pt-16 lg:min-h-0 lg:justify-center lg:pt-[72px]">
        {/* Desktop layout */}
        <div className="relative hidden h-full w-full lg:block">
          <div className="landing-container grid h-full grid-cols-[3fr_2fr] items-center gap-12 py-0">
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
          </div>

          <div className="animate-hero-logo absolute inset-y-0 right-0 flex w-[40%] items-center justify-center">
            <PhoneMockup
              size="hero"
              alt="SmallJobs app feed screen"
            />
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
