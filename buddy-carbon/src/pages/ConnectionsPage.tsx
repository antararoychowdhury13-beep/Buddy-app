import { ModulePlaceholder } from '../components/ModulePlaceholder';

export default function ConnectionsPage() {
  return (
    <ModulePlaceholder
      title="Connections"
      subtitle="Connect and manage your integrations"
      summary="Connections is where you link real accounts and see, per app, exactly how each one connects — OAuth, API key, or manual — and what permissions it holds."
      willInclude={[
        'Connected accounts with real connect and disconnect controls',
        'Sign-in providers with per-provider setup',
        'A catalogue of apps grouped by category with each app’s connection method',
        'A Carbon DataTable with search, sort, filter and pagination',
        'Clear permission and status indicators',
      ]}
    />
  );
}
