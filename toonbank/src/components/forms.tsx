"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { buttonStyles, cx } from "@/components/ui";

export type FormState = { error?: string; ok?: string } | null;
export type FormAction = (prev: FormState, data: FormData) => Promise<FormState>;

/** Formulier op een server action, met foutmelding en een bezig-knop. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: FormAction;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {state?.error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}
      {state?.ok && (
        <div role="status" className="mb-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          {state.ok}
        </div>
      )}
      {children}
    </form>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  className,
  pendingText = "Bezig…",
  style,
}: {
  children: React.ReactNode;
  variant?: keyof typeof buttonStyles;
  className?: string;
  pendingText?: string;
  style?: React.CSSProperties;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cx(buttonStyles[variant], className)} style={style}>
      {pending ? pendingText : children}
    </button>
  );
}

/** Knop die eerst om bevestiging vraagt (voor verwijderen en dergelijke). */
export function ConfirmButton({
  children,
  message,
  variant = "danger",
  className,
}: {
  children: React.ReactNode;
  message: string;
  variant?: keyof typeof buttonStyles;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cx(buttonStyles[variant], className)}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {pending ? "Bezig…" : children}
    </button>
  );
}
