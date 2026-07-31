import { expect, type Locator, type Page, test } from '@playwright/test';

const LAB_ROUTE = '/labs/markdown-stream-rendering';
type RendererVariant = 'incremental' | 'legacy';

test.describe.configure({
  mode: 'serial',
  timeout: 60_000,
});

interface ScrollSnapshot {
  clientHeight: number;
  distanceFromBottom: number;
  scrollHeight: number;
  scrollTop: number;
  state: string | undefined;
}

const normalizeText = async (locator: Locator): Promise<string> => {
  const text = await locator.allTextContents();
  return text.join('').replaceAll(/\s+/gu, ' ').trim();
};

const selectScenario = async (page: Page, label: string): Promise<void> => {
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: label }).click();
};

const expectNoHorizontalPageOverflow = async (page: Page): Promise<void> => {
  const dimensions = await page.evaluate(() => {
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
};

const getRendererViewport = (page: Page, variant: RendererVariant, instance = 0): Locator => {
  return page.getByTestId(`${variant}-scroll-viewport-${instance}`);
};

const readScrollSnapshot = async (viewport: Locator): Promise<ScrollSnapshot> => {
  return viewport.evaluate((node) => {
    const element = node as HTMLElement;
    return {
      clientHeight: element.clientHeight,
      distanceFromBottom: Math.max(0, element.scrollHeight - element.scrollTop - element.clientHeight),
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
      state: element.dataset.stickToBottom,
    };
  });
};

const waitForOverflow = async (viewport: Locator): Promise<void> => {
  await expect
    .poll(async () => {
      const snapshot = await readScrollSnapshot(viewport);
      return snapshot.scrollHeight - snapshot.clientHeight;
    })
    .toBeGreaterThan(80);
};

const scrollToTop = async (viewport: Locator): Promise<void> => {
  await viewport.evaluate((node) => {
    const element = node as HTMLElement;
    element.scrollTop = 0;
    element.dispatchEvent(new Event('scroll'));
  });
};

const scrollToBottom = async (viewport: Locator): Promise<void> => {
  await viewport.evaluate((node) => {
    const element = node as HTMLElement;
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event('scroll'));
  });
};

test('prepares one ten-copy benchmark before measuring streamed continuation', async ({ page }) => {
  await page.goto(LAB_ROUTE);

  await expect(page.getByTestId('benchmark-status')).toContainText('超大基线已就绪', {
    timeout: 30_000,
  });
  await expect(page.getByTestId('benchmark-status')).toContainText('10×');
  await expect(page.getByTestId('metrics-panel')).toContainText('0 frames');

  const benchmarkTitle = '生产级 AI 流式前端：从可用链路到可观测增量渲染';
  await expect(
    page.getByTestId('legacy-renderer').getByRole('heading', {
      exact: true,
      name: benchmarkTitle,
    }),
  ).toHaveCount(10);
  await expect(
    page.getByTestId('incremental-renderer').getByRole('heading', {
      exact: true,
      name: benchmarkTitle,
    }),
  ).toHaveCount(10);

  const codeBlockGeometry = await page
    .getByTestId('legacy-renderer')
    .locator('pre')
    .first()
    .evaluate((element) => {
      return {
        clientHeight: element.clientHeight,
        maxHeight: Number.parseFloat(window.getComputedStyle(element).maxHeight),
        overflowY: window.getComputedStyle(element).overflowY,
        scrollHeight: element.scrollHeight,
      };
    });
  expect(codeBlockGeometry.scrollHeight).toBeGreaterThan(codeBlockGeometry.clientHeight);
  expect(codeBlockGeometry.maxHeight).toBeGreaterThan(0);
  expect(codeBlockGeometry.overflowY).toBe('auto');

  await page.getByRole('button', { name: '开始' }).click();
  await expect(page.getByTestId('benchmark-status')).toContainText('正在推送流式续写');
  await expect
    .poll(async () => {
      const text = await page.getByTestId('metrics-panel').textContent();
      return Number.parseInt(text?.match(/(\d+) frames/u)?.[1] ?? '0', 10);
    })
    .toBeGreaterThan(0);
});

test('shows a retryable state when the benchmark asset initially fails', async ({ page }) => {
  let shouldFail = true;
  await page.route('**/fixtures/markdown-stream-rendering/llm-benchmark.md', async (route) => {
    if (shouldFail) {
      shouldFail = false;
      await route.fulfill({
        body: 'Unavailable',
        status: 503,
      });
      return;
    }

    await route.continue();
  });

  await page.goto(LAB_ROUTE);
  await expect(page.getByTestId('benchmark-status')).toContainText('基准加载失败');
  await expect(page.getByRole('button', { name: '开始' })).toBeDisabled();

  await page.getByRole('button', { name: '重试' }).click();
  await expect(page.getByTestId('benchmark-status')).toContainText('超大基线已就绪', {
    timeout: 30_000,
  });
  await expect(page.getByRole('button', { name: '开始' })).toBeEnabled();
});

test('renders the same unsafe fixture in both columns without executing unsafe HTML', async ({ page }) => {
  await page.goto(LAB_ROUTE);

  await expect(page.getByRole('heading', { name: 'Markdown 流式增量渲染' })).toBeVisible();
  await expect(page.locator('[data-renderer-panel="legacy"]')).toBeVisible();
  await expect(page.locator('[data-renderer-panel="incremental"]')).toBeVisible();

  await selectScenario(page, 'XSS 安全');
  await page.getByRole('button', { name: '开始' }).click();

  const finalText = '正常的 Markdown 必须继续渲染';
  await expect(page.getByTestId('legacy-renderer')).toContainText(finalText, { timeout: 15_000 });
  await expect(page.getByTestId('incremental-renderer')).toContainText(finalText, { timeout: 15_000 });

  const legacyText = await normalizeText(page.getByTestId('legacy-renderer'));
  const incrementalText = await normalizeText(page.getByTestId('incremental-renderer').locator('.msr-content'));
  expect(incrementalText).toBe(legacyText);
  await expect(page.locator('.msr-markdown script')).toHaveCount(0);
  await expect(page.locator('.msr-markdown [onerror]')).toHaveCount(0);
  expect(
    await page.evaluate(() => {
      return Reflect.has(window, '__unsafe_markdown_executed__');
    }),
  ).toBe(false);
});

test('falls back safely after an injected Worker failure', async ({ page }) => {
  await page.goto(LAB_ROUTE);
  await selectScenario(page, '长文本');
  await page.getByRole('button', { name: '开始' }).click();
  await expect(page.getByTestId('incremental-renderer')).toContainText('渲染阶段', { timeout: 10_000 });

  await page.getByRole('button', { name: '注入 Worker 故障' }).click();
  await page.getByRole('tab', { name: '运行时' }).click();
  await expect(page.getByTestId('runtime-panel')).toContainText('fallback', { timeout: 10_000 });
  await expect(page.getByTestId('incremental-renderer')).toContainText('渲染阶段');
});

test('keeps the comparison aligned and contains scrolling at desktop and mobile widths', async ({ page }) => {
  await page.goto(LAB_ROUTE);
  await page.getByRole('button', { name: '4×' }).click();

  await expect(page.getByTestId('legacy-instances').locator('article')).toHaveCount(4);
  await expect(page.getByTestId('incremental-instances').locator('article')).toHaveCount(4);
  await expectNoHorizontalPageOverflow(page);

  const desktopPanels = await page.locator('[data-renderer-panel]').evaluateAll((panels) => {
    return panels.map((panel) => {
      const bounds = panel.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        top: bounds.top,
      };
    });
  });
  expect(desktopPanels).toHaveLength(2);
  expect(Math.abs((desktopPanels[0]?.top ?? 0) - (desktopPanels[1]?.top ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((desktopPanels[0]?.bottom ?? 0) - (desktopPanels[1]?.bottom ?? 0))).toBeLessThanOrEqual(1);

  await page.setViewportSize({ height: 844, width: 390 });
  await page.reload();
  await expect(page.locator('[data-renderer-panel="legacy"]')).toBeVisible();
  await expect(page.locator('[data-renderer-panel="incremental"]')).toBeVisible();
  await expectNoHorizontalPageOverflow(page);
});

test('follows both renderers, protects upward reading, and resumes at the bottom', async ({ page }) => {
  await page.goto(LAB_ROUTE);
  await selectScenario(page, '长文本');
  await page.getByRole('button', { name: '开始' }).click();

  const viewports = [getRendererViewport(page, 'legacy'), getRendererViewport(page, 'incremental')];
  for (const viewport of viewports) {
    await waitForOverflow(viewport);
    await expect
      .poll(async () => {
        return (await readScrollSnapshot(viewport)).distanceFromBottom;
      })
      .toBeLessThanOrEqual(1);
    await scrollToTop(viewport);
    await expect
      .poll(async () => {
        return (await readScrollSnapshot(viewport)).state;
      })
      .toBe('paused');
  }

  const pausedHeights = await Promise.all(
    viewports.map(async (viewport) => {
      return (await readScrollSnapshot(viewport)).scrollHeight;
    }),
  );
  for (const [index, viewport] of viewports.entries()) {
    await expect
      .poll(async () => {
        return (await readScrollSnapshot(viewport)).scrollHeight;
      })
      .toBeGreaterThan((pausedHeights[index] ?? 0) + 40);
    expect((await readScrollSnapshot(viewport)).scrollTop).toBeLessThanOrEqual(1);
    await scrollToBottom(viewport);
    await expect
      .poll(async () => {
        return (await readScrollSnapshot(viewport)).state;
      })
      .toBe('following');
  }

  for (const viewport of viewports) {
    await expect
      .poll(async () => {
        return (await readScrollSnapshot(viewport)).distanceFromBottom;
      })
      .toBeLessThanOrEqual(1);
  }
});

test('keeps follow state isolated between renderer instances', async ({ page }) => {
  await page.goto(LAB_ROUTE);
  await page.getByRole('button', { name: '4×' }).click();
  await selectScenario(page, '长文本');
  await page.getByRole('button', { name: '开始' }).click();

  const pausedViewport = getRendererViewport(page, 'legacy', 0);
  const followingViewport = getRendererViewport(page, 'legacy', 1);
  await waitForOverflow(pausedViewport);
  await waitForOverflow(followingViewport);
  await scrollToTop(pausedViewport);

  const pausedHeight = (await readScrollSnapshot(pausedViewport)).scrollHeight;
  await expect
    .poll(async () => {
      return (await readScrollSnapshot(pausedViewport)).scrollHeight;
    })
    .toBeGreaterThan(pausedHeight + 40);

  const pausedSnapshot = await readScrollSnapshot(pausedViewport);
  const followingSnapshot = await readScrollSnapshot(followingViewport);
  expect(pausedSnapshot.state).toBe('paused');
  expect(pausedSnapshot.scrollTop).toBeLessThanOrEqual(1);
  expect(followingSnapshot.state).toBe('following');
  expect(followingSnapshot.distanceFromBottom).toBeLessThanOrEqual(1);
});
