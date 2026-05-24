const items = [
  "Hyperlocal",
  "Chat-first",
  "No platform cut",
  "Made in India",
];

export function TrustStrip() {
  return (
    <section className="border-y border-black/5 bg-white py-8">
      <div className="landing-container">
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-medium text-sj-muted">
          {items.map((item, i) => (
            <li key={item} className="flex items-center gap-6">
              <span>{item}</span>
              {i < items.length - 1 && (
                <span
                  className="hidden text-sj-placeholder sm:inline"
                  aria-hidden="true"
                >
                  ·
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
