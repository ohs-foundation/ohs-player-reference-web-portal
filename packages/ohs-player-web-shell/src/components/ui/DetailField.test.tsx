import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DetailField } from './DetailField';

describe('DetailField', () => {
  it('renders the label and the value', () => {
    render(<DetailField label="Agent">admin-user</DetailField>);
    expect(screen.getByText('Agent')).toHaveClass('ohs-detail-field__label');
    expect(screen.getByText('admin-user')).toHaveClass('ohs-detail-field__value');
  });

  it('renders element values as given', () => {
    render(
      <DetailField label="Recorded">
        <time dateTime="2026-09-22T08:30:00.000Z">22 Sep 2026</time>
      </DetailField>,
    );
    expect(screen.getByText('22 Sep 2026').tagName).toBe('TIME');
  });

  it.each([undefined, null, false, '', '   '])(
    'renders an em dash for an empty value (%s)',
    (value) => {
      render(<DetailField label="Outcome">{value}</DetailField>);
      expect(screen.getByText('—')).toBeInTheDocument();
    },
  );

  it('keeps a zero', () => {
    render(<DetailField label="Count">{0}</DetailField>);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
