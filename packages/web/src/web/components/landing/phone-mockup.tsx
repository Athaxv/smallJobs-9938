function FeedCard({
  category,
  title,
  distance,
  accent,
}: {
  category: string;
  title: string;
  distance: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-black/5 p-3.5 ${
        accent ? "bg-sj-primary text-white" : "bg-white"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
            accent
              ? "bg-white/15 text-white"
              : "bg-sj-surface text-sj-muted"
          }`}
        >
          {category}
        </span>
        <span
          className={`text-[10px] font-medium ${
            accent ? "text-white/70" : "text-sj-placeholder"
          }`}
        >
          {distance}
        </span>
      </div>
      <p
        className={`font-serif text-[15px] leading-snug ${
          accent ? "text-white" : "text-sj-primary"
        }`}
      >
        {title}
      </p>
    </div>
  );
}

export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[300px] lg:max-w-[320px]">
      <div className="absolute -inset-4 rounded-[40px] bg-black/5 blur-2xl" />
      <div className="relative rounded-[36px] border-[6px] border-sj-primary bg-sj-primary p-2 shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
        <div className="overflow-hidden rounded-[28px] bg-sj-surface">
          <div className="flex items-center justify-between px-4 pb-2 pt-3">
            <span className="font-serif text-sm text-sj-primary">SmallJobs</span>
            <div className="h-2 w-10 rounded-full bg-black/10" />
          </div>
          <div className="space-y-2.5 px-3 pb-5 pt-1">
            <FeedCard
              category="Errands"
              title="Need someone to pick up meds from pharmacy"
              distance="0.4 km"
            />
            <FeedCard
              category="Walk buddy"
              title="Evening walk partner near Koramangala 5th Block"
              distance="0.8 km"
              accent
            />
            <FeedCard
              category="Borrow"
              title="USB-C charger for a couple hours"
              distance="1.2 km"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
