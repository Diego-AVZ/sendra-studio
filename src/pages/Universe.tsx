import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { searchProtocols, type PublicProtocol } from '@/lib/cloud';
import { searchLocalPublished } from '@/lib/drafts';
import { protocolUrl } from '@/lib/site';
import { useTitle } from '@/lib/title';

function mergeHits(local: PublicProtocol[], remote: PublicProtocol[], query: string) {
  const map = new Map<string, PublicProtocol>();
  for (const row of local) map.set(row.slug.toLowerCase(), row);
  for (const row of remote) map.set(row.slug.toLowerCase(), row);
  const needle = query.trim().toLowerCase();
  return [...map.values()]
    .sort((a, b) => rank(a, needle) - rank(b, needle) || a.title.localeCompare(b.title))
    .slice(0, 12);
}

function rank(row: PublicProtocol, needle: string) {
  const title = row.title.toLowerCase();
  const slug = row.slug.toLowerCase();
  if (title === needle || slug === needle || slug === `snd-${needle}`) return 0;
  if (title.startsWith(needle) || slug.startsWith(needle)) return 1;
  return 2;
}

export function Universe() {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<PublicProtocol[] | null>(null);
  const [pending, setPending] = useState(false);
  useTitle('Sendra Universe');

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits(null);
      setPending(false);
      return;
    }
    const local = searchLocalPublished(q);
    setHits(local);
    setPending(true);
    let live = true;
    const timer = window.setTimeout(() => {
      void searchProtocols(q).then((remote) => {
        if (!live) return;
        setHits(mergeHits(searchLocalPublished(q), remote, q));
        setPending(false);
      });
    }, 160);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="min-h-dvh bg-[#09090b] text-white">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-8">
        <Link to="/" className="text-[12px] uppercase tracking-[0.22em]">
          Sendra Studio
        </Link>
        <Link to="/crear" className="text-sm text-white/55">
          Create
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <p className="text-[12px] uppercase tracking-[0.2em] text-[#d6ff4a]">Sendra Universe</p>
        <h1 className="mt-3 text-5xl tracking-[-0.05em]">Find a protocol.</h1>
        <p className="mt-4 max-w-xl text-white/55">Type the name. Published protocols appear as you write. Open one and connect a wallet.</p>
        <label className="mt-8 block">
          <span className="text-[11px] uppercase tracking-[0.16em] text-white/40">Name</span>
          <input
            value={query}
            autoFocus
            autoComplete="off"
            placeholder="Protocol name"
            onChange={(event) => setQuery(event.target.value)}
            className="mt-2 w-full rounded-2xl bg-white/[0.04] px-4 py-4 text-lg outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-[#d6ff4a]"
          />
        </label>
        {hits && hits.length > 0 ? (
          <ul className="mt-4 overflow-hidden rounded-2xl ring-1 ring-white/10">
            {hits.map((row) => (
              <li key={row.slug} className="border-t border-white/10 first:border-t-0">
                <Link to={`/p/${row.slug}`} className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-white/[0.04]">
                  <span>
                    <span className="block text-xl tracking-[-0.03em]">{row.title}</span>
                    <span className="mt-1 block truncate text-sm text-white/40">{protocolUrl(row.slug)}</span>
                  </span>
                  <span className="text-sm text-[#d6ff4a]">Open</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {hits && hits.length === 0 ? (
          <p className="mt-4 text-sm text-white/45">{pending ? 'Looking…' : 'No protocol with that name.'}</p>
        ) : null}
      </main>
    </div>
  );
}
