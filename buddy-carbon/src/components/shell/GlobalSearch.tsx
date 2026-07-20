import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, IconButton, Search, SkeletonText, Tag } from '@carbon/react';
import { AiGenerate, ArrowRight, Microphone, Time, Close } from '@carbon/icons-react';
import {
  RECENT_SEARCHES, SUGGESTED_PROMPTS, aiAnswerFor, searchContent, type SearchResult,
} from '../../constants/searchMock';
import styles from './GlobalSearch.module.scss';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * AI-powered global search overlay: natural-language input across work and
 * personal content, suggested prompts, recent searches, a voice-input
 * placeholder, a loading state, and an AI-synthesised answer above results.
 */
export function GlobalSearch({ open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery(''); setSubmitted(''); setResults([]); setLoading(false);
      const t = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const run = (q: string) => {
    const text = q.trim();
    if (!text) return;
    setQuery(text); setSubmitted(text); setLoading(true); setResults([]);
    window.setTimeout(() => { setResults(searchContent(text)); setLoading(false); }, 650);
  };

  const answer = submitted && !loading ? aiAnswerFor(submitted, results.length) : null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="AI search">
      <div className={styles.bar}>
        <div className={styles.searchWrap}>
          <Search
            ref={inputRef}
            size="lg"
            labelText="Search work and personal content with AI"
            placeholder="Ask anything, or search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') run(query); }}
            onClear={() => { setQuery(''); setSubmitted(''); setResults([]); }}
          />
        </div>
        <IconButton label="Voice input (coming soon)" kind="ghost" size="lg" disabled>
          <Microphone size={20} />
        </IconButton>
        <IconButton label="Close search" kind="ghost" size="lg" onClick={onClose}>
          <Close size={20} />
        </IconButton>
      </div>

      <div className={styles.body}>
        {!submitted && (
          <>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}><AiGenerate size={16} /> Suggested prompts</h3>
              <div className={styles.chips}>
                {SUGGESTED_PROMPTS.map((p) => (
                  <button key={p} type="button" className={styles.chip} onClick={() => run(p)}>{p}</button>
                ))}
              </div>
            </section>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}><Time size={16} /> Recent searches</h3>
              <div className={styles.recentList}>
                {RECENT_SEARCHES.map((r) => (
                  <button key={r} type="button" className={styles.recent} onClick={() => run(r)}>
                    <Time size={16} /> <span>{r}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {submitted && loading && (
          <div className={styles.section} aria-live="polite">
            <div className={styles.aiCard}>
              <div className={styles.aiHead}><AiGenerate size={16} /> Buddy is searching…</div>
              <SkeletonText paragraph lineCount={2} />
            </div>
          </div>
        )}

        {submitted && !loading && answer && (
          <div className={styles.section} aria-live="polite">
            <div className={styles.aiCard}>
              <div className={styles.aiHead}><AiGenerate size={16} /> AI answer</div>
              <p className={styles.aiSummary}>{answer.summary}</p>
              {answer.sources.length > 0 && (
                <div className={styles.sources}>
                  {answer.sources.map((s) => <Tag key={s} type="cool-gray" size="sm">{s}</Tag>)}
                </div>
              )}
            </div>

            {results.length === 0 ? (
              <p className={styles.empty}>No matching items. Try a suggested prompt above.</p>
            ) : (
              <section aria-label="Results" className={styles.results}>
                <h3 className={styles.sectionTitle}>Results</h3>
                {results.map((r) => (
                  <button key={r.id} type="button" className={styles.result}
                    onClick={() => { onClose(); navigate(r.scope === 'Work' ? '/work' : '/life'); }}>
                    <span className={styles.resultBody}>
                      <span className={styles.resultTitle}>{r.title}</span>
                      <span className={styles.resultDetail}>{r.detail}</span>
                      <span className={styles.resultMeta}><Tag type={r.scope === 'Work' ? 'blue' : 'magenta'} size="sm">{r.scope}</Tag> <span className={styles.source}>{r.source}</span></span>
                    </span>
                    <ArrowRight size={16} />
                  </button>
                ))}
              </section>
            )}
            <div className={styles.askRow}>
              <Button kind="tertiary" size="sm" renderIcon={AiGenerate} onClick={() => { onClose(); navigate('/ask'); }}>Ask Buddy to act on this</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
