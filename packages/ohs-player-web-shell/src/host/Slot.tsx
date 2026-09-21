import type { ExtensionSlotContribution } from 'ohs-player-web-core';
import type { ReactNode } from 'react';
import { ErrorState } from '../components/ui';
import { ContributionBoundary } from './ContributionBoundary';
import { useExtensions } from './extensionsContext';
import type { SlotContexts, SlotName } from './types';

type Contribution = ExtensionSlotContribution<SlotContexts>;

function isFor<Name extends SlotName>(name: Name) {
  return (contribution: Contribution): contribution is Extract<Contribution, { slot: Name }> =>
    contribution.slot === name;
}

export interface SlotProps<Name extends SlotName> {
  name: Name;
  context: SlotContexts[Name];
}

/** Renders every contribution registered for `name` in order, each behind its own error boundary. */
export function Slot<Name extends SlotName>({
  name,
  context,
}: Readonly<SlotProps<Name>>): ReactNode {
  const { slots } = useExtensions();
  return slots
    .filter(isFor(name))
    .sort((a, b) => a.order - b.order)
    .map(({ id, component: Contributed }) => (
      <ContributionBoundary key={id} fallback={<ErrorState />}>
        <Contributed context={context} />
      </ContributionBoundary>
    ));
}
