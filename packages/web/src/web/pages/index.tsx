import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { AppFeatures } from "@/components/landing/app-features";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

function Index() {
  return (
    <div className="min-h-screen bg-sj-surface font-sans">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <AppFeatures />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}

export default Index;
