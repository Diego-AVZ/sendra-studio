import { useRef, useState } from 'react';
import { shortAddr, uid } from '@/lib/uid';
import { clampFrame, frameOf } from '@/schema/layout';
import {
  BACKGROUNDS,
  BUTTONS,
  FONTS,
  INPUTS,
  PRESET_LIST,
  PRESETS,
  CHART_INTERVALS,
  PAIR_COINS,
  PAIR_PANELS,
  PAIR_RISKS,
  PAIR_STATS,
  PAIR_VIEWS,
  SPOT_ASSETS,
  AAVE_ASSETS,
  AAVE_STRATEGIES,
  MENU_CAP,
  MULTI_CAP,
  WIDTHS,
  pageWidth,
  PALETTE,
  WALLET_LOOKS,
  PAIRS,
  FEES,
  PAD_MAX,
  blockName,
  blockPad,
  createBlock,
  labelOf,
  defaultAction,
  inkFor,
  pageSlug,
  type Action,
  type Block,
  type MenuBlock,
  type Frame,
  type SpotAsset,
  type ProtocolDocument,
  type StudioPage,
  type Theme,
} from '@/schema/protocol';
import { RAILS } from '@/web3/addresses';
import { Field, Menu, fieldClass } from '@/studio/ui';

function keepAssets(current: SpotAsset[], asset: SpotAsset) {
  const on = current.includes(asset);
  if (on && current.length === 1) return current;
  return SPOT_ASSETS.filter((item) => (item === asset ? !on : current.includes(item)));
}

function toggleList<T extends string>(options: readonly T[], current: readonly T[], item: T) {
  const on = current.includes(item);
  if (on && current.length === 1) return [...current];
  return options.filter((option) => (option === item ? !on : current.includes(option)));
}

function Chips<T extends string>({
  options,
  value,
  label,
  onChange,
}: {
  options: readonly T[];
  value: readonly T[];
  label: (item: T) => string;
  onChange: (next: T[]) => void;
}) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {options.map((item) => {
        const on = value.includes(item);
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(toggleList(options, value, item))}
            className={`rounded-full px-2.5 py-1 text-xs ${on ? 'bg-[#d6ff4a] text-[#141414]' : 'bg-white/5 text-white/70'}`}
          >
            {label(item)}
          </button>
        );
      })}
    </div>
  );
}

function Markets({ value, onChange }: { value: SpotAsset[]; onChange: (assets: SpotAsset[]) => void }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {SPOT_ASSETS.map((asset) => {
        const on = value.includes(asset);
        return (
          <button
            key={asset}
            type="button"
            onClick={() => onChange(keepAssets(value, asset))}
            className={`rounded-full px-2.5 py-1 text-xs ${on ? 'bg-[#d6ff4a] text-[#141414]' : 'bg-white/5 text-white/70'}`}
          >
            {asset}
          </button>
        );
      })}
    </div>
  );
}

function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { id: T; name: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {options.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`rounded-full px-2.5 py-1 text-xs ${value === item.id ? 'bg-[#d6ff4a] text-[#141414]' : 'bg-white/5 text-white/70'}`}
        >
          {item.name}
        </button>
      ))}
    </div>
  );
}

export function Inspector({
  doc,
  page,
  selected,
  onTheme,
  onPage,
  onPatch,
  onNudge,
  onFrame,
  onDuplicate,
  onRemove,
  logoJob,
  onLogoFile,
}: {
  doc: ProtocolDocument;
  page: StudioPage;
  selected: string | null;
  onTheme: (patch: Partial<Theme>) => void;
  onPage: (recipe: (page: StudioPage) => StudioPage) => void;
  onPatch: (id: string, recipe: (block: Block) => Block) => void;
  onNudge: (id: string, dx: number, dy: number) => void;
  onFrame: (id: string, frame: Partial<Frame>) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  logoJob?: { id: string; pct: number; error: string } | null;
  onLogoFile?: (id: string, file: File) => void;
}) {
  const theme = doc.theme;
  const block = page.blocks.find((item) => item.id === selected) ?? null;

  return (
    <aside className="order-3 min-h-0 overflow-auto border-white/10 px-4 py-4 lg:border-l">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#d6ff4a]">Appearance</p>
      <div className="mt-3 grid gap-4">
        <Field label="Palette">
          <div className="mt-1.5 flex flex-wrap gap-2">
            {PRESET_LIST.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-label={item.name}
                title={item.name}
                onClick={() => onTheme({ ...PRESETS[item.id], preset: item.id })}
                className="h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-[#0e0f12]"
                style={{
                  background: PRESETS[item.id].accent,
                  boxShadow: theme.preset === item.id ? '0 0 0 2px #fff' : undefined,
                }}
              />
            ))}
          </div>
        </Field>
        <Field label="Type">
          <Choice value={theme.font} options={FONTS} onChange={(font) => onTheme({ font })} />
        </Field>
        <Field label="Background">
          <Choice value={theme.background} options={BACKGROUNDS} onChange={(background) => onTheme({ background })} />
        </Field>
        <Field label="Buttons">
          <Choice value={theme.button} options={BUTTONS} onChange={(button) => onTheme({ button })} />
        </Field>
        <Field label="Inputs">
          <Choice value={theme.input} options={INPUTS} onChange={(input) => onTheme({ input })} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Ink">
            <input className={fieldClass} type="color" value={theme.ink} onChange={(event) => onTheme({ ink: event.target.value, preset: 'custom' })} />
          </Field>
          <Field label="Paper">
            <input className={fieldClass} type="color" value={theme.paper} onChange={(event) => onTheme({ paper: event.target.value, preset: 'custom' })} />
          </Field>
          <Field label="Accent">
            <input
              className={fieldClass}
              type="color"
              value={theme.accent}
              onChange={(event) => onTheme({ accent: event.target.value, accentInk: inkFor(event.target.value), preset: 'custom' })}
            />
          </Field>
          <Field label={`Radius ${theme.radius}`}>
            <input
              className="mt-3 w-full"
              type="range"
              min={0}
              max={32}
              value={theme.radius}
              onChange={(event) => onTheme({ radius: Number(event.target.value) })}
            />
          </Field>
        </div>
        <Field label={`Column ${pageWidth(theme.width)}%`}>
          <Choice
            value={String(WIDTHS.find((item) => item.id === pageWidth(theme.width))?.id ?? '')}
            options={WIDTHS.map((item) => ({ id: String(item.id), name: item.name }))}
            onChange={(id) => onTheme({ width: Number(id) })}
          />
          <input className="mt-3 w-full" type="range" min={36} max={100} value={pageWidth(theme.width)} onChange={(event) => onTheme({ width: Number(event.target.value) })} />
        </Field>
        <button type="button" className={`w-fit rounded-full px-3 py-1.5 text-sm ${theme.credit ? 'bg-white text-[#141414]' : 'bg-white/5 text-white/70'}`} onClick={() => onTheme({ credit: !theme.credit })}>
          {theme.credit ? 'Credit on' : 'Credit off'}
        </button>
      </div>

      <div className="mt-8 border-t border-white/10 pt-5">
        {block ? (
          <BlockEditor
            pages={doc.pages}
            block={block}
            onPatch={onPatch}
            onNudge={onNudge}
            onFrame={onFrame}
            onDuplicate={onDuplicate}
            onRemove={onRemove}
            logoJob={logoJob}
            onLogoFile={onLogoFile}
          />
        ) : (
          <PageFields page={page} pages={doc.pages} onPage={onPage} />
        )}
      </div>

      <details className="mt-8 text-xs text-white/40">
        <summary className="cursor-pointer uppercase tracking-[0.16em]">Sendra execution</summary>
        <ul className="mt-3 space-y-2">
          {RAILS.map((rail) => (
            <li key={rail.name}>
              <span className="text-white/70">{rail.name}</span>
              <span className="mt-0.5 block font-mono text-[11px]">{shortAddr(rail.address)} · {rail.contract}</span>
            </li>
          ))}
        </ul>
      </details>
    </aside>
  );
}

