import { ArrowRight, Handshake, MapPin, MessageCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

const steps: {
  icon: LucideIcon;
  step: string;
  title: string;
  desc: string;
}[] = [
  {
    icon: MapPin,
    step: "01",
    title: "Post a gig nearby",
    desc: "Describe what you need — errands, favours, or paid work tied to your neighbourhood.",
  },
  {
    icon: MessageCircle,
    step: "02",
    title: "Chat with responders",
    desc: "Message anyone who replies before you agree to anything. No surprises.",
  },
  {
    icon: Handshake,
    step: "03",
    title: "Get it done",
    desc: "Paid or just a favour — you decide. No platform cut, no hidden fees.",
  },
];

function StepCard({
  icon: Icon,
  step,
  title,
  desc,
  delay,
  visible,
  isLast,
}: (typeof steps)[number] & {
  delay: number;
  visible: boolean;
  isLast: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col transition-all duration-500",
        visible ? "animate-fade-up opacity-100" : "opacity-0",
      )}
      style={{ animationDelay: visible ? `${delay}ms` : undefined }}
    >
      {/* Desktop timeline node */}
      <div className="mb-6 hidden items-center md:flex">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sj-primary font-serif text-sm text-white">
          {step}
        </div>
        {!isLast && (
          <div className="ml-3 flex flex-1 items-center gap-2">
            <div className="h-px flex-1 bg-black/10" aria-hidden="true" />
            <ArrowRight
              className="size-4 shrink-0 text-sj-placeholder"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      {/* Mobile timeline rail */}
      <div className="mb-5 flex items-center gap-3 md:hidden">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sj-primary font-serif text-xs text-white">
          {step}
        </div>
        <div className="h-px flex-1 bg-black/10" aria-hidden="true" />
      </div>

      <article className="flex h-full flex-col rounded-3xl border border-black/5 bg-white p-7 shadow-[0_2px_24px_rgba(0,0,0,0.04)] lg:p-8">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-sj-surface">
          <Icon className="size-6 text-sj-primary" aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-sj-placeholder">
          Step {Number(step)}
        </p>
        <h3 className="mt-2 font-serif text-xl leading-snug text-sj-primary lg:text-[1.35rem]">
          {title}
        </h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-sj-muted">
          {desc}
        </p>
      </article>
    </div>
  );
}

export function HowItWorks() {
  const { ref, visible } = useInView();

  return (
    <section className="bg-sj-surface py-20 lg:py-28">
      <div className="landing-container">
        <div className="mx-auto max-w-2xl text-center md:mx-0 md:text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-sj-placeholder">
            Simple process
          </p>
          <h2 className="mt-2 font-serif text-[clamp(1.75rem,4vw,2.25rem)] leading-tight tracking-tight text-sj-primary">
            How it works
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-sj-muted">
            Three simple steps to find help — or offer it — around the corner.
          </p>
        </div>

        <div
          ref={ref}
          className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6 lg:mt-16 lg:gap-8"
        >
          {steps.map((step, i) => (
            <StepCard
              key={step.title}
              {...step}
              delay={i * 100}
              visible={visible}
              isLast={i === steps.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
