/*
  Form primitives for dark surfaces. Presentational only — no state, so they
  work in server and client components alike. Controlled usage is the caller's
  concern.

  Replaces the global `.field-input` class; error styling routes through the
  shared status ramp so a form error looks the same on checkout, account and
  admin.
*/

const inputBase =
  "w-full h-12 px-4 text-[15px] text-fg placeholder:text-fg-subtle outline-none " +
  "bg-[var(--field-bg)] border transition-colors duration-200 " +
  "focus:border-[var(--field-border-focus)]";

const borderFor = (error?: boolean) =>
  error ? "border-[var(--danger)]" : "border-[var(--field-border)]";

const radius = { borderRadius: "var(--radius-card)" };

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className = "",
}: {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="block text-[12px] font-medium uppercase tracking-[0.12em] text-fg-muted mb-2">
          {label}
          {required && <span className="text-[var(--danger)] ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-2 text-[13px] text-[var(--danger)]" role="alert">{error}</p>
      ) : hint ? (
        <p className="mt-2 text-[13px] text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({
  error,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      style={{ ...radius, ...props.style }}
      className={`${inputBase} ${borderFor(error)} ${className}`}
    />
  );
}

export function Textarea({
  error,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      {...props}
      style={{ ...radius, ...props.style }}
      className={`${inputBase} h-auto min-h-[120px] py-3 ${borderFor(error)} ${className}`}
    />
  );
}

export function Select({
  error,
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <div className="relative">
      <select
        {...props}
        style={{ ...radius, ...props.style }}
        className={`${inputBase} appearance-none pr-10 ${borderFor(error)} ${className}`}
      >
        {children}
      </select>
      <span
        className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-fg-subtle text-xl"
        aria-hidden="true"
      >
        expand_more
      </span>
    </div>
  );
}
