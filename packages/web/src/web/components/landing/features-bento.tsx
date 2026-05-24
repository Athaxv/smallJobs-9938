import {
  HeartHandshake,
  MapPinned,
  MessagesSquare,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const features: {
  icon: LucideIcon;
  title: string;
  desc: string;
  className?: string;
}[] = [
  {
    icon: MapPinned,
    title: "Hyperlocal by default",
    desc: "Every request is tied to your neighborhood. No spam, no strangers from across the country.",
    className: "md:col-span-1",
  },
  {
    icon: MessagesSquare,
    title: "Chat before you commit",
    desc: "Message anyone who responds to your gig before you agree to anything.",
    className: "md:col-span-1",
  },
  {
    icon: Zap,
    title: "Post in under a minute",
    desc: "Describe what you need, answer a couple of quick questions, and your post is live.",
    className: "md:col-span-1",
  },
  {
    icon: HeartHandshake,
    title: "Paid or just a favour",
    desc: "You decide if it's paid work or a community favour. No platform cut, no hidden fees.",
    className: "md:col-span-1",
  },
];

function FeatureCard({
  icon: Icon,
  title,
  desc,
  delay,
  visible,
  className,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  delay: number;
  visible: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "border-0 transition-all duration-500",
        visible ? "animate-fade-up opacity-100" : "opacity-0",
        className,
      )}
      style={{ animationDelay: visible ? `${delay}ms` : undefined }}
    >
      <CardHeader>
        <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-sj-surface">
          <Icon className="size-5 text-sj-primary" aria-hidden="true" />
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{desc}</CardDescription>
      </CardContent>
    </Card>
  );
}

export function FeaturesBento() {
  const { ref, visible } = useInView();

  return (
    <section className="bg-sj-surface py-20 lg:py-28">
      <div className="landing-container">
        <div className="max-w-2xl">
          <h2 className="font-serif text-[clamp(1.75rem,4vw,2.25rem)] leading-tight tracking-tight text-sj-primary">
            Everything local,
            <br />
            nothing complicated.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-sj-muted">
            SmallJobs connects you with real people nearby for the small stuff
            that actually matters day to day.
          </p>
        </div>

        <div
          ref={ref}
          className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-5"
        >
          {features.map((f, i) => (
            <FeatureCard
              key={f.title}
              icon={f.icon}
              title={f.title}
              desc={f.desc}
              delay={i * 80}
              visible={visible}
              className={f.className}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
