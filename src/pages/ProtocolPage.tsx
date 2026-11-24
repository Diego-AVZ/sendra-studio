import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadPublic, readLocalBySlug } from '@/lib/drafts';
import { useTitle } from '@/lib/title';
import { ProtocolView } from '@/player/ProtocolView';
import { landingPage, type ProtocolDocument } from '@/schema/protocol';

export function ProtocolPage() {
  const { slug = '', page = '' } = useParams();
  const [doc, setDoc] = useState<ProtocolDocument | null>(null);
  const [missing, setMissing] = useState(false);
  useTitle(doc ? doc.meta.title : 'Protocol · Sendra');

  useEffect(() => {
    let alive = true;
    const local = readLocalBySlug(slug);
    const localOk = local?.meta.status === 'published' ? local : null;
    setDoc(localOk);
    setMissing(false);
    void loadPublic(slug).then((loaded) => {
      if (!alive) return;
      if (loaded) setDoc(loaded);
      else if (!localOk) setMissing(true);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  if (!doc) {
    return (
      <div className="grid h-dvh place-items-center bg-[#09090b] px-6 text-center text-white">
        <div>
          <p className="text-3xl tracking-[-0.04em]">{missing ? 'This protocol is not published.' : 'Opening…'}</p>
          {missing ? (
            <Link to="/" className="mt-6 inline-block text-[#d6ff4a]">
              Sendra Studio
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  const entry = landingPage(doc);
  const path = page || entry?.path || '';
  return <ProtocolView doc={doc} interactive pagePath={path} />;
}
