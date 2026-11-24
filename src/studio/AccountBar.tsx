import { useState } from 'react';
import { sendMagicLink, signOut } from '@/lib/auth';
import { useSession } from '@/lib/session';
import { cloudEnabled } from '@/lib/supabase';
import { fieldClass } from '@/studio/ui';

export function AccountBar() {
  const { user, ready } = useSession();
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (!cloudEnabled()) return <p className="text-sm text-white/45">No Supabase. The link works in this browser.</p>;
  if (!ready) return <p className="text-sm text-white/40">Account…</p>;
  if (user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="max-w-[220px] truncate text-white/70">{user.email}</span>
        <button type="button" className="text-white/45" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setNote('');
        void sendMagicLink(email)
          .then(() => setNote('Check your email. The link brings you back to the studio.'))
          .catch((err: unknown) => setNote(err instanceof Error ? err.message : 'Could not send it.'))
          .finally(() => setBusy(false));
      }}
    >
      <input
        className={`${fieldClass} mt-0 w-52`}
        type="email"
        required
        placeholder="you@email.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <button type="submit" className="rounded-full bg-white px-3 py-2 text-sm text-[#141414]" disabled={busy}>
        {busy ? 'Sending…' : 'Sign in'}
      </button>
      {note ? <p className="w-full text-sm text-white/55">{note}</p> : null}
    </form>
  );
}