function PageFields({
  page,
  pages,
  onPage,
}: {
  page: StudioPage;
  pages: StudioPage[];
  onPage: (recipe: (page: StudioPage) => StudioPage) => void;
}) {
  return (
    <div className="grid gap-4">
      <Field label="Name">
        <input className={fieldClass} value={page.name} onChange={(event) => onPage((current) => ({ ...current, name: event.target.value }))} />
      </Field>
      <Field label="Route">
        <input
          className={fieldClass}
          value={page.path}
          placeholder="blank uses the page name"
          onChange={(event) => {
            const path = pageSlug(event.target.value);
            if (pages.some((item) => item.id !== page.id && item.path === path)) return;
            onPage((current) => ({ ...current, path }));
          }}
        />
      </Field>
      <Field label="Kind">
        <Menu
          value={page.kind}
          options={[
            { value: 'canvas', label: 'Modules' },
            { value: 'html', label: 'HTML' },
            { value: 'portfolio', label: 'Portfolio · SendraStorage' },
          ]}
          onChange={(kind) => onPage((current) => ({ ...current, kind }))}
        />
      </Field>
      {page.kind === 'canvas' ? <p className="text-sm leading-relaxed text-white/45">Select a block on the grid to edit it. Drag to any column, then pull the edges for width and height.</p> : null}
      {page.kind === 'html' ? (
        <p className="text-sm leading-relaxed text-white/45">
          Fill the brief, copy the prompt or open Claude, then paste the HTML here. Preview shows that page full screen. The launch button opens the app.
        </p>
      ) : null}
      {page.kind === 'portfolio' ? <p className="text-sm leading-relaxed text-white/45">Visitors connect a wallet and read their positions from SendraStorage on Arbitrum.</p> : null}
    </div>
  );
}

