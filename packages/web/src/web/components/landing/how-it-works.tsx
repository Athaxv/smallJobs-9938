import { Handshake, MapPin, MessageCircle } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: MapPin,
    title: "Post a gig nearby",
    desc: "Describe what you need — errands, favours, or paid work tied to your neighbourhood.",
  },
  {
    icon: MessageCircle,
    title: "Chat with responders",
    desc: "Message anyone who replies before you agree to anything. No surprises.",
  },
  {
    icon: Handshake,
    title: "Get it done",
    desc: "Paid or just a favour — you decide. No platform cut, no hidden fees.",
  },
];

export function HowItWorks() {
  const { ref, visible } = useInView();

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="landing-container">
        <div className="max-w-2xl">
          <h2 className="font-serif text-[clamp(1.75rem,4vw,2.25rem)] leading-tight tracking-tight text-sj-primary">
            How it works
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-sj-muted">
            Three simple steps to find help — or offer it — around the corner.
          </p>
        </div>

        <div
          ref={ref}
          className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6 lg:gap-10"
        >
          {steps.map((step, i) => (
            <div
              key={step.title}
              className={cn(
                "relative transition-all duration-500",
                visible ? "animate-fade-up opacity-100" : "opacity-0",
              )}
              style={{ animationDelay: visible ? `${i * 80}ms` : undefined }}
            >
              {i < steps.length - 1 && (
                <div
                  className="absolute left-[27px] top-14 hidden h-px w-[calc(100%+1.5rem)] bg-black/8 md:block lg:w-[calc(100%+2.5rem)]"
                  aria-hidden="true"
                />
              )}
              <div className="flex size-14 items-center justify-center rounded-2xl bg-sj-surface">
                <step.icon className="size-6 text-sj-primary" aria-hidden="true" />
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-sj-placeholder">
                Step {i + 1}
              </p>
              <h3 className="mt-2 font-serif text-xl text-sj-primary">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-sj-muted">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
