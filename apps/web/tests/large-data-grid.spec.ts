import { expect, type Page, test } from '@playwright/test';

const LAB_ROUTE = '/labs/large-data-grid';

test.describe.configure({
  mode: 'serial',
  timeout: 90_000,
});

test('navigates and selects cells in the default million-by-hundred Worker grid', async ({ page }) => {
  await page.goto(LAB_ROUTE);

  await expect(page.getByRole('heading', { name: '大数据表格离屏渲染' })).toBeVisible();
  const status = page.getByTestId('large-data-grid-status');
  await expect(status).toContainText('Ready', {
    timeout: 15_000,
  });
  await expect(status).toContainText('worker-offscreen');
  await expect(status).toContainText('100,000,000 逻辑单元格');
  await expect(status).toContainText('1,000,000 显示行');

  await page.getByRole('spinbutton', { name: '跳转到显示行' }).fill('500000');
  await page.getByRole('button', { name: '跳转', exact: true }).click();
  await expect(status).toContainText(/R499\d{3}–/u);

  const viewport = page.getByTestId('large-data-grid-viewport');
  await viewport.click({
    position: {
      x: 600,
      y: 280,
    },
  });
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowRight');

  await expect(status).toContainText(/row-\d{7} \/ column-\d+/u);
  await expect(page.getByTestId('large-data-grid-selection-overlay')).toBeVisible();
  await expect(page.getByTestId('large-data-grid-active-overlay')).toHaveAttribute('title', /\S+/u);
  await expect(page.getByRole('gridcell')).toHaveCount(1);

  const secondResizeHandle = page.getByRole('button', { name: '调整 Status 2 列宽' });
  const secondHandleBefore = await secondResizeHandle.boundingBox();
  const firstResizeHandle = page.getByRole('button', { name: '调整 Row ID 1 列宽' });
  const firstHandleBounds = await firstResizeHandle.boundingBox();
  expect(firstHandleBounds).not.toBeNull();
  const firstHandleCenterX = (firstHandleBounds?.x ?? 0) + (firstHandleBounds?.width ?? 0) / 2;
  const firstHandleCenterY = (firstHandleBounds?.y ?? 0) + (firstHandleBounds?.height ?? 0) / 2;
  await page.mouse.move(firstHandleCenterX, firstHandleCenterY);
  await page.mouse.down();
  await page.mouse.move(firstHandleCenterX + 36, firstHandleCenterY);
  await page.mouse.up();
  await expect
    .poll(async () => {
      return (await secondResizeHandle.boundingBox())?.x ?? 0;
    })
    .toBeGreaterThan((secondHandleBefore?.x ?? 0) + 20);
  await expect(status).toContainText('Ready');
  await expect(status).toContainText('worker-offscreen');

  await selectRenderer(page, 'DOM 双向虚拟化');
  await expect(status).toContainText('Ready');
  await expect(status).toContainText('dom');
  await expect(status).toContainText(/row-\d{7} \/ column-\d+/u);
  const domGrid = page.getByTestId('dom-virtual-grid');
  await expect(domGrid).toBeVisible();
  await expect(domGrid.locator('svg')).toHaveCount(0);
  await expect(domGrid.locator('foreignObject')).toHaveCount(0);
  const visibleDomCellCount = await domGrid.locator('[data-grid-cell]').count();
  expect(visibleDomCellCount).toBeGreaterThan(0);
  expect(visibleDomCellCount).toBeLessThan(1_000);

  await selectRenderer(page, '主线程 Canvas');
  await expect(status).toContainText('Ready');
  await expect(status).toContainText('main-canvas');

  await selectRenderer(page, 'Worker Offscreen');
  await expect(status).toContainText('Ready');
  await expect(status).toContainText('worker-offscreen');

  await page.getByRole('textbox', { name: '过滤关键词' }).fill('ready');
  await page.getByRole('button', { name: '应用查询' }).click();
  await expect(status).toContainText(/查询完成，共 (?!1,000,000)\d[\d,]* 行/u, {
    timeout: 30_000,
  });
  await expect(status).toContainText('worker-offscreen');
  await expect(status).not.toContainText('Fallback');
});

