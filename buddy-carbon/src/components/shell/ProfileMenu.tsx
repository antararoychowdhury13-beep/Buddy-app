import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '@carbon/icons-react';
import { SlidePanel } from './SlidePanel';
import { PROFILE_LINKS } from '../../constants/navigation';
import { USER } from '../../constants/askMock';
import styles from './ProfileMenu.module.scss';

interface Props {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

/** Profile panel: identity header plus account, preferences and sign-out links. */
export function ProfileMenu({ open, onClose, onLogout }: Props) {
  const navigate = useNavigate();

  return (
    <SlidePanel open={open} title="Account" onClose={onClose}>
      <div className={styles.identity}>
        <span className={styles.avatar}><UserAvatar size={32} /></span>
        <div>
          <div className={styles.name}>{USER.name}</div>
          <div className={styles.role}>{USER.role} · {USER.email}</div>
        </div>
      </div>

      <nav aria-label="Profile" className={styles.list}>
        {PROFILE_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.label}
              type="button"
              className={`${styles.link} ${link.danger ? styles.danger : ''}`}
              onClick={() => { onClose(); if (link.danger) onLogout(); else if (link.to) navigate(link.to); }}
            >
              <Icon size={20} />
              <span>{link.label}</span>
            </button>
          );
        })}
      </nav>
    </SlidePanel>
  );
}
