import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { collectBook, type DeskBook } from '@/lib/protocolStats';

const LINKS = [
  { href: '/crear', mark: '✦', title: 'My protocols', hint: 'Drafts and published links', accent: false },
  { href: '/crear?vista=metrics', mark: '▤', title: 'Metrics', hint: 'Positions, fees, wallets, assets', accent: false },
  { href: '/crear/nuevo', mark: '+', title: 'Create', hint: 'Start a new desk', accent: true },
];

export function ProtocolsMenu({ placement }: { placement: 'down' | 'up' }) {
  const [open, setOpen] = useState(false);
  const [book, setBook] = useState<DeskBook | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    void collectBook().then((next) => {
      if (!cancel) setBook(next);
    });
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      cancel = true;
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`pm pm-${placement}${open ? ' pm-open' : ''}`} ref={root}>
      <button
        type="button"
        className="land-ghost pm-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="pm-long">My protocols</span>
        <span className="pm-short">Protocols</span>
        <i aria-hidden="true" />
      </button>
      {open ? (
        <div className="pm-panel" id={panelId}>
          <nav aria-label="Protocols">
            {LINKS.map((item) => (
              <Link key={item.href} to={item.href} className={item.accent ? 'pm-link is-accent' : 'pm-link'} onClick={() => setOpen(false)}>
                <b>{item.mark}</b>
                <span>
                  <strong>{item.title}</strong>
                  <em>{item.hint}</em>
                </span>
              </Link>
            ))}
          </nav>
          <div className="pm-book">
            <p>Metrics</p>
            {book ? <Stats book={book} /> : <span className="pm-wait">Reading the desk…</span>}
            <Link to="/crear?vista=metrics" className="pm-more" onClick={() => setOpen(false)}>
              Open the book
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stats({ book }: { book: DeskBook }) {
  const cards = [
    { label: 'Positions', value: book.positions },
    { label: 'Fees', value: book.fees },
    { label: 'Wallets', value: book.wallets },
    { label: 'Assets', value: book.assets.length },
  ];
  return (
    <>
      <div className="pm-stats">
        {cards.map((card) => (
          <div key={card.label}>
            <strong>{card.value.toLocaleString('en')}</strong>
            <span>{card.label}</span>
          </div>
        ))}
      </div>
      {book.assets.length ? (
        <div className="pm-assets">
          {book.assets.map((asset) => (
            <i key={asset}>{asset}</i>
          ))}
        </div>
      ) : (
        <span className="pm-wait">No markets on the desk yet.</span>
      )}
    </>
  );
}
