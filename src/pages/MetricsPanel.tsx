import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { protocolUrl } from '@/lib/site';
import { collectBook, type DeskBook } from '@/lib/protocolStats';

function count(value: number, word: string) {
  return `${value.toLocaleString('en')} ${word}${value === 1 ? '' : 's'}`;
}

const PRIMARY = [
  { key: 'positions', label: 'Positions', hint: 'Desks that open a position' },
  { key: 'fees', label: 'Fees', hint: 'Modules with a rate set' },
  { key: 'wallets', label: 'Wallets', hint: 'Where a visitor connects' },
  { key: 'assets', label: 'Assets', hint: 'Markets placed on the desks' },
] as const;

export function MetricsPanel() {
  const [book, setBook] = useState<DeskBook | null>(null);

  useEffect(() => {
    void collectBook().then(setBook);
  }, []);

  const values = book
    ? { positions: book.positions, fees: book.fees, wallets: book.wallets, assets: book.assets.length }
    : null;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <p className="text-[12px] uppercase tracking-[0.2em] text-[#d6ff4a]">The book</p>
      <h1 className="mt-3 text-5xl tracking-[-0.05em]">Metrics</h1>
      <p className="mt-4 max-w-2xl text-white/55">
        Positions, fees, wallets, and assets counted from the protocols on this desk. Filled positions, fees collected, and live sessions are read on each published link once a wallet connects.
      </p>

      {book === null ? <p className="mt-10 text-white/45">Reading the desk…</p> : null}

      {book ? (
        <>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PRIMARY.map((card) => (
              <li key={card.key} className="rounded-[24px] bg-white/[0.03] p-5 ring-1 ring-white/10">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#d6ff4a]">{card.label}</p>
                <p className="mt-3 text-4xl tracking-[-0.05em]">{values?.[card.key].toLocaleString('en')}</p>
                <p className="mt-2 text-sm text-white/45">{card.hint}</p>
              </li>
            ))}
          </ul>

          {book.feeNotes.length ? <p className="mt-4 text-sm text-white/50">Rates on the desk: {book.feeNotes.join(' · ')}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {book.assets.length ? (
              book.assets.map((asset) => (
                <span key={asset} className="rounded-full px-3 py-1 font-mono text-[11px] tracking-[0.08em] text-white/80 ring-1 ring-white/15">
                  {asset}
                </span>
              ))
            ) : (
              <span className="text-sm text-white/40">No markets yet.</span>
            )}
          </div>

          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['Protocols', book.protocols],
              ['Published', book.published],
              ['Pages', book.pages],
              ['Books', book.books],
              ['Calendars', book.calendars],
              ['Pulse', book.pulses],
            ].map(([label, value]) => (
              <li key={String(label)} className="rounded-2xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/10">
                <p className="text-2xl tracking-[-0.04em]">{Number(value).toLocaleString('en')}</p>
                <p className="text-[12px] text-white/45">{label}</p>
              </li>
            ))}
          </ul>

          {book.unread > 0 ? (
            <p className="mt-4 text-sm text-white/45">
              {book.unread} protocol{book.unread === 1 ? '' : 's'} could not be opened here, so their desks are missing from the count.
            </p>
          ) : null}

          <h2 className="mt-12 text-3xl tracking-[-0.04em]">By protocol</h2>
          {book.rows.length === 0 ? (
            <div className="mt-6 rounded-[28px] bg-white/[0.03] p-8 ring-1 ring-white/10">
              <p className="text-white/55">Create a protocol and the book fills in.</p>
              <Link to="/crear/nuevo" className="mt-5 inline-block rounded-full bg-[#d6ff4a] px-5 py-2.5 text-sm text-[#141414]">
                Create
              </Link>
            </div>
          ) : (
            <ul className="mt-6 grid gap-3">
              {book.rows.map((row) => (
                <li key={row.id} className="rounded-[24px] bg-white/[0.03] p-5 ring-1 ring-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">{row.status === 'published' ? 'Published' : 'Draft'}</p>
                      <Link to={`/crear/${row.id}`} className="mt-1 block text-2xl tracking-[-0.04em]">
                        {row.title}
                      </Link>
                    </div>
                    {row.status === 'published' && row.slug ? (
                      <a href={protocolUrl(row.slug)} className="text-sm text-[#d6ff4a]" target="_blank" rel="noreferrer">
                        Open link
                      </a>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-white/50">
                    {count(row.positions, 'position')} · {count(row.fees, 'fee')} · {count(row.wallets, 'wallet')} · {count(row.pages, 'page')}
                  </p>
                  {row.assets.length ? <p className="mt-1 text-sm text-white/40">{row.assets.join(' · ')}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </main>
  );
}
