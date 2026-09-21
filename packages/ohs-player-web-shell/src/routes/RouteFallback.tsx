import { Page, Spinner } from '../components/ui';

export function RouteFallback(): React.ReactElement {
  return (
    <Page>
      <Spinner />
    </Page>
  );
}
