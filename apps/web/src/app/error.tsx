'use client';
import { RotateCcw } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
interface ErrorPageProps {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}
export const ErrorPage = ({ error, reset }: ErrorPageProps) => {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-xl">
        <CardContent className="p-8 text-center">
          <h1 className="text-xl font-semibold">页面加载失败</h1>
          <p className="mt-2 text-sm text-muted-foreground">请重试；如果问题持续存在，请检查浏览器控制台。</p>
          <Button className="mt-6" onClick={reset}>
            <RotateCcw aria-hidden className="size-4" />
            重新加载
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
export default ErrorPage;