test('keeps a compact toolbar and gives the remaining viewport height to the grid', async ({ page }) => {
  await page.setViewportSize({
    height: 900,
    width: 1440,
  });
  await page.goto(LAB_ROUTE);

  await expect(page.getByTestId('large-data-grid-status')).toContainText('Ready', {
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: '更多设置' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('combobox', { name: '数据行数' })).toBeHidden();

  const compactLayout = await readWorkbenchLayout(page);
  expect(compactLayout.documentScrollHeight).toBeLessThanOrEqual(compactLayout.documentClientHeight + 1);
  expect(compactLayout.gridBottom).toBeLessThanOrEqual(compactLayout.viewportHeight);
  expect(compactLayout.gridHeight).toBeGreaterThan(560);

  await page.getByRole('button', { name: '更多设置' }).click();
  await expect(page.getByRole('button', { name: '更多设置' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('combobox', { name: '数据行数' })).toBeVisible();

  const expandedLayout = await readWorkbenchLayout(page);
  expect(expandedLayout.documentScrollHeight).toBeLessThanOrEqual(expandedLayout.documentClientHeight + 1);
  expect(expandedLayout.gridBottom).toBeLessThanOrEqual(expandedLayout.viewportHeight);
  expect(expandedLayout.gridHeight).toBeLessThan(compactLayout.gridHeight);
});

test('falls back safely, keeps querying, and protects oversized copies', async ({ page }) => {
  await page.goto(LAB_ROUTE);

  const status = page.getByTestId('large-data-grid-status');
  await expect(status).toContainText('Ready', {
    timeout: 15_000,
  });
  await page.getByRole('button', { name: '更多设置' }).click();
  await page.getByRole('button', { name: '注入 Worker 故障' }).click();
  await expect(status).toContainText('Fallback');
  await expect(status).toContainText('main-canvas');
  await expect(status).toContainText('Worker 已安全降级');
  await expect(status).not.toContainText('等待首帧', {
    timeout: 15_000,
  });

  await page.getByRole('textbox', { name: '过滤关键词' }).fill('ready');
  await page.getByRole('button', { name: '应用查询' }).click();
  await expect(status).toContainText(/查询完成，共 (?!1,000,000)\d[\d,]* 行/u, {
    timeout: 30_000,
  });

  await page.getByRole('button', { name: '全选' }).click();
  await page.getByRole('button', { name: '复制 TSV' }).click();
  await expect(status).toContainText('超过 50000 个的复制上限');

  await page.getByRole('textbox', { name: '过滤关键词' }).fill('definitely-not-present');
  await page.getByRole('button', { name: '应用查询' }).click();
  await expect(status).toContainText('查询完成，没有匹配行。', {
    timeout: 30_000,
  });

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(status).toContainText('Ready', {
    timeout: 15_000,
  });
  await expect(status).toContainText('worker-offscreen');
  await expect(status).toContainText('已重置查询、选区、列宽和运行指标。');
});

test('completes an isolated three-renderer benchmark with consistent output', async ({ page }) => {
  await page.goto(`${LAB_ROUTE}?mode=benchmark`);

  await page.getByRole('combobox', { name: 'Benchmark 正式轮次' }).click();
  await page.getByRole('option', { name: '1 轮' }).click();
  await page.getByRole('button', { name: '开始隔离基准' }).click();

  const report = page.getByTestId('grid-benchmark-report');
  await expect(report).toContainText('completed · 3 次已完成执行', {
    timeout: 90_000,
  });

  const resultRows = report.locator('tbody tr');
  await expect(resultRows).toHaveCount(3);
  await expect(resultRows.nth(0)).toContainText('dom');
  await expect(resultRows.nth(1)).toContainText('main-canvas');
  await expect(resultRows.nth(2)).toContainText('worker-offscreen');

  const digests = await resultRows.locator('td:last-child').allTextContents();
  expect(new Set(digests).size).toBe(1);
});

test('keeps the million-row grid contained and accessible on a narrow viewport', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await page.setViewportSize({
    height: 844,
    width: 390,
  });
  await page.goto('/labs');
  await page
    .getByRole('link')
    .filter({
      hasText: '大数据表格离屏渲染',
    })
    .click();

  const grid = page.getByRole('grid', { name: '百万行大数据表格' });
  await expect(grid).toHaveAttribute('aria-rowcount', '1000000');
  await expect(grid).toHaveAttribute('aria-colcount', '100');
  await expect(page.getByTestId('large-data-grid-status')).toContainText('Ready', {
    timeout: 15_000,
  });

  const dimensions = await page.evaluate(() => {
    return {
      clientHeight: document.documentElement.clientHeight,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.clientHeight + 1);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  expect(consoleErrors).toEqual([]);
});

const readWorkbenchLayout = async (
  page: Page,
): Promise<{
  documentClientHeight: number;
  documentScrollHeight: number;
  gridBottom: number;
  gridHeight: number;
  viewportHeight: number;
}> => {
  return page.evaluate(() => {
    const grid = document.querySelector<HTMLElement>('[data-testid="large-data-grid-viewport"]');
    if (!grid) {
      throw new Error('Grid viewport is missing.');
    }
    const bounds = grid.getBoundingClientRect();
    return {
      documentClientHeight: document.documentElement.clientHeight,
      documentScrollHeight: document.documentElement.scrollHeight,
      gridBottom: bounds.bottom,
      gridHeight: bounds.height,
      viewportHeight: window.innerHeight,
    };
  });
};

const selectRenderer = async (page: Page, label: string): Promise<void> => {
  await page.getByRole('combobox', { name: 'Renderer' }).click();
  await page.getByRole('option', { name: label }).click();
};
