/** Panel layout icon — narrow sidebar + main content (matches common sidebar toggle UI). */
export function SidebarLayoutIcon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="15"
        rx="2.25"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M9.25 4.5v15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
