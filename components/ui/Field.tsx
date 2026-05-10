"use client";

import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type LabelProps = {
  label?: string;
  hint?: string;
  required?: boolean;
};

export function Field({
  label,
  hint,
  required,
  className,
  children,
}: LabelProps & { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col", className)}>
      {label ? (
        <label className="label">
          {label}
          {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
        </label>
      ) : null}
      {children}
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function TextInput(
  props: InputHTMLAttributes<HTMLInputElement> & LabelProps,
) {
  const { label, hint, required, className, ...rest } = props;
  return (
    <Field label={label} hint={hint} required={required}>
      <input {...rest} className={cn("input-base", className)} />
    </Field>
  );
}

export function TextArea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement> & LabelProps,
) {
  const { label, hint, required, className, ...rest } = props;
  return (
    <Field label={label} hint={hint} required={required}>
      <textarea {...rest} className={cn("input-base min-h-[88px] resize-y", className)} />
    </Field>
  );
}

export function SelectInput(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & LabelProps,
) {
  const { label, hint, required, className, children, ...rest } = props;
  return (
    <Field label={label} hint={hint} required={required}>
      <select {...rest} className={cn("input-base", className)}>
        {children}
      </select>
    </Field>
  );
}
