export function siteBase() {
  return import.meta.env.BASE_URL.replace(/\/$/, '');
}

export function siteRoot() {
  if (typeof window === 'undefined') return siteBase();
  return `${window.location.origin}${siteBase()}`;
}

export function protocolUrl(slug: string) {
  return `${siteRoot()}/p/${slug}`;
}
