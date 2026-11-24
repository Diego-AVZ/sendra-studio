import type { MutableRefObject } from 'react';
import { PALETTE, type BlockType } from '@/schema/protocol';

export type DragPayload = { type?: BlockType; variant?: string; id?: string };

const groups = ['Structure', 'Controls', 'Execution'] as const;

export function Palette({
  drag,
  onAdd,
}: {
  drag: MutableRefObject<DragPayload | null>;
  onAdd: (type: BlockType, variant?: string) => void;
}) {
  return (
    <aside className="order-2 min-h-0 overflow-auto border-white/10 px-3 py-4 lg:order-1 lg:border-r">
      <p className="px-2 text-[11px] uppercase tracking-[0.18em] text-[#d6ff4a]">Modules</p>
      <p className="mt-2 px-2 text-sm leading-relaxed text-white/45">Drag onto the canvas, or click to add.</p>
      {groups.map((group) => (
        <div key={group} className="mt-5">
          <p className="px-2 text-[11px] uppercase tracking-[0.16em] text-white/35">{group}</p>
          <ul className="mt-2 grid gap-1.5">
            {PALETTE.filter((item) => item.group === group).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  draggable
                  onClick={() => onAdd(item.type, item.variant)}
                  onDragStart={(event) => {
                    drag.current = { type: item.type, variant: item.variant };
                    event.dataTransfer.setData('text/plain', item.id);
                    event.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="w-full rounded-2xl px-3 py-2.5 text-left hover:bg-white/[0.05]"
                >
                  <span className="block text-sm text-white">{item.name}</span>
                  <span className="block text-xs text-white/40">{item.line}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}
