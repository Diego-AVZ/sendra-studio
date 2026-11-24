import { Link } from 'react-router-dom';
import { useTitle } from '@/lib/title';

export function Missing() {
  useTitle('Sendra Studio');
  return (
    <div className="grid h-dvh place-items-center bg-[#09090b] px-6 text-center text-white">
      <div>
        <p className="text-4xl tracking-[-0.04em]">That page is not here.</p>
        <Link to="/" className="mt-6 inline-block text-[#d6ff4a]">
          Back to the studio
        </Link>
      </div>
    </div>
  );
}
