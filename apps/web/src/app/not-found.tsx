import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
export const NotFoundPage = () => {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardContent className="p-8 text-center">
          <p className="font-mono text-sm text-muted-foreground">404</p>
          <h1 className="mt-2 text-xl font-semibold">页面不存在</h1>
          <p className="mt-2 text-sm text-muted-foreground">这个 Lab 可能尚未创建，或路由已经调整。</p>
          <Button asChild className="mt-6">
            <Link href="/home">返回 Home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};
export default NotFoundPage;
