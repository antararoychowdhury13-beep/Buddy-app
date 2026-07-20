import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Column, Grid, Tile, Toggle, RadioButton, RadioButtonGroup, Dropdown, Tag, Button,
} from '@carbon/react';
import { UserAvatar } from '@carbon/icons-react';
import { PageHeader } from '../components/PageHeader';
import { useUiStore } from '../hooks/useUiStore';
import { USER } from '../constants/askMock';
import styles from './SettingsPage.module.scss';

const LANGUAGES = ['English (US)', 'English (UK)', 'Español', 'Deutsch', 'हिन्दी'];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className={styles.section} aria-label={title}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <Tile className={styles.tile}>{children}</Tile>
    </section>
  );
}

function Row({ label, helper, control }: { label: string; helper?: string; control: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <div className={styles.rowLabel}>{label}</div>
        {helper && <div className={styles.rowHelper}>{helper}</div>}
      </div>
      <div className={styles.rowControl}>{control}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { hash } = useLocation();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  const [autoPlan, setAutoPlan] = useState(true);
  const [proactive, setProactive] = useState(true);
  const [health, setHealth] = useState(false);
  const [pushWork, setPushWork] = useState(true);
  const [pushPersonal, setPushPersonal] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [language, setLanguage] = useState(LANGUAGES[0]);

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hash]);

  return (
    <div className="page">
      <Grid>
        <Column sm={4} md={8} lg={8}>
          <PageHeader title="Settings" subtitle="Manage your account, AI preferences, notifications, appearance and privacy." />
        </Column>

        <Column sm={4} md={8} lg={8}>
          <Section id="profile" title="Profile">
            <div className={styles.identity}>
              <span className={styles.avatar}><UserAvatar size={32} /></span>
              <div>
                <div className={styles.name}>{USER.name}</div>
                <div className={styles.rowHelper}>{USER.role} · {USER.email}</div>
              </div>
            </div>
          </Section>

          <Section id="account" title="Account">
            <Row label="Workspace" helper="Where your work data lives" control={<Tag type="cool-gray" size="sm">Project Phoenix</Tag>} />
            <Row label="Plan" control={<Tag type="green" size="sm">Enterprise</Tag>} />
          </Section>

          <Section id="ai" title="AI preferences">
            <Row label="Plan before acting" helper="Buddy always shows a plan before running work" control={<Toggle id="s-plan" size="sm" labelA="Off" labelB="On" toggled={autoPlan} onToggle={setAutoPlan} hideLabel labelText="" />} />
            <Row label="Proactive nudges" helper="Surface time-sensitive things without being asked" control={<Toggle id="s-proactive" size="sm" labelA="Off" labelB="On" toggled={proactive} onToggle={setProactive} hideLabel labelText="" />} />
            <Row label="Use optional health data" helper="Off by default · never shared with managers" control={<Toggle id="s-health" size="sm" labelA="Off" labelB="On" toggled={health} onToggle={setHealth} hideLabel labelText="" />} />
          </Section>

          <Section id="notifications" title="Notifications">
            <Row label="Work notifications" control={<Toggle id="s-work" size="sm" labelA="Off" labelB="On" toggled={pushWork} onToggle={setPushWork} hideLabel labelText="" />} />
            <Row label="Personal notifications" control={<Toggle id="s-personal" size="sm" labelA="Off" labelB="On" toggled={pushPersonal} onToggle={setPushPersonal} hideLabel labelText="" />} />
          </Section>

          <Section id="appearance" title="Appearance">
            <RadioButtonGroup name="theme" legendText="Theme" valueSelected={theme}
              onChange={(v) => setTheme(v as 'white' | 'g100')} orientation="vertical">
              <RadioButton id="theme-light" labelText="Light" value="white" />
              <RadioButton id="theme-dark" labelText="Dark" value="g100" />
            </RadioButtonGroup>
          </Section>

          <Section id="accessibility" title="Accessibility">
            <Row label="Reduce motion" helper="Minimise animations across the app" control={<Toggle id="s-motion" size="sm" labelA="Off" labelB="On" toggled={reduceMotion} onToggle={setReduceMotion} hideLabel labelText="" />} />
          </Section>

          <Section id="language" title="Language">
            <Dropdown id="s-language" titleText="App language" hideLabel label="Language"
              items={LANGUAGES} selectedItem={language} onChange={({ selectedItem }) => selectedItem && setLanguage(selectedItem)} />
          </Section>

          <Section id="security" title="Security">
            <Row label="Two-factor authentication" helper="Recommended for enterprise accounts" control={<Tag type="green" size="sm">On</Tag>} />
            <Row label="Active sessions" helper="This device · last active now" control={<Button size="sm" kind="ghost">Manage</Button>} />
          </Section>

          <Section id="privacy" title="Privacy">
            <p className={styles.para}>Work and personal contexts are never silently mixed. Buddy only uses the data in the scope you pick, and every action leaves an audit trail you control.</p>
          </Section>

          <Section id="help" title="Help & support">
            <Row label="Documentation" control={<Button size="sm" kind="ghost">Open</Button>} />
            <Row label="Contact support" control={<Button size="sm" kind="ghost">Email</Button>} />
          </Section>

          <Section id="about" title="About">
            <Row label="Buddy" helper="AI chief of staff — Carbon build" control={<Tag type="cool-gray" size="sm">v1.0</Tag>} />
          </Section>
        </Column>
      </Grid>
    </div>
  );
}
