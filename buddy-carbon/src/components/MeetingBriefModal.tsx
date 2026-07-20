import {
  Modal,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  UnorderedList,
  ListItem,
} from '@carbon/react';
import { MEETING_BRIEF } from '../constants/todayMock';
import { ConfidenceTag } from './ConfidenceTag';
import styles from './MeetingBriefModal.module.scss';

interface MeetingBriefModalProps {
  open: boolean;
  onClose: () => void;
}

/** Meeting brief at three depths (glance / two-minute / full context), each a
 * Carbon Tab. Sources are Tags; nothing exposes private message content. */
export function MeetingBriefModal({ open, onClose }: MeetingBriefModalProps) {
  const brief = MEETING_BRIEF;
  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading={`Brief — ${brief.title}`}
      modalLabel="Meeting intelligence"
      passiveModal
      size="md"
    >
      <div className={styles.head}>
        <p className={styles.objective}>{brief.objective}</p>
        <div className={styles.meta}>
          <ConfidenceTag level={brief.confidence} />
          <span className={styles.updated}>Updated {brief.lastUpdated}</span>
        </div>
      </div>

      <Tabs>
        <TabList aria-label="Brief depth" contained>
          <Tab>30 seconds</Tab>
          <Tab>Two minutes</Tab>
          <Tab>Full context</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <p className={styles.body}>{brief.glance}</p>
          </TabPanel>

          <TabPanel>
            <h3 className={styles.subhead}>Previous decisions</h3>
            <UnorderedList>
              {brief.previousDecisions.map((d) => (
                <ListItem key={d}>{d}</ListItem>
              ))}
            </UnorderedList>
            <h3 className={styles.subhead}>Likely to come up</h3>
            <UnorderedList>
              {brief.predictedRisks.map((r) => (
                <ListItem key={r}>{r}</ListItem>
              ))}
            </UnorderedList>
            <h3 className={styles.subhead}>Recommended position</h3>
            <p className={styles.body}>{brief.recommendedPosition}</p>
          </TabPanel>

          <TabPanel>
            <StructuredListWrapper aria-label="Attendees" isCondensed>
              <StructuredListBody>
                {brief.attendees.map((a) => (
                  <StructuredListRow key={a.name}>
                    <StructuredListCell>
                      <strong>{a.name}</strong>
                      <div className={styles.attRole}>{a.role}</div>
                    </StructuredListCell>
                    <StructuredListCell>{a.context}</StructuredListCell>
                  </StructuredListRow>
                ))}
              </StructuredListBody>
            </StructuredListWrapper>
            <h3 className={styles.subhead}>Missing information</h3>
            <p className={styles.body}>{brief.missingInformation}</p>
            <div className={styles.sources}>
              {brief.sources.map((s) => (
                <Tag key={s} type="cool-gray" size="sm">
                  {s}
                </Tag>
              ))}
            </div>
            <p className={styles.fineprint}>{brief.confidenceReason}</p>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Modal>
  );
}
