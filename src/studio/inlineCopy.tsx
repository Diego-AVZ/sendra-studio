import { useLayoutEffect, useRef, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';

function norm(text: string, multiline: boolean) {
  const clean = text.replace(/\u00a0/g, ' ');
  return multiline ? clean.replace(/\n$/, '') : clean.replace(/\n/g, '');
}

function walk(node: Node): string {
  let out = '';
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) out += child.textContent ?? '';
    else if (child.nodeName === 'BR') out += '\n';
    else if (child.nodeName === 'DIV' || child.nodeName === 'P') {
      if (out && !out.endsWith('\n')) out += '\n';
      out += walk(child);
    } else out += walk(child);
  });
  return out;
}

function read(node: HTMLElement, multiline: boolean) {
  return norm(multiline ? walk(node) : (node.textContent ?? ''), multiline);
}

function write(node: HTMLElement, value: string, multiline: boolean) {
  if (!multiline) {
    node.textContent = value;
    return;
  }
  node.replaceChildren();
  value.split('\n').forEach((line, index) => {
    if (index) node.append(document.createElement('br'));
    if (line) node.append(document.createTextNode(line));
  });
}

function placeCaret(node: HTMLElement, x: number, y: number) {
  const selection = window.getSelection();
  const fromPoint = (document as Document & { caretRangeFromPoint?: (px: number, py: number) => Range | null }).caretRangeFromPoint;
  if (!selection || !fromPoint) return;
  const range = fromPoint.call(document, x, y);
  if (!range || !node.contains(range.startContainer)) return;
  selection.removeAllRanges();
  selection.addRange(range);
}

function insertPlain(root: HTMLElement, text: string, multiline: boolean) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !root.contains(selection.anchorNode)) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const lines = multiline ? text.replace(/\r\n/g, '\n').split('\n') : [text.replace(/\r?\n/g, ' ')];
  const fragment = document.createDocumentFragment();
  lines.forEach((line, index) => {
    if (index) fragment.append(document.createElement('br'));
    if (line) fragment.append(document.createTextNode(line));
  });
  const last = fragment.lastChild;
  range.insertNode(fragment);
  if (!last) return;
  range.setStartAfter(last);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function InlineCopy({
  value,
  multiline = false,
  onCommit,
}: {
  value: string;
  multiline?: boolean;
  onCommit: (next: string) => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const focused = useRef(false);
  const skip = useRef(false);
  const valueRef = useRef(value);
  const commitRef = useRef(onCommit);
  valueRef.current = value;
  commitRef.current = onCommit;

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || focused.current) return;
    if (read(node, multiline) !== norm(value, multiline)) write(node, value, multiline);
  });

  const onMouseDown = (event: ReactMouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    const node = event.currentTarget;
    if (document.activeElement === node) return;
    if (!node.closest('button, label, a, [data-block-shell]')) return;
    event.preventDefault();
    node.focus();
    placeCaret(node, event.clientX, event.clientY);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    if (event.nativeEvent.isComposing) return;
    if ((event.metaKey || event.ctrlKey) && ['b', 'i', 'u'].includes(event.key.toLowerCase())) {
      event.preventDefault();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      const node = ref.current;
      if (node) write(node, valueRef.current, multiline);
      skip.current = true;
      focused.current = false;
      node?.blur();
      return;
    }
    if (event.key === 'Enter' && !multiline) {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  return (
    <span
      ref={ref}
      data-inline=""
      role="textbox"
      aria-multiline={multiline || undefined}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      draggable={false}
      className={`cursor-text select-text outline-none ${multiline ? 'block whitespace-pre-wrap' : ''}`}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={onMouseDown}
      onClick={(event) => {
        if (event.currentTarget.closest('button')) event.stopPropagation();
      }}
      onDragStart={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        if (skip.current) {
          skip.current = false;
          return;
        }
        const node = ref.current;
        if (!node) return;
        const next = read(node, multiline);
        if (next !== norm(valueRef.current, multiline)) commitRef.current(next);
      }}
      onKeyDown={onKeyDown}
      onPaste={(event) => {
        event.preventDefault();
        const node = ref.current;
        if (!node) return;
        insertPlain(node, event.clipboardData.getData('text/plain'), multiline);
      }}
    />
  );
}
