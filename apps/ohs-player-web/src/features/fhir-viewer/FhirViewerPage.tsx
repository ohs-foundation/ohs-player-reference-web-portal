import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'ohs-player-web-core';
import { Page, PageHeader } from '../../components/ui';
import { ResourceTypeSidebar } from './ResourceTypeSidebar';
import { ResourceListPanel } from './ResourceListPanel';
import { ResourceDrawer } from './ResourceDrawer';
import { type FhirRecord, RESOURCE_TYPE_DEFS, resourceTypeDef } from './registry';

const DEFAULT_TYPE = RESOURCE_TYPE_DEFS[0].resourceType;

/**
 * FHIR Viewer: a raw FHIR admin/debug browser. Resource-type sidebar + registry-driven list; the
 * selected type is the URL segment (`/resources/:resourceType`) so selections deep-link. Clicking
 * a Name opens the view/edit/delete drawer.
 */
export function FhirViewerPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { resourceType } = useParams<{ resourceType?: string }>();
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewingExample, setViewingExample] = useState<FhirRecord | null>(null);

  const def = resourceTypeDef(resourceType) ?? resourceTypeDef(DEFAULT_TYPE);

  // Invalid deep link (a non-registry type) → normalise to the default type.
  if (resourceType && !resourceTypeDef(resourceType)) {
    return <Navigate to={`/resources/${DEFAULT_TYPE}`} replace />;
  }
  if (!def) return <Navigate to={`/resources/${DEFAULT_TYPE}`} replace />;

  const openResource = (resource: FhirRecord): void => {
    if (typeof resource.id === 'string') setViewingId(resource.id);
  };

  return (
    <Page>
      <PageHeader title={t('pageFhirViewer')} description={t('pageFhirViewerDescription')} />
      <div className="flex gap-6 items-start max-[900px]:flex-col">
        <ResourceTypeSidebar
          selected={def.resourceType}
          onSelect={(rt) => void navigate(`/resources/${rt}`)}
        />
        <ResourceListPanel
          key={def.resourceType}
          def={def}
          onOpenResource={openResource}
          onOpenExample={setViewingExample}
        />
      </div>
      {viewingId ? (
        <ResourceDrawer def={def} resourceId={viewingId} open onClose={() => setViewingId(null)} />
      ) : null}
      {viewingExample ? (
        <ResourceDrawer
          def={def}
          resourceId={typeof viewingExample.id === 'string' ? viewingExample.id : 'example'}
          example={viewingExample}
          open
          onClose={() => setViewingExample(null)}
        />
      ) : null}
    </Page>
  );
}
