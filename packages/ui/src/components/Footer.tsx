import type { ReactNode } from 'react';
import { cn } from '@camtraffic/utils';

export interface FooterProps {
  copyright?: string;
  version?: string;
  links?: Array<{ label: string; href: string }>;
  className?: string;
  children?: ReactNode;
}

export function Footer({ copyright, version, links, className, children }: FooterProps) {
  return (
    <footer className={cn('ct-footer', className)}>
      <div className="ct-footer__content">
        {children || (
          <>
            {copyright ? <p className="ct-footer__copyright">{copyright}</p> : null}
            {links && links.length > 0 ? (
              <nav className="ct-footer__links">
                {links.map((link) => (
                  <a key={link.href} href={link.href} className="ct-footer__link">
                    {link.label}
                  </a>
                ))}
              </nav>
            ) : null}
            {version ? <span className="ct-footer__version">v{version}</span> : null}
          </>
        )}
      </div>
    </footer>
  );
}
