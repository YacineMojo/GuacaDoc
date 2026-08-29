"use client";

import type { ReactNode } from "react";

export function Panel({
  title,
  icon,
  aside,
  children,
  className = "",
  bodyClassName = "",
  dark = false,
}: {
  title?: string;
  icon?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  dark?: boolean;
}) {
  return (
    <section className={`panel flex min-h-0 flex-col ${dark ? "bg-dark" : ""} ${className}`}>
      {title && (
        <header
          className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5 ${
            dark ? "border-dark-line bg-dark-soft" : "border-line-soft bg-white"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {icon}
            <h2 className={`label ${dark ? "text-dark-dim" : ""}`}>{title}</h2>
          </div>
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
  tone?: "neutral" | "primary" | "stone" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
}) {
  const tones = {
    neutral: "border-line bg-white text-text hover:bg-guac-wash",
    primary: "border-guac-dark bg-guac-dark text-white hover:bg-rind hover:border-rind",
    stone: "border-stone-soft bg-white text-stone hover:bg-stone-soft/40",
    ghost: "border-transparent bg-transparent text-text-faint hover:text-text",
  } as const;
  const sizes = {
    sm: "px-2.5 py-1 text-[0.6875rem]",
    md: "px-3.5 py-2 text-xs",
  } as const;
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[4px] border font-display font-semibold tracking-[0.06em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${tones[tone]} ${sizes[size]}`}
    >
      {children}
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center text-xs leading-relaxed text-text-faint">
      {children}
    </div>
  );
}

export function Field({
  value,
  onChange,
  placeholder,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onEnter?: () => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onEnter?.();
      }}
      placeholder={placeholder}
      className="mono w-full rounded-[4px] border border-line bg-white px-2.5 py-1.5 text-xs text-text placeholder:text-text-faint focus:border-guac focus:outline-none"
    />
  );
}
