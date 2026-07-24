import { expect, type Page, test } from '@playwright/test';

const LAB_ROUTE = '/labs/agent-stream-recovery';
const THREAD_ID_PATTERN = /threadId=([0-9a-f-]+)/;

const getThreadId = (page: Page): string => {
  const match = THREAD_ID_PATTERN.exec(page.url());
  if (!match?.[1]) {
    throw new Error('Thread ID is missing from the Lab URL');
  }
  return match[1];
};

const sendPrompt = async (page: Page, prompt: string): Promise<string> => {
  const promptInput = page.getByRole('textbox', { name: '输入消息' });
  await promptInput.fill(prompt);
  await promptInput.press('Enter');
  await expect(page).toHaveURL(THREAD_ID_PATTERN);
  return getThreadId(page);
};

const expectSingleCompletedReply = async (page: Page, prompt: string): Promise<void> => {
  await expect(page.getByTestId('run-phase')).toHaveText('completed', { timeout: 30_000 });
  const assistantMessages = page.locator('[data-message-role="assistant"]');
  await expect(assistantMessages).toHaveCount(1);
  await expect(assistantMessages).toContainText(prompt);
  await expect(assistantMessages).not.toContainText('streaming');
};

test('waits for a manual reconnect after a simulated disconnect without duplicate text', async ({ page, request }) => {
  let threadId: string | null = null;
  const prompt = '验证页面内断线续传';

  try {
    await page.goto(LAB_ROUTE);
    threadId = await sendPrompt(page, prompt);

    await expect(page.getByRole('button', { name: '模拟断线' })).toBeEnabled();
    await page.getByRole('button', { name: '模拟断线' }).click();
    await expect(page.getByTestId('run-phase')).toHaveText('disconnected');
    await expect(page.getByRole('button', { name: '模拟重连' })).toBeEnabled();

    await page.waitForTimeout(500);
    await expect(page.getByTestId('run-phase')).toHaveText('disconnected');

    const reconnectRequestPromise = page.waitForRequest((request) => {
      return request.method() === 'POST' && request.url().endsWith('/backend/stream');
    });
    await page.getByRole('button', { name: '模拟重连' }).click();
    const reconnectRequest = await reconnectRequestPromise;
    expect(reconnectRequest.headers()['last-event-id']).toBeTruthy();

    await expectSingleCompletedReply(page, prompt);

    await page.getByRole('tab', { name: '连接' }).click();
    await expect(page.getByText('reconnectAttempt').locator('..')).toContainText('1');
    await expect(page.getByText('duplicateEvents').locator('..')).toContainText('0');
  } finally {
    if (threadId) {
      await request.delete(`/backend/threads/${threadId}`);
    }
  }
});

test('restores an active run from thread history after a full page reload', async ({ page, request }) => {
  let threadId: string | null = null;
  const prompt = '验证刷新后的 activeRun 恢复';

  try {
    await page.goto(LAB_ROUTE);
    threadId = await sendPrompt(page, prompt);

    await expect(page.getByTestId('run-phase')).toHaveText('streaming');
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`threadId=${threadId}`));
    await expectSingleCompletedReply(page, prompt);

    const businessStorageKeys = await page.evaluate(() => {
      return [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter((key) => {
        return !key.startsWith('__next_');
      });
    });
    expect(businessStorageKeys).toEqual([]);
  } finally {
    if (threadId) {
      await request.delete(`/backend/threads/${threadId}`);
    }
  }
});

test('converges an injected producer failure to RUN_ERROR', async ({ page, request }) => {
  let threadId: string | null = null;

  try {
    await page.goto(LAB_ROUTE);
    await page.getByRole('tab', { name: '故障' }).click();
    await page.getByRole('spinbutton', { name: '指定 Chunk 后失败' }).fill('2');
    threadId = await sendPrompt(page, '验证 Producer 失败终态');

    await expect(page.getByTestId('run-phase')).toHaveText('failed', { timeout: 15_000 });
    await page.getByRole('tab', { name: '事件' }).click();
    await expect(page.getByTestId('event-log')).toContainText('RUN_ERROR');
  } finally {
    if (threadId) {
      await request.delete(`/backend/threads/${threadId}`);
    }
  }
});

test('aborts a run without entering the reconnect loop', async ({ page, request }) => {
  let threadId: string | null = null;

  try {
    await page.goto(LAB_ROUTE);
    threadId = await sendPrompt(page, '验证用户主动停止');

    await expect(page.getByRole('button', { name: '停止运行' })).toBeEnabled();
    const abortResponsePromise = page.waitForResponse((response) => {
      return response.request().method() === 'POST' && response.url().endsWith('/backend/stream/abort');
    });
    await page.getByRole('button', { name: '停止运行' }).click();
    const abortResponse = await abortResponsePromise;
    const abortResponseBody = await abortResponse.text();
    expect(abortResponse.status(), abortResponseBody).toBe(202);
    await expect(page.getByTestId('run-phase')).toHaveText('aborted', { timeout: 15_000 });

    await page.getByRole('tab', { name: '连接' }).click();
    await expect(page.getByText('reconnectAttempt').locator('..')).toContainText('0');
  } finally {
    if (threadId) {
      await request.delete(`/backend/threads/${threadId}`);
    }
  }
});
