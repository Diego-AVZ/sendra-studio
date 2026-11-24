import { siteRoot } from '@/lib/site';
import { supabase } from '@/lib/supabase';

export function accountReturnTo() {
  return `${siteRoot()}/crear`;
}

export async function sendMagicLink(email: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: accountReturnTo() },
  });
  if (error) {
    const message = error.message || 'Could not send the email.';
    if (/redirect/i.test(message)) {
      throw new Error(`Add ${accountReturnTo()} in Supabase → Authentication → URL Configuration → Redirect URLs.`);
    }
    throw new Error(message);
  }
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
