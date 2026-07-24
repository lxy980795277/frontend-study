import { expect, test } from '@playwright/test';

test('moves from Home into the card-only Labs entry and opens a module', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await page.goto('/');

  await expect(page).toHaveURL('/home');
  await expect(page.getByRole('heading', { name: /把前端难题/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: '系统状态' })).toBeVisible();
  await expect(page.getByRole('navigation', { exact: true, name: 'Labs 模块' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /侧边栏/ })).toHaveCount(0);
  await expect(page.getByText('运行正常')).toHaveCount(3);

  await page.getByRole('link', { name: '进入 Labs 工作台' }).click();

  await expect(page).toHaveURL('/labs');
  await expect(page.getByText('Labs 工作台', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Module catalog', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Labs 模块' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /侧边栏/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /把前端难题.*工程能力/ })).toBeVisible();
  await expect(page.getByRole('img', { name: '开发者搭建前端工程系统的手绘插画' })).toBeVisible();
  await expect(page.getByRole('img', { name: '流式事件、断线恢复与数据系统的手绘插画' })).toBeVisible();

  const labCard = page.getByRole('link').filter({ hasText: 'Agent 流式断线恢复' });
  await expect(labCard).toBeVisible();
  await labCard.click();

  await expect(page).toHaveURL('/labs/agent-stream-recovery');
  await expect(page.getByRole('heading', { name: 'Agent 流式断线恢复' })).toBeVisible();
  await expect(page.locator('aside')).toHaveCount(0);
  await page.getByRole('link', { name: '返回 Labs' }).click();
  await expect(page).toHaveURL('/labs');

  expect(consoleErrors).toEqual([]);
});

test('uses the same card-only Labs entry on mobile', async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto('/home');

  await expect(page.getByRole('navigation', { exact: true, name: '移动端 Labs 模块' })).toHaveCount(0);

  await page.getByRole('link', { name: '进入 Labs 工作台' }).click();

  await expect(page).toHaveURL('/labs');
  await expect(page.getByRole('navigation', { name: /Labs 模块/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /侧边栏/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /把前端难题.*工程能力/ })).toBeVisible();

  const labCard = page.getByRole('link').filter({ hasText: 'Agent 流式断线恢复' });
  await expect(labCard).toBeVisible();
  await labCard.click();

  await expect(page).toHaveURL('/labs/agent-stream-recovery');
  await expect(page.locator('aside')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '返回 Labs' })).toBeVisible();
});
