import { useEffect } from 'react';
import type { Theme } from '@/schema/protocol';

export function HtmlFrame({
  html,
  theme,
  fill = false,
  appPath = 'home',
  appUrl = '',
  onGo,
}: {
  html: string;
  theme: Theme;
  fill?: boolean;
  appPath?: string;
  appUrl?: string;
  onGo?: (path: string) => void;
}) {
  const trimmed = html.trim();
  const full = /^<!doctype|^<html/i.test(trimmed);
  const srcDoc = withBridge(
    full
      ? trimmed
      : `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:${theme.paper};color:${theme.ink};font-family:Manrope,sans-serif}</style></head><body>${trimmed}</body></html>`,
    appPath,
    appUrl,
  );

  useEffect(() => {
    if (!onGo) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { source?: string; path?: string } | null;
      if (!data || data.source !== 'sendra-html' || typeof data.path !== 'string') return;
      onGo(data.path);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onGo]);

  return (
    <iframe
      title="Custom HTML"
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
      srcDoc={srcDoc}
      className={fill ? 'block h-full min-h-0 w-full flex-1 border-0' : 'min-h-[70vh] w-full border-0 bg-transparent'}
    />
  );
}

function withBridge(html: string, appPath: string, appUrl: string) {
  const script = `<script>(function(){var path=${JSON.stringify(appPath)};var url=${JSON.stringify(appUrl)};document.addEventListener('click',function(event){var node=event.target&&event.target.closest?event.target.closest('[data-sendra-go],a'):null;if(!node)return;var marked=node.getAttribute('data-sendra-go');var href=node.getAttribute('href')||'';if(!marked&&href!==url)return;event.preventDefault();try{parent.postMessage({source:'sendra-html',path:marked||path},'*');}catch(e){}});})();</script>`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${script}</body>`) : `${html}${script}`;
}
