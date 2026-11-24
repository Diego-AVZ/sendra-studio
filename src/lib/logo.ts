import { uid } from '@/lib/uid';
import { supabase } from '@/lib/supabase';

export const LOGO_BUCKET = 'sendra';

const MAX_BYTES = 5 * 1024 * 1024;

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

function kind(file: File) {
  const ext = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';
  if (MIME[ext]) return { ext: ext === 'jpeg' ? 'jpg' : ext, mime: MIME[ext] };
  const fromType = Object.entries(MIME).find(([, mime]) => mime === file.type);
  if (!fromType) return null;
  return { ext: fromType[0] === 'jpeg' ? 'jpg' : fromType[0], mime: fromType[1] };
}

function storageMessage(status: number, raw: string) {
  let message = '';
  try {
    const body = JSON.parse(raw) as { message?: string; error?: string };
    message = body.message || body.error || '';
  } catch {
    message = raw.trim();
  }
  if (status === 404 || /bucket not found/i.test(message)) {
    return `The ${LOGO_BUCKET} bucket is not in this Supabase project. Create a public bucket named ${LOGO_BUCKET}, then try again.`;
  }
  if (status === 401 || /jwt|not authenticated/i.test(message)) return 'Sign in to upload a logo.';
  if (status === 403 || /row-level security|unauthorized|permission/i.test(message)) {
    return `Storage refused the upload. The ${LOGO_BUCKET} bucket needs a policy that lets a signed-in user write files.`;
  }
  if (/mime|content type|invalid file/i.test(message)) return 'Supabase refused that file. Use a PNG, JPG, WebP, or SVG.';
  return message || 'Could not upload the logo.';
}

function sendFile(url: string, file: File, headers: Record<string, string>, onProgress?: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value);
    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable || event.total <= 0) return;
      onProgress(Math.max(1, Math.min(99, Math.round((event.loaded / event.total) * 100))));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(new Error(storageMessage(xhr.status, xhr.responseText || '')));
    };
    xhr.onerror = () => reject(new Error('The upload did not reach Supabase.'));
    const body = new FormData();
    body.append('cacheControl', '3600');
    body.append('', file);
    xhr.send(body);
  });
}

export async function uploadLogo(file: File, onProgress?: (pct: number) => void) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const picked = kind(file);
  if (!picked) throw new Error('Use a PNG, JPG, WebP, or SVG.');
  if (file.size > MAX_BYTES) throw new Error('That file is too large. Keep the logo under 5 MB.');
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new Error('Sign in to upload a logo.');
  const base = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const anon = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  if (!base || !anon) throw new Error('Supabase is not configured.');
  const payload = file.type === picked.mime ? file : new File([file], file.name, { type: picked.mime });
  const path = `${session.user.id}/${uid('logo')}.${picked.ext}`;
  const endpoint = `${base}/storage/v1/object/${LOGO_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
  onProgress?.(1);
  await sendFile(
    endpoint,
    payload,
    {
      authorization: `Bearer ${session.access_token}`,
      apikey: anon,
    },
    onProgress,
  );
  const pub = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Logo';
  return { src: pub.data.publicUrl, alt };
}
