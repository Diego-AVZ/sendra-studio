import { useRef, useState, type DragEvent, type MutableRefObject, type PointerEvent } from 'react';
import { BlockView, quietApi } from '@/player/Blocks';
import { EnclaveSelectionProvider } from '@/player/enclaveSelection';
import { contentFrame, sceneProps } from '@/player/chrome';
import { cellAt, COLS, fillsFrame, frameFor, frameOf, GAP_PX, gridStyle, laidOut, placeStyle, ROW_PX } from '@/schema/layout';
import { blockName, type Block, type BlockType, type Frame, type Theme } from '@/schema/protocol';
import type { DragPayload } from '@/studio/Palette';

type Side = 'n' | 'e' | 's' | 'w';

const GRIPS: { id: string; sides: Side[]; label: string; cursor: string; className: string; bar: string }[] = [
  { id: 'n', sides: ['n'], label: 'Resize from the top', cursor: 'ns-resize', className: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2', bar: 'h-1.5 w-7' },
  { id: 's', sides: ['s'], label: 'Resize from the bottom', cursor: 'ns-resize', className: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2', bar: 'h-1.5 w-7' },
  { id: 'e', sides: ['e'], label: 'Resize from the right', cursor: 'ew-resize', className: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2', bar: 'h-7 w-1.5' },
  { id: 'w', sides: ['w'], label: 'Resize from the left', cursor: 'ew-resize', className: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2', bar: 'h-7 w-1.5' },
  { id: 'nw', sides: ['n', 'w'], label: 'Resize from the top left', cursor: 'nwse-resize', className: 'left-0 top-0 -translate-x-1/3 -translate-y-1/3', bar: 'h-2.5 w-2.5' },
  { id: 'ne', sides: ['n', 'e'], label: 'Resize from the top right', cursor: 'nesw-resize', className: 'right-0 top-0 translate-x-1/3 -translate-y-1/3', bar: 'h-2.5 w-2.5' },
  { id: 'se', sides: ['s', 'e'], label: 'Resize from the bottom right', cursor: 'nwse-resize', className: 'bottom-0 right-0 translate-x-1/3 translate-y-1/3', bar: 'h-2.5 w-2.5' },
  { id: 'sw', sides: ['s', 'w'], label: 'Resize from the bottom left', cursor: 'nesw-resize', className: 'bottom-0 left-0 -translate-x-1/3 translate-y-1/3', bar: 'h-2.5 w-2.5' },
];

export function Canvas({
  blocks,
  theme,
  selected,
  drag,
  onSelect,
  onPlace,
  onCreate,
  onFrame,
  onLogoFile,
  onPatch,
}: {
  blocks: Block[];
  theme: Theme;
  selected: string | null;
  drag: MutableRefObject<DragPayload | null>;
  onSelect: (id: string | null) => void;
  onPlace: (id: string, col: number, row: number) => void;
  onCreate: (type: BlockType, col: number, row: number, variant?: string) => void;
  onFrame: (id: string, frame: Partial<Frame>) => void;
  onLogoFile?: (id: string, file: File) => void;
  onPatch: (id: string, recipe: (block: Block) => Block) => void;
}) {
  const grid = useRef<HTMLDivElement>(null);
  const [ghost, setGhost] = useState<{ col: number; row: number; span: number; rows: number } | null>(null);
  const scene = sceneProps(theme, true);
  const frame = contentFrame(theme.width);
  const placed = laidOut(blocks);
  const used = placed.reduce((max, block) => Math.max(max, frameOf(block).row + frameOf(block).rows), 8);

  const point = (event: { clientX: number; clientY: number }) => {
    const rect = grid.current?.getBoundingClientRect();
    if (!rect) return null;
    return cellAt(rect, event.clientX, event.clientY);
  };

  const dragOver = (event: DragEvent) => {
    event.preventDefault();
    const cell = point(event);
    const payload = drag.current;
    if (!cell || !payload) return;
    const block = payload.id ? blocks.find((item) => item.id === payload.id) : null;
    const frame = block ? frameOf(block) : frameFor(payload.type ?? 'spot');
    setGhost({ col: Math.min(cell.col, COLS - frame.span + 1), row: cell.row, span: frame.span, rows: frame.rows });
  };

  const drop = (event: DragEvent) => {
    event.preventDefault();
    const cell = point(event);
    const payload = drag.current;
    setGhost(null);
    drag.current = null;
    if (!cell || !payload) return;
    if (payload.type) onCreate(payload.type, cell.col, cell.row, payload.variant);
    else if (payload.id) onPlace(payload.id, cell.col, cell.row);
  };

  const resize = (block: Block, sides: readonly Side[], event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = frameOf(block);
    const rect = grid.current?.getBoundingClientRect();
    const colW = (rect?.width ?? 700) / COLS;
    const rowH = ROW_PX + GAP_PX;
    const move = (next: globalThis.PointerEvent) => {
      const dx = Math.round((next.clientX - startX) / colW);
      const dy = Math.round((next.clientY - startY) / rowH);
      const frame: Partial<Frame> = {};
      if (sides.includes('e')) frame.span = origin.span + dx;
      if (sides.includes('w')) {
        frame.col = origin.col + dx;
        frame.span = origin.span - dx;
      }
      if (sides.includes('s')) frame.rows = origin.rows + dy;
      if (sides.includes('n')) {
        frame.row = origin.row + dy;
        frame.rows = origin.rows - dy;
      }
      onFrame(block.id, frame);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <EnclaveSelectionProvider>
    <div className={`min-h-full ${scene.className}`} style={scene.style}>
      <div className={`${frame.className} p-4 sm:p-6`} style={frame.style}>
      <div className="mb-2 grid grid-cols-7 text-center text-[10px] uppercase tracking-[0.14em]" style={{ color: theme.muted }}>
        {Array.from({ length: COLS }, (_, index) => (
          <span key={index}>{index + 1}</span>
        ))}
      </div>
      <div
        ref={grid}
        style={gridStyle(Math.max(used, ghost ? ghost.row + ghost.rows : 0))}
        onDragOver={dragOver}
        onDrop={drop}
        onDragEnd={() => {
          drag.current = null;
          setGhost(null);
        }}
      >
        {ghost ? <div style={{ ...placeStyle(ghost), outline: `1px dashed ${theme.accent}`, borderRadius: theme.radius }} /> : null}
        {placed.map((block) => {
          const frame = frameOf(block);
          const active = selected === block.id;
          return (
            <div key={block.id} style={placeStyle(frame)} className="relative min-h-0">
              <div
                role="button"
                tabIndex={0}
                data-block-shell=""
                onClick={() => onSelect(block.id)}
                onFocus={() => onSelect(block.id)}
                onKeyDown={(event) => {
                  if ((event.target as HTMLElement).closest('[data-inline]')) return;
                  if (event.key === 'Enter') onSelect(block.id);
                }}
                onDragStart={(event) => {
                  if ((event.target as HTMLElement).closest('[data-inline]')) {
                    event.preventDefault();
                    event.stopPropagation();
                  }
                }}
                className={`h-full ${fillsFrame(block.type) ? 'overflow-hidden' : 'overflow-auto'}`}
                style={{ borderRadius: theme.radius, boxShadow: active ? `0 0 0 2px ${theme.accent}` : undefined }}
              >
                <button
                  type="button"
                  draggable
                  aria-label={`Drag ${blockName(block.type)}`}
                  onDragStart={(event) => {
                    drag.current = { id: block.id };
                    event.dataTransfer.setData('text/plain', block.id);
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  className="absolute right-2 top-2 z-10 rounded-full bg-black/55 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white"
                >
                  Move
                </button>
                <BlockView
                  block={block}
                  theme={theme}
                  api={quietApi}
                  onLogoFile={onLogoFile}
                  edit={(recipe) => onPatch(block.id, recipe)}
                />
              </div>
              {active
                ? GRIPS.map((grip) => (
                    <button
                      key={grip.id}
                      type="button"
                      aria-label={grip.label}
                      onPointerDown={(event) => resize(block, grip.sides, event)}
                      className={`absolute z-20 grid h-7 w-7 touch-none place-items-center ${grip.className}`}
                      style={{ cursor: grip.cursor }}
                    >
                      <span className={`block rounded-full ${grip.bar}`} style={{ background: theme.accent, boxShadow: `0 0 0 2px ${theme.paper}` }} />
                    </button>
                  ))
                : null}
            </div>
          );
        })}
      </div>
      {theme.credit ? (
        <p className="mt-8 text-[11px] uppercase tracking-[0.18em]" style={{ color: theme.muted }}>
          Sendra Studio
        </p>
      ) : null}
      </div>
    </div>
    </EnclaveSelectionProvider>
  );
}
