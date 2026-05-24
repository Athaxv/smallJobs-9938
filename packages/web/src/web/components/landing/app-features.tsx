import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";
import { PhoneMockup } from "./phone-mockup";

const featureRows = [
  {
    label: "AI-powered posting",
    title: "Post with AI",
    desc: "Describe what you need in plain language. SmallJobs structures your request and only asks follow-ups when something is missing.",
    src: "/phone3.jpeg",
    alt: "SmallJobs AI new request screen",
    phoneFirst: true,
  },
  {
    label: "Map-first discovery",
    title: "Explore nearby",
    desc: "See gigs on a live map around you. Filter by category, distance, and urgency — then tap in to help out.",
    src: "/phone4.jpeg",
    alt: "SmallJobs explore map screen",
    phoneFirst: false,
  },
  {
    label: "Community trust",
    title: "Trust built in",
    desc: "Profiles show reliability stats, active tasks, and verification — so you know who you are meeting before you commit.",
    src: "/phone2.jpeg",
    alt: "SmallJobs profile and trust screen",
    phoneFirst: true,
  },
] as const;

function FeatureRow({
  label,
  title,
  desc,
  src,
  alt,
  phoneFirst,
  delay,
  visible,
}: (typeof featureRows)[number] & {
  delay: number;
  visible: boolean;
}) {
  const copy = (
    <div className="max-w-md">
      <p className="text-xs font-semibold uppercase tracking-wider text-sj-placeholder">
        {label}
      </p>
      <h3 className="mt-2 font-serif text-[clamp(1.5rem,3vw,2rem)] leading-tight tracking-tight text-sj-primary">
        {title}
      </h3>
      <p className="mt-3 text-[15px] leading-relaxed text-sj-muted">{desc}</p>
    </div>
  );

  const phone = (
    <div className="flex justify-center">
      <PhoneMockup size="section" src={src} alt={alt} />
    </div>
  );

  return (
    <div
      className={cn(
        "grid items-center gap-10 transition-all duration-500 lg:grid-cols-2 lg:gap-16",
        visible ? "animate-fade-up opacity-100" : "opacity-0",
      )}
      style={{ animationDelay: visible ? `${delay}ms` : undefined }}
    >
      {phoneFirst ? (
        <>
          {phone}
          {copy}
        </>
      ) : (
        <>
          <div className="max-lg:order-2">{copy}</div>
          <div className="max-lg:order-1">{phone}</div>
        </>
      )}
    </div>
  );
}

export function AppFeatures() {
  const { ref, visible } = useInView();

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="landing-container">
        <div className="max-w-2xl">
          <h2 className="font-serif text-[clamp(1.75rem,4vw,2.25rem)] leading-tight tracking-tight text-sj-primary">
            Built for real life
            <br />
            in your neighbourhood.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-sj-muted">
            From posting a gig to finding help on the map — every screen is
            designed to be fast, local, and human.
          </p>
        </div>

        <div ref={ref} className="mt-16 space-y-24 lg:mt-20 lg:space-y-28">
          {featureRows.map((row, i) => (
            <FeatureRow
              key={row.title}
              {...row}
              delay={i * 100}
              visible={visible}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
