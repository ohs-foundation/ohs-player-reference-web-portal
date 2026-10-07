import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './Layout';

describe('PageHeader', () => {
  it('titles the page with its one level one heading', () => {
    render(<PageHeader title="Dashboard" description="Overview" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading')).toHaveLength(1);
  });
});
