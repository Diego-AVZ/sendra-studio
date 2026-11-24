import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listDrafts, purgeDraft, type Summary } from '@/lib/drafts';
import { protocolUrl } from '@/lib/site';
import { resetStorageProbe, storageMode, type StorageMode } from '@/lib/cloud';
import { useTitle } from '@/lib/title';
import { TEMPLATES } from '@/schema/templates';
import { HubShell } from '@/pages/HubShell';
import { MetricsPanel } from '@/pages/MetricsPanel';

function when(value: string) {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return '';
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(time);
}

function templateName(id: string) {
  return TEMPLATES.find((item) => item.id === id)?.name ?? 'Custom';
}

export function Hub() {
  const [params] = useSearchParams();
  const vista = params.get('vista') === 'metrics' ? 'metrics' : 'protocols';
  useTitle(vista === 'metrics' ? 'Metrics · Sendra Studio' : 'Protocols · Sendra Studio');
  return <HubShell vista={vista}>{vista === 'metrics' ? <MetricsPanel /> : <ProtocolList />}</HubShell>;
}

function ProtocolList() {
  const [rows, setRows] = useState<Summary[] | null>(null);
  const [mode, setMode] = useState<StorageMode | ''>('');
  const [pending, setPending] = useState('');
  const [note, setNote] = useState('');

  const refresh = () => {
    void listDrafts().then(setRows);
    void storageMode().then(setMode);
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <p className="text-[12px] uppercase tracking-[0.2em] text-[#d6ff4a]">Studio</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-5xl tracking-[-0.05em]">My protocols</h1>
          <Link to="/crear/nuevo" className="rounded-full bg-[#d6ff4a] px-5 py-2.5 text-sm text-[#141414]">
            New protocol
          </Link>
        </div>
        <StorageNote
          mode={mode}
          onRetry={() => {
            resetStorageProbe();
            refresh();
          }}
        />
        {note ? <p className="mt-4 text-sm text-[#ffb4b4]">{note}</p> : null}
        {rows === null ? <p className="mt-10 text-white/45">Loading…</p> : null}
        {rows && rows.length === 0 ? (
          <div className="mt-10 rounded-[28px] bg-white/[0.03] p-8 ring-1 ring-white/10">
            <h2 className="text-3xl tracking-[-0.04em]">Nothing here yet.</h2>
            <p className="mt-3 max-w-md text-white/55">Open a template or a blank canvas. The link appears when you publish.</p>
            <Link to="/crear/nuevo" className="mt-6 inline-block rounded-full bg-white px-5 py-3 text-sm text-[#141414]">
              Create
            </Link>
          </div>
        ) : null}
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {(rows ?? []).map((row) => (
            <li key={row.id} className="rounded-[28px] bg-white/[0.03] p-6 ring-1 ring-white/10">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em]">
                <span className="text-[#d6ff4a]">{templateName(row.template)}</span>
                <span className="text-white/35">{row.status === 'published' ? 'Published' : 'Draft'}</span>
              </div>
              <Link to={`/crear/${row.id}`} className="mt-3 block text-3xl tracking-[-0.04em]">
                {row.title || 'Untitled protocol'}
              </Link>
              <p className="mt-2 text-sm text-white/40">{when(row.updatedAt)}</p>
              {row.status === 'published' && row.slug ? (
                <a href={protocolUrl(row.slug)} className="mt-4 block truncate text-sm text-[#d6ff4a]" target="_blank" rel="noreferrer">
                  {protocolUrl(row.slug)}
                </a>
              ) : (
                <p className="mt-4 text-sm text-white/35">No link yet.</p>
              )}
              <div className="mt-5 flex gap-4 text-sm text-white/50">
                <Link to={`/crear/${row.id}`}>Edit</Link>
                {pending === row.id ? (
                  <button
                    type="button"
                    className="text-[#ff8d8d]"
                    onClick={() => {
                      void purgeDraft(row.id)
                        .then(refresh)
                        .catch((err: unknown) => setNote(err instanceof Error ? err.message : 'Could not delete it.'));
                    }}
                  >
                    Confirm
                  </button>
                ) : (
                  <button type="button" onClick={() => setPending(row.id)}>
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </main>
  );
}

function StorageNote({ mode, onRetry }: { mode: StorageMode | ''; onRetry: () => void }) {
  if (!mode || mode === 'off') return null;
  const text =
    mode === 'protocols'
      ? 'Protocols are stored in sendra_protocols, in the same Lumen database.'
      : 'The sendra_protocols table does not exist yet. The link already opens in this browser. If you sign in with your Lumen email, the protocol is saved in universes and can show up in that list. To separate them, run supabase/sendra.sql and press Retry.';
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.03] px-4 py-3 text-sm text-white/55 ring-1 ring-white/10">
      <p className="max-w-3xl">{text}</p>
      <button type="button" className="text-[#d6ff4a]" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
