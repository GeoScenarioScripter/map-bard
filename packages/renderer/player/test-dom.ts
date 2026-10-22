// A minimal DOM stand-in for overlay tests; the repository has no jsdom. Not bundled.

/** Labels measure 7 px per character, wrap at 224 px, and add padding and borders. */
const CHAR = 7;
const WRAP = 224;

export class FakeElement {
  children: FakeElement[] = [];
  parent: FakeElement | undefined;
  attributes = new Map<string, string>();
  dataset: Record<string, string> = {};
  style: Record<string, string> = {};
  hidden = false;
  textContent = '';
  className = '';
  root = false;
  rect = { left: 0, top: 0, width: 0, height: 0 };

  constructor(readonly tagName: string) {}

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value));
    if (name === 'class') this.className = String(value);
  }
  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
  appendChild(child: FakeElement): FakeElement {
    child.parent = this;
    this.children.push(child);
    return child;
  }
  append(...children: FakeElement[]): void {
    for (const child of children) this.appendChild(child);
  }
  remove(): void {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = undefined;
  }
  get isConnected(): boolean {
    let node: FakeElement | undefined = this.parent;
    let root = this.root;
    while (node) {
      root = node.root;
      node = node.parent;
    }
    return root;
  }
  get offsetWidth(): number {
    return this.tagName === 'li' ? Math.min(this.textContent.length * CHAR, WRAP) + 19 : 0;
  }
  get offsetHeight(): number {
    return this.tagName === 'li' ? Math.ceil((this.textContent.length * CHAR) / WRAP) * 17 + 11 : 0;
  }
  getBoundingClientRect() {
    const { left, top } = this.rect;
    const width = this.tagName === 'li' ? this.offsetWidth : this.rect.width;
    const height = this.tagName === 'li' ? this.offsetHeight : this.rect.height;
    return { left, top, width, height, right: left + width, bottom: top + height };
  }
  /** Descendants with a class name, in document order. */
  byClass(name: string): FakeElement[] {
    const found: FakeElement[] = [];
    const walk = (node: FakeElement) => {
      for (const child of node.children) {
        if (child.className.split(' ').includes(name)) found.push(child);
        walk(child);
      }
    };
    walk(this);
    return found;
  }
}

export function fakeDocument() {
  return {
    createElement: (tag: string) => new FakeElement(tag),
    createElementNS: (_namespace: string, tag: string) => new FakeElement(tag),
  };
}

/** A connected map container of the given size. */
export function fakeContainer(width: number, height: number): FakeElement {
  const container = new FakeElement('div');
  container.root = true;
  container.rect = { left: 0, top: 0, width, height };
  return container;
}
