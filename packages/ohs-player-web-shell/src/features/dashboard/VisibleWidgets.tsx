import type { ReactNode } from 'react';
import { useRequirement } from '../../auth/useRequirement';
import type { WidgetDefinition } from './widgetCatalogue';

type RenderVisible = (visible: readonly WidgetDefinition[]) => ReactNode;

/** Hands `children` the catalogue entries whose flag and permission the session meets, in order. */
export function VisibleWidgets({
  catalogue,
  children,
}: Readonly<{ catalogue: readonly WidgetDefinition[]; children: RenderVisible }>): ReactNode {
  return <WidgetGate entries={catalogue} index={0} visible={[]} render={children} />;
}

interface WidgetGateProps {
  entries: readonly WidgetDefinition[];
  index: number;
  visible: readonly WidgetDefinition[];
  render: RenderVisible;
}

function WidgetGate({ entries, index, visible, render }: Readonly<WidgetGateProps>): ReactNode {
  const entry = entries.at(index);
  const allowed = useRequirement(entry?.requires);
  if (!entry) return render(visible);
  return (
    <WidgetGate
      entries={entries}
      index={index + 1}
      visible={allowed ? [...visible, entry] : visible}
      render={render}
    />
  );
}
