import { useTranslation } from 'ohs-player-web-core';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { IconChevronDown } from '../../components/ui/icons';

/** One button drawn as an M3 outlined split button; both segments open the same picker. */
export const CustomizeWidgetsButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(function CustomizeWidgetsButton(props, ref) {
  const { t } = useTranslation();
  return (
    <button ref={ref} type="button" className="ohs-split-button" {...props}>
      <span className="ohs-split-button__segment ohs-state-layer">{t('kpiCustomize')}</span>
      <span
        className="ohs-split-button__segment ohs-split-button__segment--icon ohs-state-layer"
        aria-hidden="true"
      >
        <IconChevronDown size={24} />
      </span>
    </button>
  );
});
