'use client';

interface GlobalErrorProps {
  reset: () => void;
}

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="zh-CN">
      <body>
        <main className="flex min-h-screen items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-semibold">应用暂时不可用</h1>
            <p className="mt-3 text-sm">发生了未预期错误，请稍后重试。</p>
            <button className="mt-6 rounded-md border px-4 py-2" type="button" onClick={reset}>
              重试
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
