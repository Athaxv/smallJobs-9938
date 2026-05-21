import { useEffect, useRef, useState } from "react";

const APK_URL = "/smalljobs.apk"; // place your APK at packages/web/public/smalljobs.apk

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function FeatureCard({ icon, title, desc, delay }: { icon: string; title: string; desc: string; delay: number }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      style={{
        background: "rgba(255,255,255,0.92)",
        borderRadius: 20,
        padding: "24px 24px 22px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: 17, fontWeight: 600, color: "#111", marginBottom: 6 }}>{title}</div>
      <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 14, color: "#6B6B6B", lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

function Index() {
  const [downloading, setDownloading] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    // slight delay so animation triggers after mount
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleDownload = () => {
    setDownloading(true);
    const a = document.createElement("a");
    a.href = APK_URL;
    a.download = "SmallJobs.apk";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setDownloading(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", background: "#f9f9f9" }}>

      {/* ── HERO ── */}
      <div
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          overflow: "hidden",
        }}
      >
        {/* Background image */}
        <div
          style={{
            position: "absolute", inset: 0,
            backgroundImage: "url(/bg-onboarding.png)",
            backgroundSize: "cover",
            backgroundPosition: "center top",
            backgroundRepeat: "no-repeat",
          }}
        />
        {/* Gradient overlay — bottom fade for card */}
        <div
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.18) 60%, rgba(0,0,0,0.04) 100%)",
          }}
        />

        {/* Logo pill — top left */}
        <div
          ref={heroRef}
          style={{
            position: "absolute", top: 32, left: 28,
            transition: "opacity 0.6s ease, transform 0.6s ease",
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? "translateY(0)" : "translateY(-20px)",
          }}
        >
          <span style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize: 22,
            fontWeight: 400,
            color: "#111",
            letterSpacing: -0.3,
          }}>
            SmallJobs
          </span>
        </div>

        {/* Bottom card */}
        <div
          style={{
            position: "relative",
            background: "#fff",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: "36px 32px 52px",
            boxShadow: "0 -4px 32px rgba(0,0,0,0.08)",
            maxWidth: 480,
            width: "100%",
            margin: "0 auto",
            transition: "opacity 0.55s ease 120ms, transform 0.55s ease 120ms",
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? "translateY(0)" : "translateY(48px)",
          }}
        >
          <h1 style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize: "clamp(36px, 8vw, 48px)",
            fontWeight: 400,
            color: "#111",
            lineHeight: 1.15,
            margin: "0 0 12px",
            letterSpacing: -0.5,
          }}>
            Find work{"\n"}near you
          </h1>
          <p style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 15,
            color: "#6B6B6B",
            lineHeight: 1.65,
            margin: "0 0 32px",
          }}>
            Post gigs, discover local opportunities,<br />and connect with your community.
          </p>

          {/* Download APK button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              width: "100%",
              background: downloading ? "#444" : "#111",
              color: "#fff",
              border: "none",
              borderRadius: 16,
              padding: "18px 24px",
              fontSize: 16,
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 600,
              cursor: downloading ? "default" : "pointer",
              transition: "background 0.2s, transform 0.15s",
              transform: "scale(1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 14,
            }}
            onMouseEnter={e => { if (!downloading) (e.currentTarget as HTMLButtonElement).style.background = "#222"; }}
            onMouseLeave={e => { if (!downloading) (e.currentTarget as HTMLButtonElement).style.background = "#111"; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {downloading ? "Starting download…" : "Download for Android"}
          </button>

          <p style={{ textAlign: "center", fontSize: 12, color: "#ADADAD", margin: 0 }}>
            Android APK · Free · No sign-in required to install
          </p>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div style={{ background: "#F5F5F5", padding: "64px 24px 80px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize: "clamp(26px, 6vw, 34px)",
            fontWeight: 400,
            color: "#111",
            marginBottom: 8,
            letterSpacing: -0.3,
          }}>
            Everything local,<br />nothing complicated.
          </h2>
          <p style={{ fontSize: 14, color: "#6B6B6B", lineHeight: 1.65, marginBottom: 40 }}>
            SmallJobs connects you with real people nearby for the small stuff that actually matters day to day.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <FeatureCard
              icon="📍"
              title="Hyperlocal by default"
              desc="Every request is tied to your neighborhood. No spam, no strangers from across the country."
              delay={0}
            />
            <FeatureCard
              icon="💬"
              title="Chat before you commit"
              desc="Message anyone who responds to your gig before you agree to anything."
              delay={80}
            />
            <FeatureCard
              icon="⚡️"
              title="Post in under a minute"
              desc="Describe what you need, answer a couple of quick questions, and your post is live."
              delay={160}
            />
            <FeatureCard
              icon="🤝"
              title="Paid or just a favour"
              desc="You decide if it's paid work or a community favour. No platform cut, no hidden fees."
              delay={240}
            />
          </div>
        </div>
      </div>

      {/* ── CTA BOTTOM ── */}
      <div
        style={{
          background: "#111",
          padding: "60px 24px 72px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 400, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize: "clamp(26px, 6vw, 34px)",
            fontWeight: 400,
            color: "#fff",
            marginBottom: 12,
            letterSpacing: -0.3,
          }}>
            Ready to find help<br />around the corner?
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 36, lineHeight: 1.65 }}>
            Download the app and start posting or browsing gigs near you right now.
          </p>

          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              background: "#fff",
              color: "#111",
              border: "none",
              borderRadius: 16,
              padding: "18px 40px",
              fontSize: 16,
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 600,
              cursor: downloading ? "default" : "pointer",
              transition: "opacity 0.2s",
              opacity: downloading ? 0.6 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {downloading ? "Starting…" : "Download APK"}
          </button>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: "#0a0a0a", padding: "20px 24px", textAlign: "center" }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", fontFamily: "system-ui, -apple-system, sans-serif" }}>
          © 2026 SmallJobs · Made in India
        </span>
      </div>

    </div>
  );
}

export default Index;
