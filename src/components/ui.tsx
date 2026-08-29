"use client";

import type { ReactNode } from "react";

export function Panel({
  title,
  aside,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`panel flex min-h-0 flex-col ${className}`}>
      {title && (
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5">
          <h2 className="label">{title}</h2>
          {aside}
        </header>
      )}
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function Button({
  children,
  onClick,
  tone = "neutral",
  size = "md",
  disabled,
  title,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "neutral" | "primary" | "danger" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
}) {
  const tones = {
    neutral:
      "border-line bg-ink-700 text-text hover:bg-ink-600 disabled:hover:bg-ink-700",
    primary:
      "border-marker bg-marker text-paper-ink hover:bg-marker/85 disabled:hover:bg-marker",
    danger: "border-stamp-dim bg-stamp/15 text-stamp hover:bg-stamp/25",
    ghost: "border-transparent bg-transparent text-text-dim hover:text-text",
  } as const;
  const sizes = {
    sm: "px-2.5 py-1 text-[0.6875rem]",
    md: "px-3.5 py-1.5 text-xs",
  } as const;
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`border font-display font-semibold uppercase tracking-[0.1em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]} ${sizes[size]}`}
    >
      {children}
    </button>
  );
}

export function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn" | "danger";
}) {
  const colors = {
    default: "text-text",
    warn: "text-marker",
    danger: "text-stamp",
  } as const;
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`mono mt-0.5 text-sm ${colors[tone]}`}>{value}</div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center text-xs text-text-faint">
      {children}
    </div>
  );
}
