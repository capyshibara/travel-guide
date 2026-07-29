import styles from './travel.module.css';
import { Icon } from '../Icon';
import { isSafeExternalUrl } from '../../lib/url';

export interface ExternalLinkButtonProps {
  href: string;
  label?: string;
}

/**
 * Outbound link treatment. Renders nothing for a URL that is not http(s) — a
 * disabled-looking link that silently does nothing would be worse than no link.
 * `rel="noopener noreferrer"` is set because the target is workbook-supplied.
 */
export function ExternalLinkButton({ href, label = 'View source' }: ExternalLinkButtonProps) {
  if (!isSafeExternalUrl(href)) return null;
  return (
    <a className={styles.externalLink} href={href} target="_blank" rel="noopener noreferrer">
      {label}
      <Icon name="external-link" size="xs" />
      <span className="visually-hidden">(opens in a new tab)</span>
    </a>
  );
}
