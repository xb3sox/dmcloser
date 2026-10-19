import type { SVGProps } from "react";

export function CloserMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M7 3h18a5 5 0 0 1 5 5v13a5 5 0 0 1-5 5H13l-8 5v-6a5 5 0 0 1-3-4V8a5 5 0 0 1 5-5Z"
        fill="currentColor"
      />
      <path
        d="m10 15 4 4 8-9"
        stroke="var(--mark-check, #fff)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`closer-brand ${compact ? "closer-brand-compact" : ""}`}>
      <CloserMark />
      <span>
        dmcloser<span className="brand-period">.</span>
      </span>
    </span>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M20.8 11.5a8.8 8.8 0 0 1-13.3 7.6L3 20.5 4.4 16a8.8 8.8 0 1 1 16.4-4.5Z" />
      <path
        d="m8.1 7.6 1.3 2.3-1 1.1a8 8 0 0 0 4.6 4.1l1-1.1 2.4 1.1c-.3 1.7-1.5 2.2-2.8 1.9-4.4-1-7.9-5.2-7.8-7.4.1-1 .9-1.8 2.3-2Z"
        strokeWidth="1.3"
      />
    </svg>
  );
}
