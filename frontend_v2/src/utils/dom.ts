type TagName = keyof HTMLElementTagNameMap;

export interface ElProps {
  class?: string;
  id?: string;
  text?: string;
  html?: string;
  attrs?: Record<string, string | number | boolean | undefined>;
  on?: Partial<{
    [K in keyof HTMLElementEventMap]: (event: HTMLElementEventMap[K]) => void;
  }>;
}

export type Child = Node | string | null | undefined | false;

export function el<K extends TagName>(
  tag: K,
  props: ElProps = {},
  children: Child[] = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.class) node.className = props.class;
  if (props.id) node.id = props.id;
  if (props.text !== undefined) node.textContent = props.text;
  if (props.html !== undefined) node.innerHTML = props.html;
  if (props.attrs) {
    for (const [k, v] of Object.entries(props.attrs)) {
      if (v === undefined || v === false) continue;
      node.setAttribute(k, v === true ? "" : String(v));
    }
  }
  if (props.on) {
    for (const [event, handler] of Object.entries(props.on)) {
      if (handler) {
        node.addEventListener(
          event,
          handler as EventListenerOrEventListenerObject
        );
      }
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function qs<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document
): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Element not found: ${selector}`);
  return node;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function mount(target: HTMLElement, ...nodes: Child[]): void {
  clear(target);
  for (const n of nodes) {
    if (n === null || n === undefined || n === false) continue;
    target.append(typeof n === "string" ? document.createTextNode(n) : n);
  }
}
