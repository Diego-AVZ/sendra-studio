import { Component, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Begin } from '@/pages/Begin';
import { Hub } from '@/pages/Hub';
import { Landing } from '@/pages/Landing';
import { Missing } from '@/pages/Missing';
import { ProtocolPage } from '@/pages/ProtocolPage';
import { Studio } from '@/pages/Studio';
import { Universe } from '@/pages/Universe';
import { siteBase } from '@/lib/site';

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="grid h-dvh place-items-center bg-[#09090b] px-6 text-center text-white">
          <div>
            <p className="text-3xl tracking-[-0.04em]">The page stopped.</p>
            <button type="button" className="mt-6 rounded-full bg-[#d6ff4a] px-4 py-2 text-[#141414]" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <BrowserRouter basename={siteBase() || undefined}>
      <Boundary>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/universe" element={<Universe />} />
          <Route path="/crear" element={<Hub />} />
          <Route path="/crear/nuevo" element={<Begin />} />
          <Route path="/crear/:id" element={<Studio />} />
          <Route path="/p/:slug" element={<ProtocolPage />} />
          <Route path="/p/:slug/:page" element={<ProtocolPage />} />
          <Route path="*" element={<Missing />} />
        </Routes>
      </Boundary>
    </BrowserRouter>
  );
}
