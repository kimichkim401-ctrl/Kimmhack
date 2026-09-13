import type { Availability } from "@/components/types";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan/75">{children}</p>;
}

export function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const tones = {
    neutral: "border-white/[0.12] bg-white/[0.04] text-frost",
    good: "border-cyan/30 bg-cyan/10 text-cyan",
    warn: "border-amber/30 bg-amber/10 text-amber",
    bad: "border-red-300/30 bg-red-400/10 text-red-200"
  };

  return (
    <span className={`inline-flex h-7 items-center border px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function ActionButton({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button"
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
}) {
  const variants = {
    primary: "border-cyan/[0.35] bg-cyan/[0.12] text-signal hover:bg-cyan/[0.18]",
    secondary: "border-white/[0.12] bg-white/[0.035] text-frost hover:bg-white/[0.07]",
    danger: "border-red-300/30 bg-red-500/10 text-red-100 hover:bg-red-500/15"
  };

  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center border px-4 font-mono text-[11px] uppercase tracking-[0.18em] transition ${variants[variant]} disabled:cursor-not-allowed disabled:opacity-45`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

export function DataRow({ label, value, availability }: { label: string; value?: React.ReactNode; availability?: Availability }) {
  const shown = value ?? availability ?? "UNAVAILABLE";

  return (
    <div className="grid grid-cols-[minmax(110px,0.7fr)_1fr] gap-4 border-t border-white/[0.08] py-3 first:border-t-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className="min-w-0 break-words font-mono text-xs text-frost">{shown}</div>
    </div>
  );
}

export function Panel({
  children,
  className = "",
  id
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`panel ${className}`}>
      {children}
    </section>
  );
}
