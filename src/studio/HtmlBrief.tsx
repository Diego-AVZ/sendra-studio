import { useMemo, useState } from 'react';
import type { ProtocolDocument, StudioPage } from '@/schema/protocol';
import { Field, Menu, fieldClass } from '@/studio/ui';
import { findAppPage, landingPrompt, pageFact, promiseFrom } from '@/studio/htmlPrompt';

const TONES = ['Direct', 'Calm', 'Sharp', 'Editorial'];

export function HtmlBrief({ doc, page }: { doc: ProtocolDocument; page: StudioPage }) {
  const app = findAppPage(doc, page.id);
  const [name, setName] = useState(doc.meta.title);
  const [promise, setPromise] = useState(() => promiseFrom(doc));
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState(TONES[0]);
  const [cta, setCta] = useState('Launch app');
  const [language, setLanguage] = useState('English');
  const [extra, setExtra] = useState('');
  const [note, setNote] = useState('');
  const prompt = useMemo(
    () => landingPrompt({ doc, page, name, promise, audience, tone, cta, language, extra }),
    [audience, cta, doc, extra, language, name, page, promise, tone],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setNote('Prompt copied.');
    } catch {
      setNote('The prompt is in the box below. Select it and copy.');
    }
  }

  async function openClaude() {
    let copied = true;
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      copied = false;
    }
    const href = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
    const fits = href.length < 7000;
    window.open(fits ? href : 'https://claude.ai/new', '_blank', 'noopener,noreferrer');
    if (fits) setNote('Claude is opening with this prompt. Paste the HTML it returns below.');
    else setNote(copied ? 'Prompt copied. Paste it into Claude, then paste the HTML below.' : 'Claude is open. Copy the prompt below and paste it there.');
  }

  return (
    <section className="grid gap-4 rounded-[28px] bg-white/[0.03] p-5 ring-1 ring-white/10">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#d6ff4a]">Landing with HTML</p>
        <h2 className="mt-2 text-2xl tracking-[-0.04em]">Ask Claude for the page.</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          The prompt describes what a visitor can do in this app, plus the palette.
          {app ? ` Launch opens ${app.name}.` : ''}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Button">
          <input className={fieldClass} value={cta} onChange={(event) => setCta(event.target.value)} />
        </Field>
        <Field label="One sentence">
          <input className={fieldClass} value={promise} placeholder="What the visitor gets" onChange={(event) => setPromise(event.target.value)} />
        </Field>
        <Field label="Who it is for">
          <input className={fieldClass} value={audience} placeholder="One line" onChange={(event) => setAudience(event.target.value)} />
        </Field>
        <Field label="Tone">
          <Menu value={tone} options={TONES.map((item) => ({ value: item, label: item }))} onChange={setTone} />
        </Field>
        <Field label="Language">
          <Menu
            value={language}
            options={[
              { value: 'English', label: 'English' },
              { value: 'Spanish', label: 'Spanish' },
            ]}
            onChange={setLanguage}
          />
        </Field>
      </div>
      <Field label="Add to the prompt">
        <textarea
          className={`${fieldClass} min-h-20 resize-y`}
          value={extra}
          placeholder="A line Claude should also follow"
          onChange={(event) => setExtra(event.target.value)}
        />
      </Field>
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">Already built</p>
        <ul className="mt-2 grid gap-1 text-sm text-white/55">
          {doc.pages.map((item) => (
            <li key={item.id}>
              {item.name} {item.path ? `/${item.path}` : '/'} — {pageFact(item)}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-full bg-white px-4 py-2 text-sm text-[#141414]" onClick={() => void copy()}>
          Copy prompt
        </button>
        <button type="button" className="rounded-full bg-[#d6ff4a] px-4 py-2 text-sm text-[#141414]" onClick={() => void openClaude()}>
          Open in Claude
        </button>
      </div>
      {note ? <p className="text-sm text-white/70">{note}</p> : null}
      <details>
        <summary className="cursor-pointer text-sm text-white/45">Prompt</summary>
        <textarea readOnly value={prompt} className="mt-2 min-h-40 w-full rounded-2xl bg-black/40 p-4 font-mono text-xs text-white/80 outline-none ring-1 ring-white/10" />
      </details>
    </section>
  );
}
