import { ModulePlaceholder } from '../components/ModulePlaceholder';

export default function LifePage() {
  return (
    <ModulePlaceholder
      title="Life"
      subtitle="Coordinate your personal life, privately"
      summary="Life keeps your personal intelligence personal, explainable and easy to correct — a permission-controlled family graph, care journeys, wellbeing baselines, household tasks and explainable money."
      willInclude={[
        'A family graph that distinguishes verified, inferred, shared and sensitive information',
        'A full care journey with visible medical boundaries',
        'Personal-baseline wellbeing with clearly-labelled correlations',
        'Household replenishment and an ownership-cost assistant',
        'Explainable safe-to-spend, scenarios and protected high-risk actions',
      ]}
    />
  );
}
