import { expect, test } from '@playwright/test';

test('moves from the standalone Home page into the Labs workspace', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: /把前端难题/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: '系统状态' })).toBeVisible();
  await expect(page.getByRole('navigation', { exact: true, name: 'Labs 模块' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /侧边栏/ })).toHaveCount(0);
  await expect(page.getByText('运行正常')).toHaveCount(3);

  await page.getByRole('link', { name: '进入 Labs 工作台' }).click();

  await expect(page).toHaveURL('/labs');
  await expect(page.getByRole('heading', { name: 'Labs 工作台', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { exact: true, name: 'Labs 模块' })).toBeVisible();
  await expect(page.getByText('暂无实验模块')).toBeVisible();
  await expect(page.getByText('实验工作台已就绪')).toBeVisible();

  await page.getByRole('button', { name: '收起侧边栏' }).click();
  await expect(page.getByRole('button', { name: '展开侧边栏' })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('uses the compact Labs navigation on mobile', async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto('/');

  await expect(page.getByRole('navigation', { exact: true, name: '移动端 Labs 模块' })).toHaveCount(0);

  await page.getByRole('link', { name: '进入 Labs 工作台' }).click();

  await expect(page).toHaveURL('/labs');
  await expect(page.getByRole('navigation', { exact: true, name: '移动端 Labs 模块' })).toBeVisible();
  await expect(page.getByRole('navigation', { exact: true, name: 'Labs 模块' })).not.toBeVisible();
  await expect(page.getByRole('link', { exact: true, name: '返回 Home' })).toBeVisible();
});
