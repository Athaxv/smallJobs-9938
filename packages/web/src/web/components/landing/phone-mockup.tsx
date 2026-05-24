import { cn } from "@/lib/utils";

type PhoneMockupProps = {
  src?: string;
  alt: string;
  size?: "hero" | "section";
  className?: string;
};

const sizeClasses = {
  hero: "max-w-[280px] max-h-[min(640px,calc(100svh-6rem))] lg:max-w-[300px]",
  section: "max-w-[220px] max-h-[520px] sm:max-w-[240px]",
};

export function PhoneMockup({
  src = "/phone1.jpeg",
  alt,
  size = "hero",
  className,
}: PhoneMockupProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full",
        sizeClasses[size],
        className,
      )}
    >
      <div
        className="absolute -inset-6 rounded-[4rem] bg-black/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex max-h-[inherit] aspect-[9/19.5] w-full flex-col rounded-[3rem] bg-zinc-950 p-[10px] shadow-[0_32px_80px_rgba(0,0,0,0.28)] ring-1 ring-white/10">
        <div
          className="absolute left-[-2px] top-[88px] h-8 w-[3px] rounded-l-sm bg-zinc-700"
          aria-hidden="true"
        />
        <div
          className="absolute left-[-2px] top-[132px] h-12 w-[3px] rounded-l-sm bg-zinc-700"
          aria-hidden="true"
        />
        <div
          className="absolute left-[-2px] top-[188px] h-12 w-[3px] rounded-l-sm bg-zinc-700"
          aria-hidden="true"
        />
        <div
          className="absolute right-[-2px] top-[148px] h-16 w-[3px] rounded-r-sm bg-zinc-700"
          aria-hidden="true"
        />

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[2.4rem] bg-black">
          <div
            className="pointer-events-none absolute left-1/2 top-3 z-10 h-[26px] w-[100px] -translate-x-1/2 rounded-full bg-black"
            aria-hidden="true"
          />
          <img
            src={src}
            alt={alt}
            className="block h-full w-full rounded-[2.4rem] object-cover object-top"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
