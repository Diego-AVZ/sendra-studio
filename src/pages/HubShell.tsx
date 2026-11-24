import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AccountBar } from '@/studio/AccountBar';

export type HubVista = 'protocols' | 'metrics';

const ITEMS: { id: HubVista | 'create'; label: string; hint: string; mark: string; accent?: boolean }[] = [
  { id: 'protocols', label: 'My protocols', hint: 'Drafts and published links', mark: '✦' },
  { id: 'metrics', label: 'Metrics', hint: 'Positions, fees, wallets, assets', mark: '▤' },
  { id: 'create', label: 'Create', hint: 'Start a new desk', mark: '+', accent: true },
];

export function HubShell({ vista, children }: { vista: HubVista; children: ReactNode }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 1024));

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [vista]);

  const go = (id: HubVista | 'create') => {
    if (id === 'create') navigate('/crear/nuevo');
    else if (id === 'metrics') navigate('/crear?vista=metrics');
    else navigate('/crear');
  };

  const railOpen = wide || open;

  return (
    <div className="min-h-dvh bg-[#09090b] text-white">
      {open && !wide ? (
        <button type="button" className="fixed inset-0 z-40 bg-black/50" aria-label="Close menu" onClick={() => setOpen(false)} />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[17.5rem] flex-col overflow-y-auto border-r border-white/10 bg-[#101012] px-4 py-5 transition-transform duration-300 ${
          railOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Link to="/" className="px-2">
          <p className="text-[1.65rem] font-extrabold leading-none tracking-[-0.04em]">Sendra Studio</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-[#d6ff4a]/80">Control desk</p>
        </Link>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Studio">
          {ITEMS.map((item) => {
            const active = item.id === vista;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                className={`flex items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                  item.accent
                    ? active
                      ? 'bg-[#d6ff4a] text-[#141414]'
                      : 'bg-[#d6ff4a]/12 text-white hover:bg-[#d6ff4a]/20'
                    : active
                      ? 'bg-white/10 text-white'
                      : 'text-white/55 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] ${
                    item.accent && !active ? 'bg-[#d6ff4a] text-[#141414]' : item.accent && active ? 'bg-[#141414]/10' : 'bg-white/10'
                  }`}
                >
                  {item.mark}
                </span>
                <span>
                  <span className="block text-[15px]">{item.label}</span>
                  <span className={`mt-0.5 block text-[12px] ${item.accent && active ? 'text-[#141414]/60' : 'text-white/40'}`}>{item.hint}</span>
                </span>
              </button>
            );
          })}
        </nav>
        <div className="mt-auto shrink-0 rounded-2xl bg-white/5 px-3 py-3 [&_form]:flex-col [&_form]:items-stretch [&_input]:w-full">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#d6ff4a]/75">Account</p>
          <div className="mt-2">
            <AccountBar />
          </div>
        </div>
      </aside>

      <div className={wide ? 'pl-[17.5rem]' : ''}>
        {!wide ? (
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#101012]/90 px-4 py-3 backdrop-blur-md">
            <button type="button" onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label="Open menu">
              <span className="flex w-4 flex-col gap-1" aria-hidden="true">
                <span className="h-0.5 rounded-full bg-white" />
                <span className="h-0.5 rounded-full bg-white" />
                <span className="h-0.5 rounded-full bg-white" />
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-extrabold leading-none tracking-[-0.04em]">Sendra Studio</p>
              <p className="mt-1 truncate text-[11px] uppercase tracking-[0.16em] text-[#d6ff4a]/80">
                {ITEMS.find((item) => item.id === vista)?.label}
              </p>
            </div>
            <button type="button" onClick={() => go('create')} className="rounded-full bg-[#d6ff4a] px-4 py-2 text-[13px] text-[#141414]">
              Create
            </button>
          </header>
        ) : null}
        {children}
      </div>
    </div>
  );
}
