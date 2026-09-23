import { useMemo, type ReactNode } from 'react';
import { useRequirement } from '../../auth/useRequirement';
import { usePortalConfig } from '../../config/portalConfigContext';
import { gatedKpis, type GatedKpi, type KpiDefinition } from './kpiCatalogue';

type RenderVisible = (visible: readonly KpiDefinition[]) => ReactNode;

/** Hands `children` the catalogue KPIs whose flag and permission the session meets, in catalogue order. */
export function VisibleKpis({ children }: Readonly<{ children: RenderVisible }>): ReactNode {
  const { navigation } = usePortalConfig();
  const kpis = useMemo(() => gatedKpis(navigation), [navigation]);
  return <KpiGate kpis={kpis} index={0} visible={[]} render={children} />;
}

interface KpiGateProps {
  kpis: readonly GatedKpi[];
  index: number;
  visible: readonly KpiDefinition[];
  render: RenderVisible;
}

// One KPI per level keeps each useRequirement call unconditional.
function KpiGate({ kpis, index, visible, render }: Readonly<KpiGateProps>): ReactNode {
  const kpi = kpis.at(index);
  const allowed = useRequirement(kpi?.requires);
  if (!kpi) return render(visible);
  return (
    <KpiGate
      kpis={kpis}
      index={index + 1}
      visible={allowed ? [...visible, kpi] : visible}
      render={render}
    />
  );
}
