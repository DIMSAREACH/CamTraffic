import type { LucideIcon } from 'lucide-react';

export type AuthFeatureItem = { Icon: LucideIcon; text: string };

export function AuthFeatureList({ items }: { items: AuthFeatureItem[] }) {
  return (
    <ul className="up-features">
      {items.map(({ Icon, text }) => (
        <li key={text}>
          <span className="up-feature-icon" aria-hidden>
            <Icon size={15} strokeWidth={2.25} />
          </span>
          <span className="up-feature-text">{text}</span>
        </li>
      ))}
    </ul>
  );
}