function LogoFields({
  block,
  job,
  onPatch,
  onFile,
}: {
  block: Extract<Block, { type: 'logo' }>;
  job: { id: string; pct: number; error: string } | null;
  onPatch: (recipe: (block: Block) => Block) => void;
  onFile: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const busy = job?.id === block.id && !job.error;
  const error = job?.id === block.id ? job.error : '';
  return (
    <>
      <Field label="File">
        <input
          ref={input}
          className="hidden"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onFile(file);
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="mt-1.5 rounded-full bg-white px-3 py-2 text-sm text-[#141414] disabled:opacity-50"
        >
          {busy ? 'Uploading…' : block.src ? 'Replace' : 'Choose file'}
        </button>
      </Field>
      {busy ? (
        <div>
          <p className="text-sm text-white/55">{job && job.pct > 0 ? `Uploading… ${job.pct}%` : 'Uploading…'}</p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-[#d6ff4a]" style={{ width: `${Math.max(job?.pct ?? 0, 8)}%` }} />
          </div>
        </div>
      ) : null}
      {error ? <p className="text-sm text-[#ffb4b4]">{error}</p> : null}
      <p className="text-sm leading-relaxed text-white/45">PNG, JPG, WebP, or SVG. The public link stays with the protocol.</p>
      <Field label="Label">
        <input
          className={fieldClass}
          value={block.alt}
          onChange={(event) => onPatch((current) => (current.type === 'logo' ? { ...current, alt: event.target.value } : current))}
        />
      </Field>
    </>
  );
}

function MultiSlots({
  block,
  set,
  nested,
}: {
  block: Extract<Block, { type: 'multi' }>;
  set: (recipe: (block: Block) => Block) => void;
  nested: boolean;
}) {
  const [pick, setPick] = useState('');
  const choices = PALETTE.filter((item) => (nested ? item.type !== 'multi' : true));
  function add(id: string) {
    const entry = choices.find((item) => item.id === id);
    if (!entry) return;
    set((current) => {
      if (current.type !== 'multi' || current.items.length >= MULTI_CAP) return current;
      const items = [...current.items, createBlock(entry.type, entry.variant)];
      return { ...current, items, active: items.length - 1 };
    });
    setPick('');
  }
  function move(index: number, dir: -1 | 1) {
    set((current) => {
      if (current.type !== 'multi') return current;
      const next = index + dir;
      if (next < 0 || next >= current.items.length) return current;
      const items = [...current.items];
      const [row] = items.splice(index, 1);
      items.splice(next, 0, row);
      const active = current.active === index ? next : current.active === next ? index : current.active;
      return { ...current, items, active };
    });
  }
  function remove(index: number) {
    set((current) => {
      if (current.type !== 'multi') return current;
      const items = current.items.filter((_, itemIndex) => itemIndex !== index);
      const active = Math.min(
        current.active === index ? Math.max(0, index - 1) : current.active > index ? current.active - 1 : current.active,
        Math.max(0, items.length - 1),
      );
      return { ...current, items, active };
    });
  }
  return (
    <>
      <Field label="Title">
        <input className={fieldClass} value={block.title} onChange={(event) => set((current) => (current.type === 'multi' ? { ...current, title: event.target.value } : current))} />
      </Field>
      <Field label={`Modules ${block.items.length} / ${MULTI_CAP}`}>
        <div className="mt-1.5 grid gap-1.5">
          {block.items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => set((current) => (current.type === 'multi' ? { ...current, active: index } : current))}
                className={`min-w-0 flex-1 truncate rounded-full px-3 py-1 text-left text-xs ${index === block.active ? 'bg-[#d6ff4a] text-[#141414]' : 'bg-white/5 text-white/70'}`}
              >
                {labelOf(item)}
              </button>
              <button type="button" className="rounded-full bg-white/5 px-2 py-1 text-xs text-white/60" onClick={() => move(index, -1)}>
                Up
              </button>
              <button type="button" className="rounded-full bg-white/5 px-2 py-1 text-xs text-white/60" onClick={() => move(index, 1)}>
                Down
              </button>
              <button type="button" className="rounded-full px-2 py-1 text-xs text-[#ff8d8d]" onClick={() => remove(index)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </Field>
      {block.items.length < MULTI_CAP ? (
        <Field label="Add">
          <Menu
            value={pick}
            options={[{ value: '', label: 'Choose a module' }, ...choices.map((item) => ({ value: item.id, label: item.name }))]}
            onChange={(id) => {
              if (id) add(id);
            }}
          />
        </Field>
      ) : null}
    </>
  );
}

function BlockEditor({
  pages,
  block,
  onPatch,
  onNudge,
  onFrame,
  onDuplicate,
  onRemove,
  logoJob = null,
  onLogoFile,
  bare = false,
}: {
  pages: StudioPage[];
  block: Block;
  bare?: boolean;
  onPatch: (id: string, recipe: (block: Block) => Block) => void;
  onNudge: (id: string, dx: number, dy: number) => void;
  onFrame: (id: string, frame: Partial<Frame>) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  logoJob?: { id: string; pct: number; error: string } | null;
  onLogoFile?: (id: string, file: File) => void;
}) {
  const set = (recipe: (block: Block) => Block) => onPatch(block.id, recipe);
  const frame = clampFrame(frameOf(block));
  const child = block.type === 'multi' && block.items.length ? block.items[Math.max(0, Math.min(block.items.length - 1, block.active))] : null;
  return (
    <div className="grid gap-4">
      {bare ? null : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">{block.type === 'multi' || block.type === 'aave' ? labelOf(block) : blockName(block.type)}</p>
            <div className="flex gap-2 text-xs text-white/55">
              <button type="button" onClick={() => onDuplicate(block.id)}>Duplicate</button>
              <button type="button" className="text-[#ff8d8d]" onClick={() => onRemove(block.id)}>Remove</button>
            </div>
          </div>
          <div className="flex gap-2 text-xs text-white/70">
            <button type="button" className="rounded-full bg-white/5 px-2 py-1" onClick={() => onNudge(block.id, -1, 0)}>Left</button>
            <button type="button" className="rounded-full bg-white/5 px-2 py-1" onClick={() => onNudge(block.id, 1, 0)}>Right</button>
            <button type="button" className="rounded-full bg-white/5 px-2 py-1" onClick={() => onNudge(block.id, 0, -1)}>Up</button>
            <button type="button" className="rounded-full bg-white/5 px-2 py-1" onClick={() => onNudge(block.id, 0, 1)}>Down</button>
          </div>
          <Field label={`Width ${frame.span} / 7`}>
            <input className="mt-3 w-full" type="range" min={1} max={7} value={frame.span} onChange={(event) => onFrame(block.id, { span: Number(event.target.value) })} />
          </Field>
          <Field label={`Height ${frame.rows}`}>
            <input className="mt-3 w-full" type="range" min={1} max={24} value={frame.rows} onChange={(event) => onFrame(block.id, { rows: Number(event.target.value) })} />
          </Field>
        </>
      )}
      {block.type !== 'spacer' ? (
        <Field label={`Padding ${blockPad(block)}`}>
          <input
            className="mt-3 w-full"
            type="range"
            min={0}
            max={PAD_MAX}
            value={blockPad(block)}
            onChange={(event) => set((current) => ({ ...current, pad: Number(event.target.value) }))}
          />
        </Field>
      ) : null}
      {block.type === 'multi' ? <MultiSlots block={block} set={set} nested={bare} /> : null}
      {child ? (
        <div className="grid gap-4 border-t border-white/10 pt-4">
          <BlockEditor
            bare
            pages={pages}
            block={child}
            onPatch={(id, recipe) =>
              set((current) => {
                if (current.type !== 'multi') return current;
                return { ...current, items: current.items.map((item) => (item.id === id ? recipe(item) : item)) };
              })
            }
            onNudge={onNudge}
            onFrame={onFrame}
            onDuplicate={onDuplicate}
            onRemove={onRemove}
            logoJob={logoJob}
            onLogoFile={onLogoFile}
          />
        </div>
      ) : null}
      {block.type === 'portfolio' ? (
        <p className="text-sm leading-relaxed text-white/45">The Sendra book. Width and height change the panel: narrow stacks the figures, short keeps the total.</p>
      ) : null}
      {block.type === 'calendar' || block.type === 'pulse' || block.type === 'dashboard' ? (
        <>
          <p className="text-sm leading-relaxed text-white/45">
            {block.type === 'calendar'
              ? 'The connected wallet’s positions, painted on the month and the year.'
              : block.type === 'pulse'
                ? 'Tier, score, and the five reputation factors from SendraStorage.'
                : 'Value, PnL, capital, and a count for each open strategy.'}
          </p>
          <Field label="Title">
            <input
              className={fieldClass}
              value={block.title}
              onChange={(event) =>
                set((current) =>
                  current.type === 'calendar' || current.type === 'pulse' || current.type === 'dashboard' ? { ...current, title: event.target.value } : current,
                )
              }
            />
          </Field>
        </>
      ) : null}
      {block.type === 'hero' || block.type === 'text' ? (
        <>
          <Field label="Kicker">
            <input className={fieldClass} value={block.kicker} onChange={(event) => set((current) => (current.type === block.type ? { ...current, kicker: event.target.value } : current))} />
          </Field>
          <Field label="Title">
            <input className={fieldClass} value={block.title} onChange={(event) => set((current) => (current.type === block.type ? { ...current, title: event.target.value } : current))} />
          </Field>
          <Field label="Text">
            <textarea className={`${fieldClass} min-h-24`} value={block.body} onChange={(event) => set((current) => (current.type === block.type ? { ...current, body: event.target.value } : current))} />
          </Field>
        </>
      ) : null}
      {block.type === 'metric' ? (
        <>
          <Field label="Label">
            <input className={fieldClass} value={block.label} onChange={(event) => set((current) => (current.type === 'metric' ? { ...current, label: event.target.value } : current))} />
          </Field>
          <Field label="Figure">
            <input className={fieldClass} value={block.value} onChange={(event) => set((current) => (current.type === 'metric' ? { ...current, value: event.target.value } : current))} />
          </Field>
          <Field label="Note">
            <input className={fieldClass} value={block.hint} onChange={(event) => set((current) => (current.type === 'metric' ? { ...current, hint: event.target.value } : current))} />
          </Field>
        </>
      ) : null}
      {block.type === 'logo' ? <LogoFields block={block} job={logoJob} onPatch={set} onFile={(file) => onLogoFile?.(block.id, file)} /> : null}
      {block.type === 'field' ? (
        <>
          <Field label="Label">
            <input className={fieldClass} value={block.label} onChange={(event) => set((current) => (current.type === 'field' ? { ...current, label: event.target.value } : current))} />
          </Field>
          <Field label="Placeholder">
            <input className={fieldClass} value={block.placeholder} onChange={(event) => set((current) => (current.type === 'field' ? { ...current, placeholder: event.target.value } : current))} />
          </Field>
          <Field label="Key">
            <input className={fieldClass} value={block.key} onChange={(event) => set((current) => (current.type === 'field' ? { ...current, key: event.target.value.trim() } : current))} />
          </Field>
          <Field label="Style">
            <Menu
              value={block.input}
              options={[{ value: 'theme' as const, label: 'Theme' }, ...INPUTS.map((item) => ({ value: item.id, label: item.name }))]}
              onChange={(input) => set((current) => (current.type === 'field' ? { ...current, input } : current))}
            />
          </Field>
        </>
      ) : null}
      {block.type === 'menu' ? <MenuFields block={block} pages={pages} set={set} /> : null}
      {block.type === 'button' ? (
        <>
          <Field label="Text">
            <input className={fieldClass} value={block.label} onChange={(event) => set((current) => (current.type === 'button' ? { ...current, label: event.target.value } : current))} />
          </Field>
          <Field label="Style">
            <Menu
              value={block.style}
              options={[{ value: 'theme' as const, label: 'Theme' }, ...BUTTONS.map((item) => ({ value: item.id, label: item.name }))]}
              onChange={(style) => set((current) => (current.type === 'button' ? { ...current, style } : current))}
            />
          </Field>
          <ActionEditor pages={pages} action={block.action} onChange={(action) => set((current) => (current.type === 'button' ? { ...current, action } : current))} />
        </>
      ) : null}
      {block.type === 'balance' ? (
        <>
          <Field label="Label">
            <input className={fieldClass} value={block.label} onChange={(event) => set((current) => (current.type === 'balance' ? { ...current, label: event.target.value } : current))} />
          </Field>
          <Field label="Asset">
            <Choice
              value={block.asset}
              options={[
                { id: 'ETH', name: 'ETH' },
                { id: 'USDC', name: 'USDC' },
              ]}
              onChange={(asset) =>
                set((current) => {
                  if (current.type !== 'balance') return current;
                  return { ...current, asset, label: current.label === current.asset ? asset : current.label };
                })
              }
            />
          </Field>
        </>
      ) : null}
      {block.type === 'wallet' ? (
        <>
          <Field label="Button label">
            <input className={fieldClass} value={block.label} onChange={(event) => set((current) => (current.type === 'wallet' ? { ...current, label: event.target.value } : current))} />
          </Field>
          <Field label="Look">
            <Choice
              value={block.look}
              options={WALLET_LOOKS}
              onChange={(look) => set((current) => (current.type === 'wallet' ? { ...current, look } : current))}
            />
          </Field>
        </>
      ) : null}
      {block.type === 'spacer' ? (
        <Field label="Size">
          <Choice
            value={block.size}
            options={[
              { id: 's', name: 'Small' },
              { id: 'm', name: 'Medium' },
              { id: 'l', name: 'Large' },
            ]}
            onChange={(size) => set((current) => (current.type === 'spacer' ? { ...current, size } : current))}
          />
        </Field>
      ) : null}
      {block.type === 'spot' ? (
        <>
          <Field label="Title">
            <input className={fieldClass} value={block.title} onChange={(event) => set((current) => (current.type === 'spot' ? { ...current, title: event.target.value } : current))} />
          </Field>
          <Field label="Asset">
            <Menu
              value={block.asset}
              options={SPOT_ASSETS.map((item) => ({ value: item, label: item }))}
              onChange={(asset) => set((current) => (current.type === 'spot' ? { ...current, asset } : current))}
            />
          </Field>
          <Field label="Side">
            <Choice
              value={block.side}
              options={[{ id: 'buy', name: 'Buy' }, { id: 'sell', name: 'Sell' }]}
              onChange={(side) => set((current) => (current.type === 'spot' ? { ...current, side } : current))}
            />
          </Field>
          <Field label="Starting amount">
            <input className={fieldClass} value={block.amount} onChange={(event) => set((current) => (current.type === 'spot' ? { ...current, amount: event.target.value } : current))} />
          </Field>
          <Field label="Button">
            <input className={fieldClass} value={block.button} onChange={(event) => set((current) => (current.type === 'spot' ? { ...current, button: event.target.value } : current))} />
          </Field>
          <Field label="Note">
            <textarea className={`${fieldClass} min-h-20`} value={block.hint} onChange={(event) => set((current) => (current.type === 'spot' ? { ...current, hint: event.target.value } : current))} />
          </Field>
        </>
      ) : null}
      {block.type === 'terminal' ? (
        <>
          <p className="text-sm leading-relaxed text-white/45">Chart and ticket sit in the box you size. Turn either off and it becomes a price board or a ticket alone.</p>
          <Field label="Title">
            <input className={fieldClass} value={block.title} onChange={(event) => set((current) => (current.type === 'terminal' ? { ...current, title: event.target.value } : current))} />
          </Field>
          <Field label="Markets">
            <Markets
              value={block.assets}
              onChange={(assets) =>
                set((current) => {
                  if (current.type !== 'terminal') return current;
                  return { ...current, assets, asset: assets.includes(current.asset) ? current.asset : assets[0] };
                })
              }
            />
          </Field>
          <Field label="Opens on">
            <Menu
              value={block.asset}
              options={block.assets.map((item) => ({ value: item, label: item }))}
              onChange={(asset) => set((current) => (current.type === 'terminal' ? { ...current, asset } : current))}
            />
          </Field>
          <Field label="Sides">
            <Choice
              value={block.sides}
              options={[
                { id: 'both', name: 'Buy and sell' },
                { id: 'buy', name: 'Buy only' },
                { id: 'sell', name: 'Sell only' },
              ]}
              onChange={(sides) => set((current) => (current.type === 'terminal' ? { ...current, sides } : current))}
            />
          </Field>
          <Field label="Layout">
            <Choice
              value={block.layout}
              options={[
                { id: 'side', name: 'Ticket beside' },
                { id: 'stack', name: 'Ticket below' },
              ]}
              onChange={(layout) => set((current) => (current.type === 'terminal' ? { ...current, layout } : current))}
            />
          </Field>
          <Field label="Timeframe">
            <Menu
              value={block.interval}
              options={CHART_INTERVALS.map((item) => ({ value: item, label: item }))}
              onChange={(interval) => set((current) => (current.type === 'terminal' ? { ...current, interval } : current))}
            />
          </Field>
          <Field label="Starting amount">
            <input className={fieldClass} value={block.amount} onChange={(event) => set((current) => (current.type === 'terminal' ? { ...current, amount: event.target.value } : current))} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={block.chart} onChange={(event) => set((current) => (current.type === 'terminal' ? { ...current, chart: event.target.checked } : current))} />
            Chart
          </label>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={block.ticket} onChange={(event) => set((current) => (current.type === 'terminal' ? { ...current, ticket: event.target.checked } : current))} />
            Ticket
          </label>
        </>
      ) : null}
      {block.type === 'spotbook' ? (
        <>
          <p className="text-sm leading-relaxed text-white/45">Reads spot positions from SendraStorage. Selling uses the size of that row.</p>
          <Field label="Title">
            <input className={fieldClass} value={block.title} onChange={(event) => set((current) => (current.type === 'spotbook' ? { ...current, title: event.target.value } : current))} />
          </Field>
          <Field label="Markets">
            <Markets value={block.assets} onChange={(assets) => set((current) => (current.type === 'spotbook' ? { ...current, assets } : current))} />
          </Field>
          <Field label="Opens on">
            <Choice
              value={block.status}
              options={[
                { id: 'active', name: 'Active' },
                { id: 'all', name: 'All' },
                { id: 'closed', name: 'Closed' },
              ]}
              onChange={(status) => set((current) => (current.type === 'spotbook' ? { ...current, status } : current))}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={block.sell} onChange={(event) => set((current) => (current.type === 'spotbook' ? { ...current, sell: event.target.checked } : current))} />
            Sell from the row
          </label>
        </>
      ) : null}
      {block.type === 'pairs' ? (
        <>
          <p className="text-sm leading-relaxed text-white/45">The market neutral engine ranks the pairs. Turn on the pieces of the Sendra terminal you want in this box.</p>
          <Field label="Title">
            <input className={fieldClass} value={block.title} onChange={(event) => set((current) => (current.type === 'pairs' ? { ...current, title: event.target.value } : current))} />
          </Field>
          <Field label="Pieces">
            <Chips
              options={PAIR_PANELS}
              value={block.panels}
              label={(item) => (item === 'strategies' ? 'Strategies' : item === 'stats' ? 'Stats' : item === 'charts' ? 'Charts' : 'Study')}
              onChange={(panels) => set((current) => (current.type === 'pairs' ? { ...current, panels } : current))}
            />
          </Field>
          <Field label="Stats">
            <Chips
              options={PAIR_STATS}
              value={block.stats}
              label={(item) => (item === 'z' ? 'Z-score' : item === 'halfLife' ? 'Half-life' : item[0].toUpperCase() + item.slice(1))}
              onChange={(stats) => set((current) => (current.type === 'pairs' ? { ...current, stats } : current))}
            />
          </Field>
          <Field label="Charts">
            <Chips
              options={PAIR_VIEWS}
              value={block.views}
              label={(item) => (item === 'legs' ? 'Legs' : item === 'ratio' ? 'Ratio' : 'Performance')}
              onChange={(views) => set((current) => (current.type === 'pairs' ? { ...current, views } : current))}
            />
          </Field>
          <Field label="How many">
            <input
              className={fieldClass}
              type="number"
              min={1}
              max={48}
              value={block.limit}
              onChange={(event) => set((current) => (current.type === 'pairs' ? { ...current, limit: Number(event.target.value) || 1 } : current))}
            />
          </Field>
          <Field label="Rank by">
            <Choice
              value={block.sort}
              options={[
                { id: 'apr', name: 'APR' },
                { id: 'win', name: 'Win rate' },
              ]}
              onChange={(sort) => set((current) => (current.type === 'pairs' ? { ...current, sort } : current))}
            />
          </Field>
          <Field label="Risk">
            <Menu
              value={block.risk}
              options={PAIR_RISKS.map((item) => ({ value: item, label: item === 'ALL' ? 'Any' : item }))}
              onChange={(risk) => set((current) => (current.type === 'pairs' ? { ...current, risk } : current))}
            />
          </Field>
          <Field label="Opens on">
            <Choice
              value={block.openOn}
              options={[
                { id: 'best', name: 'Best strategy' },
                { id: 'fixed', name: 'This pair' },
              ]}
              onChange={(openOn) => set((current) => (current.type === 'pairs' ? { ...current, openOn } : current))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Long">
              <Menu
                value={block.long}
                options={PAIR_COINS.map((item) => ({ value: item, label: item }))}
                onChange={(long) =>
                  set((current) => {
                    if (current.type !== 'pairs') return current;
                    const short = current.short === long ? PAIR_COINS.find((item) => item !== long) ?? 'ETH' : current.short;
                    return { ...current, long, short };
                  })
                }
              />
            </Field>
            <Field label="Short">
              <Menu
                value={block.short}
                options={PAIR_COINS.map((item) => ({ value: item, label: item }))}
                onChange={(short) =>
                  set((current) => {
                    if (current.type !== 'pairs') return current;
                    const long = current.long === short ? PAIR_COINS.find((item) => item !== short) ?? 'BTC' : current.long;
                    return { ...current, long, short };
                  })
                }
              />
            </Field>
          </div>
          <Field label="Timeframe">
            <Menu
              value={block.interval}
              options={CHART_INTERVALS.map((item) => ({ value: item, label: item }))}
              onChange={(interval) => set((current) => (current.type === 'pairs' ? { ...current, interval } : current))}
            />
          </Field>
          <Field label="Layout">
            <Choice
              value={block.layout}
              options={[
                { id: 'side', name: 'List beside' },
                { id: 'stack', name: 'List above' },
              ]}
              onChange={(layout) => set((current) => (current.type === 'pairs' ? { ...current, layout } : current))}
            />
          </Field>
        </>
      ) : null}
      {block.type === 'aave' ? (
        <>
          <Field label="Strategy">
            <Choice
              value={block.strategy}
              options={AAVE_STRATEGIES.map((item) => ({ id: item.id, name: item.name }))}
              onChange={(strategy) =>
                set((current) => {
                  if (current.type !== 'aave') return current;
                  const meta = AAVE_STRATEGIES.find((item) => item.id === strategy) ?? AAVE_STRATEGIES[0];
                  return { ...current, strategy: meta.id, button: meta.button };
                })
              }
            />
          </Field>
          <Field label="Title">
            <input className={fieldClass} value={block.title} onChange={(event) => set((current) => (current.type === 'aave' ? { ...current, title: event.target.value } : current))} />
          </Field>
          {block.strategy === 'lp' ? (
            <>
              <Field label="Pair">
                <Menu value={block.pair} options={PAIRS.map((item) => ({ value: item, label: item }))} onChange={(pair) => set((current) => (current.type === 'aave' ? { ...current, pair } : current))} />
              </Field>
              <Field label="Fee">
                <Menu
                  value={block.fee}
                  options={FEES.map((item) => ({ value: item, label: item === 500 ? '0.05%' : item === 3000 ? '0.3%' : '1%' }))}
                  onChange={(fee) => set((current) => (current.type === 'aave' ? { ...current, fee } : current))}
                />
              </Field>
            </>
          ) : block.strategy === 'basket' ? (
            <Field label="Assets">
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {AAVE_ASSETS.map((asset) => {
                  const on = block.assets.includes(asset);
                  return (
                    <button
                      key={asset}
                      type="button"
                      onClick={() =>
                        set((current) => {
                          if (current.type !== 'aave') return current;
                          if (on && current.assets.length === 1) return current;
                          const assets = AAVE_ASSETS.filter((item) => (item === asset ? !on : current.assets.includes(item)));
                          return { ...current, assets: [...assets] };
                        })
                      }
                      className={`rounded-full px-2.5 py-1 text-xs ${on ? 'bg-[#d6ff4a] text-[#141414]' : 'bg-white/5 text-white/70'}`}
                    >
                      {asset}
                    </button>
                  );
                })}
              </div>
            </Field>
          ) : block.strategy === 'short' ? (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Collateral">
                <Menu value={block.asset} options={AAVE_ASSETS.map((item) => ({ value: item, label: item }))} onChange={(asset) => set((current) => (current.type === 'aave' ? { ...current, asset } : current))} />
              </Field>
              <Field label="Short">
                <Menu value={block.short} options={AAVE_ASSETS.map((item) => ({ value: item, label: item }))} onChange={(short) => set((current) => (current.type === 'aave' ? { ...current, short } : current))} />
              </Field>
            </div>
          ) : (
            <Field label="Asset">
              <Menu value={block.asset} options={AAVE_ASSETS.map((item) => ({ value: item, label: item }))} onChange={(asset) => set((current) => (current.type === 'aave' ? { ...current, asset } : current))} />
            </Field>
          )}
          {block.strategy === 'loop' ? (
            <Field label="Loops">
              <Choice
                value={String(block.loops)}
                options={['1', '2', '3', '4', '5'].map((item) => ({ id: item, name: `${item}×` }))}
                onChange={(loops) => set((current) => (current.type === 'aave' ? { ...current, loops: Number(loops) } : current))}
              />
            </Field>
          ) : null}
          <Field label="USDC">
            <input className={fieldClass} value={block.amount} onChange={(event) => set((current) => (current.type === 'aave' ? { ...current, amount: event.target.value } : current))} />
          </Field>
          <Field label="Button">
            <input className={fieldClass} value={block.button} onChange={(event) => set((current) => (current.type === 'aave' ? { ...current, button: event.target.value } : current))} />
          </Field>
          <Field label="Note">
            <textarea className={`${fieldClass} min-h-20`} value={block.hint} onChange={(event) => set((current) => (current.type === 'aave' ? { ...current, hint: event.target.value } : current))} />
          </Field>
        </>
      ) : null}
      {block.type === 'liquidity' ? (
        <>
          <Field label="Title">
            <input className={fieldClass} value={block.title} onChange={(event) => set((current) => (current.type === 'liquidity' ? { ...current, title: event.target.value } : current))} />
          </Field>
          <Field label="Pair">
            <Menu
              value={block.pair}
              options={PAIRS.map((item) => ({ value: item, label: item }))}
              onChange={(pair) => set((current) => (current.type === 'liquidity' ? { ...current, pair } : current))}
            />
          </Field>
          <Field label="Fee">
            <Menu
              value={block.fee}
              options={FEES.map((item) => ({ value: item, label: item === 500 ? '0.05%' : item === 3000 ? '0.3%' : '1%' }))}
              onChange={(fee) => set((current) => (current.type === 'liquidity' ? { ...current, fee } : current))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Below %">
              <input className={fieldClass} type="number" min={1} max={80} value={block.lowPct} onChange={(event) => set((current) => (current.type === 'liquidity' ? { ...current, lowPct: Math.max(1, Math.min(80, Number(event.target.value) || 1)) } : current))} />
            </Field>
            <Field label="Above %">
              <input className={fieldClass} type="number" min={1} max={80} value={block.highPct} onChange={(event) => set((current) => (current.type === 'liquidity' ? { ...current, highPct: Math.max(1, Math.min(80, Number(event.target.value) || 1)) } : current))} />
            </Field>
          </div>
          <Field label="USDC">
            <input className={fieldClass} value={block.amount} onChange={(event) => set((current) => (current.type === 'liquidity' ? { ...current, amount: event.target.value } : current))} />
          </Field>
          <Field label="Button">
            <input className={fieldClass} value={block.button} onChange={(event) => set((current) => (current.type === 'liquidity' ? { ...current, button: event.target.value } : current))} />
          </Field>
          <Field label="Note">
            <textarea className={`${fieldClass} min-h-20`} value={block.hint} onChange={(event) => set((current) => (current.type === 'liquidity' ? { ...current, hint: event.target.value } : current))} />
          </Field>
        </>
      ) : null}
      {block.type === 'enclaveMine' || block.type === 'enclaveOffers' || block.type === 'enclaveManage' || block.type === 'enclavePortfolio' ? (
        <>
          <p className="text-sm leading-relaxed text-white/45">
            {block.type === 'enclaveMine'
              ? 'Lists enclaves where the connected wallet is lender, operator, or both. Choosing a row sets the enclave for Manage and Enclave portfolio on this page.'
              : block.type === 'enclaveOffers'
                ? 'Open capital offers from EnclavesStorage. Accepting one makes this wallet the operator and selects that enclave.'
                : block.type === 'enclaveManage'
                  ? 'Follows the enclave selected in My enclaves or Offers. Deposit, pause, finalize, cancel, and revoke sign on Arbitrum.'
                  : 'The portfolio of the selected enclave: only positions recorded on its executor.'}
          </p>
          <Field label="Title">
            <input
              className={fieldClass}
              value={block.title}
              onChange={(event) =>
                set((current) =>
                  current.type === 'enclaveMine' || current.type === 'enclaveOffers' || current.type === 'enclaveManage' || current.type === 'enclavePortfolio'
                    ? { ...current, title: event.target.value }
                    : current,
                )
              }
            />
          </Field>
        </>
      ) : null}
      {block.type === 'enclave' ? (
        <>
          <p className="text-sm leading-relaxed text-white/45">Starting terms for the v3 create flow. The visitor still sets capital, window, and split on the block.</p>
          <Field label="Title">
            <input className={fieldClass} value={block.title} onChange={(event) => set((current) => (current.type === 'enclave' ? { ...current, title: event.target.value } : current))} />
          </Field>
          <Field label="Credit">
            <input className={fieldClass} value={block.capital} onChange={(event) => set((current) => (current.type === 'enclave' ? { ...current, capital: event.target.value } : current))} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Min">
              <input className={fieldClass} value={block.minTx} onChange={(event) => set((current) => (current.type === 'enclave' ? { ...current, minTx: event.target.value } : current))} />
            </Field>
            <Field label="Max">
              <input className={fieldClass} value={block.maxTx} onChange={(event) => set((current) => (current.type === 'enclave' ? { ...current, maxTx: event.target.value } : current))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Days">
              <input className={fieldClass} type="number" min={1} value={block.days} onChange={(event) => set((current) => (current.type === 'enclave' ? { ...current, days: Number(event.target.value) || 1 } : current))} />
            </Field>
            <Field label="Fee %">
              <input className={fieldClass} type="number" min={0} max={100} value={block.feePct} onChange={(event) => set((current) => (current.type === 'enclave' ? { ...current, feePct: Number(event.target.value) || 0 } : current))} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={block.openOperator} onChange={(event) => set((current) => (current.type === 'enclave' ? { ...current, openOperator: event.target.checked } : current))} />
            Any operator
          </label>
          {!block.openOperator ? (
            <Field label="Operator">
              <input className={fieldClass} value={block.operator} placeholder="0x…" onChange={(event) => set((current) => (current.type === 'enclave' ? { ...current, operator: event.target.value.trim() } : current))} />
            </Field>
          ) : null}
          <Field label="On-chain description">
            <input className={fieldClass} value={block.description} onChange={(event) => set((current) => (current.type === 'enclave' ? { ...current, description: event.target.value } : current))} />
          </Field>
          <Field label="Button">
            <input className={fieldClass} value={block.button} onChange={(event) => set((current) => (current.type === 'enclave' ? { ...current, button: event.target.value } : current))} />
          </Field>
          <Field label="Note">
            <textarea className={`${fieldClass} min-h-20`} value={block.hint} onChange={(event) => set((current) => (current.type === 'enclave' ? { ...current, hint: event.target.value } : current))} />
          </Field>
        </>
      ) : null}
    </div>
  );
}

function MenuFields({
  block,
  pages,
  set,
}: {
  block: MenuBlock;
  pages: StudioPage[];
  set: (recipe: (block: Block) => Block) => void;
}) {
  const write = (items: MenuBlock['items']) => set((current) => (current.type === 'menu' ? { ...current, items } : current));
  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= block.items.length) return;
    const items = [...block.items];
    const [row] = items.splice(index, 1);
    items.splice(next, 0, row);
    write(items);
  };
  return (
    <>
      <Field label="Label">
        <input className={fieldClass} value={block.label} onChange={(event) => set((current) => (current.type === 'menu' ? { ...current, label: event.target.value } : current))} />
      </Field>
      <Field label={`Buttons ${block.items.length} / ${MENU_CAP}`}>
        <div className="mt-1.5 grid gap-2">
          {block.items.map((item, index) => (
            <div key={item.id} className="grid gap-1.5 rounded-2xl bg-white/5 p-2">
              <input
                className={fieldClass}
                aria-label="Button label"
                value={item.label}
                onChange={(event) => write(block.items.map((row) => (row.id === item.id ? { ...row, label: event.target.value } : row)))}
              />
              <Menu
                value={item.href}
                options={pages.map((page) => ({ value: page.path, label: page.name || 'Page' }))}
                onChange={(href) => write(block.items.map((row) => (row.id === item.id ? { ...row, href } : row)))}
              />
              <div className="flex gap-2 text-xs text-white/60">
                <button type="button" onClick={() => move(index, -1)}>Up</button>
                <button type="button" onClick={() => move(index, 1)}>Down</button>
                <button type="button" className="text-[#ff8d8d]" onClick={() => write(block.items.filter((row) => row.id !== item.id))}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </Field>
      {block.items.length < MENU_CAP ? (
        <button
          type="button"
          className="w-fit rounded-full bg-white px-3 py-1.5 text-sm text-[#141414]"
          onClick={() => write([...block.items, { id: uid('item'), label: 'Button', href: pages[0]?.path ?? '' }])}
        >
          Add button
        </button>
      ) : null}
    </>
  );
}

function ActionEditor({
  pages,
  action,
  onChange,
}: {
  pages: StudioPage[];
  action: Action;
  onChange: (action: Action) => void;
}) {
  return (
    <div className="grid gap-3">
      <Field label="Action">
        <Menu
          value={action.kind}
          options={[
            { value: 'none', label: 'None' },
            { value: 'wallet', label: 'Connect wallet' },
            { value: 'link', label: 'Page or URL' },
            { value: 'spot', label: 'Spot' },
            { value: 'aave', label: 'Aave' },
            { value: 'liquidity', label: 'Liquidity' },
            { value: 'enclave', label: 'Enclave' },
          ]}
          onChange={(kind) => onChange(defaultAction(kind))}
        />
      </Field>
      {action.kind === 'link' ? (
        <>
          <Field label="Page">
            <Menu
              value={pages.some((page) => (page.path || '/') === (action.href === '' ? '/' : action.href)) ? action.href || '/' : ''}
              options={[{ value: '', label: 'External URL' }, ...pages.map((page) => ({ value: page.path || '/', label: page.name }))]}
              onChange={(href) => onChange({ kind: 'link', href })}
            />
          </Field>
          {pages.some((page) => (page.path || '/') === (action.href === '' ? '/' : action.href)) ? null : (
            <Field label="URL">
              <input className={fieldClass} value={action.href} placeholder="https://" onChange={(event) => onChange({ kind: 'link', href: event.target.value })} />
            </Field>
          )}
        </>
      ) : null}
      {action.kind === 'spot' ? (
        <>
          <Field label="Asset">
            <Menu
              value={action.asset}
              options={SPOT_ASSETS.map((item) => ({ value: item, label: item }))}
              onChange={(asset) => onChange({ ...action, asset })}
            />
          </Field>
          <Field label="Field key">
            <input className={fieldClass} value={action.amountKey} placeholder="amount" onChange={(event) => onChange({ ...action, amountKey: event.target.value.trim() })} />
          </Field>
          <Field label="Amount if the field is empty">
            <input className={fieldClass} value={action.amount} onChange={(event) => onChange({ ...action, amount: event.target.value })} />
          </Field>
        </>
      ) : null}
      {action.kind === 'aave' ? (
        <>
          <Field label="Asset">
            <Menu
              value={action.asset}
              options={AAVE_ASSETS.map((item) => ({ value: item, label: item }))}
              onChange={(asset) => onChange({ ...action, asset })}
            />
          </Field>
          <Field label="Field key">
            <input className={fieldClass} value={action.amountKey} placeholder="amount" onChange={(event) => onChange({ ...action, amountKey: event.target.value.trim() })} />
          </Field>
          <Field label="USDC if the field is empty">
            <input className={fieldClass} value={action.amount} onChange={(event) => onChange({ ...action, amount: event.target.value })} />
          </Field>
        </>
      ) : null}
      {action.kind === 'liquidity' ? (
        <>
          <Field label="Pair">
            <Menu
              value={action.pair}
              options={PAIRS.map((item) => ({ value: item, label: item }))}
              onChange={(pair) => onChange({ ...action, pair })}
            />
          </Field>
          <Field label="Field key">
            <input className={fieldClass} value={action.amountKey} onChange={(event) => onChange({ ...action, amountKey: event.target.value.trim() })} />
          </Field>
          <Field label="USDC if the field is empty">
            <input className={fieldClass} value={action.amount} onChange={(event) => onChange({ ...action, amount: event.target.value })} />
          </Field>
        </>
      ) : null}
    </div>
  );
}
