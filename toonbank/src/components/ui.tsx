import Link from "next/link";

type Children = { children: React.ReactNode; className?: string };

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({ children, className }: Children) {
  return (
    <div className={cx("rounded-xl border border-ink-200 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action, description }: { title: string; action?: React.ReactNode; description?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4">
      <div>
        <h2 className="font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, action, back }: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-block text-sm text-ink-500 hover:text-ink-900">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
          {description && <p className="mt-1 text-ink-500">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";

export const buttonStyles = {
  primary: cx(buttonBase, "bg-ink-900 text-white hover:bg-ink-700"),
  brand: cx(buttonBase, "bg-brand-600 text-white hover:bg-brand-700"),
  secondary: cx(buttonBase, "border border-ink-200 bg-white text-ink-800 hover:bg-ink-50"),
  danger: cx(buttonBase, "border border-red-200 bg-white text-red-700 hover:bg-red-50"),
  ghost: cx(buttonBase, "text-ink-600 hover:bg-ink-100 hover:text-ink-900"),
};

export function ButtonLink({ href, children, variant = "primary", className }: Children & {
  href: string;
  variant?: keyof typeof buttonStyles;
}) {
  return (
    <Link href={href} className={cx(buttonStyles[variant], className)}>
      {children}
    </Link>
  );
}

export function Field({ label, hint, children, className }: Children & { label: string; hint?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-sm font-medium text-ink-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "block w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 shadow-xs outline-none transition placeholder:text-ink-400 focus:border-ink-500 focus:ring-2 focus:ring-ink-200";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputClass, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={cx(inputClass, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputClass, "pr-8", props.className)} />;
}

const badgeTones = {
  gray: "bg-ink-100 text-ink-700",
  green: "bg-brand-50 text-brand-700 ring-brand-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
};

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: keyof typeof badgeTones }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-transparent ring-inset", badgeTones[tone])}>
      {children}
    </span>
  );
}

export function orderStatusTone(status: string): keyof typeof badgeTones {
  return status === "paid" ? "green" : status === "pending" ? "amber" : status === "refunded" ? "blue" : "red";
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-medium text-ink-900">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Notice({ children, tone = "amber" }: { children: React.ReactNode; tone?: "amber" | "green" | "red" | "gray" }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    green: "border-brand-200 bg-brand-50 text-brand-800",
    red: "border-red-200 bg-red-50 text-red-800",
    gray: "border-ink-200 bg-ink-50 text-ink-700",
  };
  return <div className={cx("rounded-lg border px-4 py-3 text-sm", tones[tone])}>{children}</div>;
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export const th = "px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-ink-500";
export const td = "px-5 py-3 border-t border-ink-100";
