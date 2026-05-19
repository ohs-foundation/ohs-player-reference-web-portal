import type { CSSProperties, DetailedHTMLProps, HTMLAttributes, ReactNode } from 'react';

/** Minimal typing for Material Web custom elements used in JSX. */
type MdHost<T extends HTMLElement = HTMLElement> = DetailedHTMLProps<HTMLAttributes<T>, T> & {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  disabled?: boolean;
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'md-filled-button': MdHost & { href?: string; type?: 'submit' | 'button' | 'reset' };
      'md-filled-tonal-button': MdHost & { href?: string; type?: 'submit' | 'button' | 'reset' };
      'md-outlined-button': MdHost & { href?: string; type?: 'submit' | 'button' | 'reset' };
      'md-elevated-button': MdHost & { href?: string; type?: 'submit' | 'button' | 'reset' };
      'md-text-button': MdHost & { href?: string; type?: 'submit' | 'button' | 'reset' };
      'md-icon-button': MdHost & { toggle?: boolean; selected?: boolean; type?: 'submit' | 'button' | 'reset' };
      'md-outlined-text-field': MdHost & {
        label?: string;
        value?: string;
        type?: string;
        required?: boolean;
        error?: boolean;
        'error-text'?: string;
        'supporting-text'?: string;
        rows?: number;
        cols?: number;
        'no-asterisk'?: boolean;
        maxlength?: number;
        minlength?: number;
      };
      'md-filled-text-field': MdHost & {
        label?: string;
        value?: string;
        type?: string;
        required?: boolean;
        error?: boolean;
        'error-text'?: string;
        'supporting-text'?: string;
        rows?: number;
        cols?: number;
        'no-asterisk'?: boolean;
        maxlength?: number;
        minlength?: number;
      };
      'md-outlined-select': MdHost & {
        label?: string;
        value?: string;
        required?: boolean;
        error?: boolean;
        'error-text'?: string;
        'supporting-text'?: string;
      };
      'md-filled-select': MdHost & {
        label?: string;
        value?: string;
        required?: boolean;
        error?: boolean;
        'error-text'?: string;
        'supporting-text'?: string;
      };
      'md-switch': MdHost & { selected?: boolean; icons?: boolean };
      'md-checkbox': MdHost & { checked?: boolean; indeterminate?: boolean };
      'md-chip-set': MdHost;
      'md-filter-chip': MdHost & { label?: string; selected?: boolean; elevated?: boolean };
      'md-linear-progress': MdHost & {
        indeterminate?: boolean;
        value?: number;
        max?: number;
        buffer?: number;
      };
      'md-secondary-tab': MdHost & { 'aria-selected'?: boolean };
      'md-list': MdHost;
      'md-list-item': MdHost & { headline?: string; type?: 'button' | 'link' | 'text'; href?: string; active?: boolean };
      'md-select-option': MdHost & {
        value?: string;
        headline?: string;
        selected?: boolean;
      };
      'md-menu': MdHost & {
        anchor?: string;
        open?: boolean;
        positioning?: 'absolute' | 'fixed' | 'document' | 'popover';
        quick?: boolean;
        'has-overflow'?: boolean;
        'x-offset'?: number;
      };
      'md-menu-item': MdHost & {
        headline?: string;
        type?: string;
        href?: string;
      };
      'md-divider': MdHost;
      'md-tabs': MdHost & {
        'active-tab-index'?: number;
        'auto-activate'?: boolean;
      };
      'md-primary-tab': MdHost & { 'aria-selected'?: boolean };
      'md-circular-progress': MdHost & {
        indeterminate?: boolean;
        value?: number;
        max?: number;
      };
      /** Material Web dialog host (Lit `MdDialog`; inner native `<dialog>` is in shadow DOM). */
      'md-dialog': MdHost & {
        open?: boolean;
        type?: 'alert' | 'form';
      };
    }
  }
}

export {};
