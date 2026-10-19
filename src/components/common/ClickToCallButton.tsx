import React from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { normalizePhoneNumber, getCallTooltip } from '../../utils/phoneUtils';
import styles from './ClickToCallButton.module.css';

export interface ClickToCallButtonProps {
  phone?: string | null;
  customerName?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon-only' | 'inline' | 'pill';
  showNumber?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const ClickToCallButton: React.FC<ClickToCallButtonProps> = ({
  phone,
  customerName,
  size = 'sm',
  variant = 'icon-only',
  showNumber = false,
  className = '',
  onClick
}) => {
  const { isValid, telUri, displayFormatted, reason } = normalizePhoneNumber(phone);
  const tooltip = getCallTooltip(customerName, phone);

  const iconSizes = {
    sm: 13,
    md: 16,
    lg: 18
  };

  const iconSize = iconSizes[size] || 14;

  const handleClick = (e: React.MouseEvent) => {
    // Prevent triggering parent row clicks (e.g. accordion/modal opening)
    e.stopPropagation();
    if (onClick) onClick(e);
  };

  // If number is missing or invalid, render accessible disabled element
  if (!isValid || !telUri) {
    return (
      <span
        className={`${styles.callLink} ${styles.callLinkDisabled} ${
          variant === 'pill'
            ? styles.variantPill
            : variant === 'inline'
            ? styles.variantInline
            : styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`]
        } ${className}`}
        title={reason || 'Phone number not available'}
        aria-disabled="true"
        role="button"
        tabIndex={-1}
        onClick={handleClick}
      >
        <PhoneOff size={iconSize} />
        {showNumber && <span className={styles.phoneText}>{displayFormatted}</span>}
      </span>
    );
  }

  return (
    <a
      href={telUri}
      className={`${styles.callLink} ${
        variant === 'pill'
          ? styles.variantPill
          : variant === 'inline'
          ? styles.variantInline
          : styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`]
      } ${className}`}
      title={tooltip}
      aria-label={tooltip}
      onClick={handleClick}
    >
      <Phone size={iconSize} />
      {showNumber && <span className={styles.phoneText}>{displayFormatted}</span>}
    </a>
  );
};
