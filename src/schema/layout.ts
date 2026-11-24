import type { CSSProperties } from 'react';
import type { Block, BlockType, Frame } from '@/schema/protocol';

export const COLS = 7;
export const ROW_PX = 88;
export const GAP_PX = 10;

const SPAN: Record<BlockType, number> = {
  hero: 7,
  text: 7,
  wallet: 7,
  balance: 2,
  portfolio: 7,
  calendar: 7,
  pulse: 7,
  spacer: 7,
  metric: 2,
  logo: 2,
  field: 3,
  button: 3,
  menu: 3,
  spot: 4,
  terminal: 7,
  spotbook: 7,
  pairs: 7,
  aave: 4,
  multi: 7,
  dashboard: 7,
  liquidity: 7,
  enclave: 7,
  enclaveMine: 7,
  enclaveOffers: 7,
  enclaveManage: 7,
  enclavePortfolio: 7,
};

const ROWS: Record<BlockType, number> = {
  hero: 3,
  text: 2,
  wallet: 2,
  balance: 2,
  portfolio: 8,
  calendar: 11,
  pulse: 8,
  spacer: 1,
  metric: 2,
  logo: 2,
  field: 2,
  button: 1,
  menu: 2,
  spot: 4,
  terminal: 8,
  spotbook: 7,
  pairs: 10,
  aave: 5,
  multi: 10,
  dashboard: 5,
  liquidity: 9,
  enclave: 8,
  enclaveMine: 7,
  enclaveOffers: 7,
  enclaveManage: 8,
  enclavePortfolio: 8,
};

export function fillsFrame(type: BlockType) {
  return type !== 'spacer';
}

export function frameFor(type: BlockType): Frame {
  return { col: 1, span: SPAN[type], row: 1, rows: ROWS[type] };
}

export function clampFrame(frame: Frame): Frame {
  const span = Math.max(1, Math.min(COLS, Math.round(frame.span) || 1));
  const rows = Math.max(1, Math.min(24, Math.round(frame.rows) || 1));
  const col = Math.max(1, Math.min(COLS - span + 1, Math.round(frame.col) || 1));
  const row = Math.max(1, Math.min(48, Math.round(frame.row) || 1));
  return { col, span, row, rows };
}

export function frameOf(block: Block): Frame {
  return clampFrame(block.frame ?? frameFor(block.type));
}

function hits(a: Frame, b: Frame) {
  return a.col < b.col + b.span && a.col + a.span > b.col && a.row < b.row + b.rows && a.row + a.rows > b.row;
}

export function nextSlot(blocks: Block[], span: number, rows: number) {
  const taken = blocks.map(frameOf);
  const width = Math.max(1, Math.min(COLS, span));
  const height = Math.max(1, Math.min(24, rows));
  for (let row = 1; row < 48; row += 1) {
    for (let col = 1; col <= COLS - width + 1; col += 1) {
      const frame = { col, span: width, row, rows: height };
      if (taken.every((item) => !hits(item, frame))) return { col, row };
    }
  }
  return { col: 1, row: 48 };
}

export function flow(blocks: Block[]): Block[] {
  const placed: Block[] = [];
  for (const block of blocks) {
    const base = frameOf(block);
    const slot = nextSlot(placed, base.span, base.rows);
    placed.push({ ...block, frame: clampFrame({ ...base, col: slot.col, row: slot.row }) });
  }
  return placed;
}

export function laidOut(blocks: Block[]): Block[] {
  const placed: Block[] = [];
  for (const block of blocks) {
    if (block.frame) {
      placed.push({ ...block, frame: clampFrame(block.frame) });
      continue;
    }
    const base = frameFor(block.type);
    const slot = nextSlot(placed, base.span, base.rows);
    placed.push({ ...block, frame: { ...base, ...slot } });
  }
  return placed;
}

export function placeStyle(frame: Frame): CSSProperties {
  return {
    gridColumn: `${frame.col} / span ${frame.span}`,
    gridRow: `${frame.row} / span ${frame.rows}`,
    minWidth: 0,
  };
}

export function gridStyle(minRows: number): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
    gridAutoRows: `${ROW_PX}px`,
    gap: GAP_PX,
    minHeight: minRows * ROW_PX + (minRows - 1) * GAP_PX,
  };
}

export function cellAt(rect: DOMRect, clientX: number, clientY: number) {
  const unitX = rect.width / COLS;
  const unitY = ROW_PX + GAP_PX;
  const col = Math.max(1, Math.min(COLS, Math.floor((clientX - rect.left) / unitX) + 1));
  const row = Math.max(1, Math.min(48, Math.floor((clientY - rect.top) / unitY) + 1));
  return { col, row };
}
