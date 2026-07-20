import { ModulePlaceholder } from '../components/ModulePlaceholder';

export default function TodayPage() {
  return (
    <ModulePlaceholder
      title="Today"
      subtitle="Your day, orchestrated"
      summary="The Today module optimises your schedule, adapts your timeline, briefs you before meetings and estimates how likely you are to finish what's due."
      willInclude={[
        'Schedule optimisation with a current-versus-optimised comparison',
        'An adaptive timeline that distinguishes fixed, flexible and optional items',
        'Meeting briefs at glance, two-minute and full-context depth',
        'Live replanning with recovery options when a meeting overruns',
        'Energy-aware scheduling and a transparent completion estimate',
      ]}
    />
  );
}
