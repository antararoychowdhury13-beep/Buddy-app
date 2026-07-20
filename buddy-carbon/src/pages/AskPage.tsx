import { ModulePlaceholder } from '../components/ModulePlaceholder';

export default function AskPage() {
  return (
    <ModulePlaceholder
      title="Ask Buddy"
      subtitle="Plan and run work across your connected apps"
      summary="Ask Buddy turns a request into an editable plan, shows the consequences, asks for approval, runs the work across simulated enterprise apps, and gives you evidence for every action."
      willInclude={[
        'A conversational command centre with an editable execution plan',
        'Consent, live meeting capture and generated minutes',
        'Plan-before-action with per-step approval and previews',
        'An execution timeline with evidence and partial-failure recovery',
        'Turning a completed conversation into a reusable workflow',
      ]}
    />
  );
}
