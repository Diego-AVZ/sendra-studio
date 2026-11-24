import { useEffect, useState } from 'react';
import { protocolClash } from '@/lib/cloud';
import { saveDraft, shareOnLan, slugTaken } from '@/lib/drafts';
import { useSession } from '@/lib/session';
import { protocolUrl } from '@/lib/site';
import { cloudEnabled } from '@/lib/supabase';
import { normalizeSlug, slugFromTitle } from '@/lib/uid';
import { ProtocolView } from '@/player/ProtocolView';
import type { ProtocolDocument } from '@/schema/protocol';
import { AccountBar } from '@/studio/AccountBar';
import { PhoneStage } from '@/studio/PhoneStage';
import { fieldClass } from '@/studio/ui';

function useLanOrigin() {
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let live = true;
    void fetch('/__lan.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { urls?: string[] } | null) => {
        const next = data?.urls?.[0];
        if (live && next) setOrigin(next.replace(/\/$/, ''));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return origin;
}

export function PublishDialog({
  doc,
  onClose,
  onSaved,
}: {
  doc: ProtocolDocument;
  onClose: () => void;
  onSaved: (doc: ProtocolDocument) => void;
}) {
  const { user } = useSession();
  const [slug, setSlug] = useState(doc.meta.slug || slugFromTitle(doc.meta.title));
  const [note, setNote] = useState('');
  const [link, setLink] = useState(doc.meta.status === 'published' && doc.meta.slug ? protocolUrl(doc.meta.slug) : '');
  const [where, setWhere] = useState<'local' | 'remote' | ''>('');
  const [busy, setBusy] = useState(false);
  const [clash, setClash] = useState('');
  const [copied, setCopied] = useState('');
  const origin = useLanOrigin();
  const clean = normalizeSlug(slug);
  const phoneUrl = origin && clean ? `${origin}/p/${clean}` : '';

  useEffect(() => {
    if (doc.meta.status === 'published') shareOnLan(doc);
  }, [doc]);

  useEffect(() => {
    if (!clean) {
      setClash('');
      return;
    }
    if (slugTaken(clean, doc.meta.id)) {
      setClash('That link already exists.');
      return;
    }
    let live = true;
    const timer = window.setTimeout(() => {
      void protocolClash({ title: slug.trim(), slug: clean, exceptId: doc.meta.id }).then((hit) => {
        if (!live) return;
        if (hit.slug) setClash('That link already exists.');
        else if (hit.title) setClash('A protocol with this name already exists.');
        else setClash('');
      });
    }, 220);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [clean, slug, doc.meta.id]);

  const copy = (value: string) => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(value);
      window.setTimeout(() => setCopied(''), 1400);
    });
  };

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/70 px-4 py-4">
      <div className="grid max-h-[92dvh] w-full max-w-5xl overflow-hidden rounded-3xl bg-[#14161c] text-white ring-1 ring-white/10 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-h-0 overflow-auto p-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#d6ff4a]">Publish</p>
        <h2 className="mt-2 text-3xl tracking-[-0.04em]">A link for this protocol.</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/55">
          Anyone who opens it connects a wallet and signs on Arbitrum. In this browser the link works right away.
          {cloudEnabled() ? ' With an account, it also opens on another device.' : ''}
        </p>
        <label className="mt-5 block">
          <span className="text-[11px] uppercase tracking-[0.16em] text-white/40">Link</span>
          <input className={fieldClass} value={slug} onChange={(event) => setSlug(event.target.value)} />
        </label>
        <p className="mt-2 truncate text-xs text-white/40">{clean ? protocolUrl(clean) : 'Enter a name.'}</p>
        {clash ? <p className="mt-2 text-sm text-[#ffb4b4]">{clash}</p> : null}
        <div className="mt-5">
          <AccountBar />
        </div>
        {note ? <p className="mt-4 text-sm text-[#ffb4b4]">{note}</p> : null}
        {link ? (
          <div className="mt-4 rounded-2xl bg-white/5 p-4">
            <p className="text-sm text-white/70">{where === 'remote' ? 'Published to Supabase.' : 'Published in this browser.'}</p>
            <a href={link} className="mt-2 block truncate text-sm text-[#d6ff4a]" target="_blank" rel="noreferrer">
              {link}
            </a>
            <button type="button" className="mt-3 text-sm text-white/70" onClick={() => copy(link)}>
              {copied === link ? 'Copied' : 'Copy link'}
            </button>
          </div>
        ) : null}
        {phoneUrl ? (
          <div className="mt-4 rounded-2xl bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#d6ff4a]">On your phone</p>
            <p className="mt-2 text-sm text-white/55">
              {doc.meta.status === 'published' || link ? 'Same Wi-Fi. Open the published page on your phone.' : 'Same Wi-Fi. Publish, then open this on your phone.'}
            </p>
            <a href={phoneUrl} className="mt-2 block truncate text-sm text-[#d6ff4a]" target="_blank" rel="noreferrer">
              {phoneUrl}
            </a>
            <button type="button" className="mt-3 text-sm text-white/70" onClick={() => copy(phoneUrl)}>
              {copied === phoneUrl ? 'Copied' : 'Copy phone link'}
            </button>
          </div>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="px-3 py-2 text-sm text-white/60" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-full bg-[#d6ff4a] px-4 py-2 text-sm text-[#141414] disabled:opacity-50"
            onClick={() => {
              if (!clean) {
                setNote('Enter a link.');
                return;
              }
              if (slugTaken(clean, doc.meta.id)) {
                setNote('That link already exists.');
                return;
              }
              const next: ProtocolDocument = {
                ...doc,
                meta: {
                  ...doc.meta,
                  slug: clean,
                  status: 'published',
                  publishedAt: doc.meta.publishedAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              };
              setBusy(true);
              setNote('');
              void protocolClash({ title: slug.trim(), slug: clean, exceptId: doc.meta.id })
                .then((hit) => {
                  if (hit.slug) {
                    setClash('That link already exists.');
                    setNote('That link already exists.');
                    return;
                  }
                  if (hit.title) setClash('A protocol with this name already exists.');
                  return saveDraft(next).then((saved) => {
                    onSaved(next);
                    setWhere(saved);
                    setLink(protocolUrl(clean));
                    if (saved === 'local' && cloudEnabled() && !user) {
                      setNote('The link already opens here. Sign in with your email to open it somewhere else.');
                    }
                  });
                })
                .catch((err: unknown) => {
                  onSaved(next);
                  setLink(protocolUrl(clean));
                  setWhere('local');
                  setNote(err instanceof Error ? err.message : 'Could not save to the cloud.');
                })
                .finally(() => setBusy(false));
            }}
          >
            {busy ? 'Publishing…' : 'Publish'}
          </button>
        </div>
        </div>
        <div className="flex h-[min(720px,68dvh)] min-h-0 flex-col border-t border-white/10 bg-[#09090b] lg:h-full lg:border-l lg:border-t-0">
          <p className="shrink-0 px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-white/40">Deployed</p>
          <PhoneStage>
            <ProtocolView doc={{ ...doc, meta: { ...doc.meta, slug: clean || doc.meta.slug } }} interactive framed layout="mobile" />
          </PhoneStage>
        </div>
      </div>
    </div>
  );
}
