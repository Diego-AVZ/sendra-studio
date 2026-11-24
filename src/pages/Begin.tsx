import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { startProtocol } from '@/lib/drafts';
import { explain } from '@/lib/uid';
import { useTitle } from '@/lib/title';
import { TEMPLATES, type TemplateId } from '@/schema/templates';

export function Begin() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  useTitle('New protocol · Sendra Studio');

  async function open(which: TemplateId) {
    if (busy) return;
    setBusy(which);
    setNote('');
    try {
      navigate(`/crear/${await startProtocol(which)}`);
    } catch (err) {
      setBusy('');
      setNote(explain(err));
    }
  }

  return (
    <div className="min-h-dvh bg-[#09090b] text-white">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/crear" className="text-sm text-white/60">
          ← Protocols
        </Link>
        <span className="text-[12px] uppercase tracking-[0.22em]">New</span>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <h1 className="max-w-[12ch] text-5xl tracking-[-0.05em]">Pick a starting point.</h1>
        <p className="mt-4 max-w-xl text-white/55">
          Blank starts as one empty page. The other templates already wire a desk.
        </p>
        {note ? <p className="mt-4 text-sm text-[#ffb4b4]">{note}</p> : null}
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {TEMPLATES.map((item) => (
            <li key={item.id} className={item.id === 'propfirm' ? 'sm:col-span-2' : undefined}>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void open(item.id)}
                className={`flex h-full w-full flex-col rounded-[28px] p-6 text-left ring-1 hover:bg-white/[0.06] ${
                  item.id === 'propfirm' ? 'bg-[#d6ff4a]/[0.07] ring-[#d6ff4a]/45' : 'bg-white/[0.03] ring-white/10'
                }`}
              >
                <span className="text-[11px] uppercase tracking-[0.16em] text-[#d6ff4a]">{item.rails}</span>
                <span className="mt-4 text-3xl tracking-[-0.04em]">{busy === item.id ? 'Opening…' : item.name}</span>
                <span className="mt-3 text-sm leading-relaxed text-white/50">{item.line}</span>
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
