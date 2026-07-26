import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { BlockTools } from '../components/block-tools';
import type { BlockKind } from '../core/diff/blocks';

export class BlockToolsManager {
  private readonly roots = new Map<HTMLElement, Root>();

  sync(container: HTMLElement): void {
    this.removeDetachedRoots(container);

    container.querySelectorAll<HTMLElement>(':scope > .msr-block[data-needs-tools="true"]').forEach((block) => {
      const host = block.querySelector<HTMLElement>(':scope > .msr-tools');
      if (!host) {
        return;
      }

      let root = this.roots.get(block);
      if (!root) {
        root = createRoot(host);
        this.roots.set(block, root);
      }

      root.render(
        createElement(BlockTools, {
          block,
          kind: (block.dataset.kind ?? 'code') as BlockKind,
        }),
      );
    });
  }

  unmount(block: HTMLElement): void {
    const root = this.roots.get(block);
    if (!root) {
      return;
    }

    this.roots.delete(block);
    queueMicrotask(() => {
      root.unmount();
    });
  }

  clear(): void {
    Array.from(this.roots.keys()).forEach((block) => {
      this.unmount(block);
    });
  }

  private removeDetachedRoots(container: HTMLElement): void {
    Array.from(this.roots.keys()).forEach((block) => {
      if (!container.contains(block)) {
        this.unmount(block);
      }
    });
  }
}
