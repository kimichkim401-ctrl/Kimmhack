import { Eyebrow, Panel, StatusPill } from "@/components/ui";
import Link from "next/link";

const content = {
  about: {
    eyebrow: "Profile Record",
    title: "WHO IS KIM?",
    status: "IDENTITY",
    copy: "KIM is a private digital identity shaped around technical taste, careful systems, and cinematic restraint. The public surface reveals enough to invite curiosity; the deeper archive remains controlled.",
    records: [
      ["ORIGIN", "Personal technology environment"],
      ["METHOD", "Build quietly, verify reality, avoid empty spectacle"],
      ["SIGNATURE", "Privacy-aware interfaces with precise interaction design"]
    ]
  },
  projects: {
    eyebrow: "Project Index",
    title: "PROJECTS",
    status: "ACTIVE",
    copy: "Selected systems and experiments appear as records rather than portfolio cards: products, prototypes, digital instruments, and practical research interfaces.",
    records: [
      ["KIM VAULT", "Private storage for explicit visitor submissions"],
      ["DEVICE PROFILE", "A browser reality layer that labels every source and limitation"],
      ["PERMISSION SEQUENCE", "A cinematic onboarding flow built on native browser prompts"]
    ]
  },
  research: {
    eyebrow: "Research Layer",
    title: "RESEARCH",
    status: "OBSERVING",
    copy: "KIM studies what browsers can expose, what they must request, and what ethical systems should refuse to collect.",
    records: [
      ["BROWSER CAPABILITY", "Mapping supported APIs without covert fingerprinting"],
      ["MEDIA CONSENT", "Separating camera access, recording, preview, and upload"],
      ["NETWORK CONTEXT", "Distinguishing IP-based approximation from precise user-granted location"]
    ]
  },
  contact: {
    eyebrow: "Narrow Channel",
    title: "CONTACT",
    status: "OPEN",
    copy: "For collaborators, researchers, and builders who prefer systems with atmosphere, discipline, and clear privacy boundaries.",
    records: [
      ["SIGNAL", "owner@example.com"],
      ["MODE", "Technical collaborations and private product systems"],
      ["BOUNDARY", "No credential collection, hidden tracking, or permission bypass requests"]
    ]
  }
};

export default function KimStaticPage({ page }: { page: keyof typeof content }) {
  const current = content[page];

  return (
    <main className="kim-noise kim-scan min-h-screen bg-radialNoise px-4 py-6 text-frost sm:px-6 lg:px-8">
      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <Link className="font-mono text-xs uppercase tracking-[0.38em] text-signal" href="/">
            KIM
          </Link>
          <nav className="hidden gap-5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted sm:flex">
            <Link href="/about">Profile</Link>
            <Link href="/projects">Projects</Link>
            <Link href="/research">Research</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </header>
        <section className="grid min-h-[calc(100vh-88px)] items-center gap-6 py-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Eyebrow>{current.eyebrow}</Eyebrow>
            <h1 className="mt-5 text-5xl font-medium text-signal sm:text-7xl lg:text-8xl">{current.title}</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-frost/72">{current.copy}</p>
          </div>
          <Panel className="p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <Eyebrow>KIM Archive</Eyebrow>
              <StatusPill tone="good">{current.status}</StatusPill>
            </div>
            <div className="mt-8 space-y-3">
              {current.records.map(([label, value]) => (
                <div className="border border-white/10 bg-white/[0.025] p-4" key={label}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan/80">{label}</div>
                  <div className="mt-3 text-sm leading-6 text-frost/72">{value}</div>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}
