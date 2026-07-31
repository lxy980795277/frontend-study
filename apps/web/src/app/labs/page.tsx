import { FlaskConical } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LAB_REGISTRY } from '@/config/lab-registry';
export const LabsPage = () => {
  return (
    <main className="min-h-dvh w-full px-5 py-10 sm:py-14 lg:px-8 lg:py-20">
      <div className="mx-auto w-full max-w-7xl">
        <section className="grid w-full items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(22rem,1.35fr)_minmax(0,1fr)] lg:gap-10">
          <Image
            alt="开发者搭建前端工程系统的手绘插画"
            className="mx-auto hidden h-auto w-full max-w-[21rem] md:block"
            height={512}
            loading="eager"
            src="/illustrations/labs-hero-builder-transparent.png"
            width={768}
          />

          <div className="text-center">
            <h1 className="text-4xl leading-[1.08] font-semibold tracking-[-0.045em] text-balance sm:text-5xl lg:text-[3.5rem]">
              把前端难题，做成
              <span className="relative mx-1 inline-block whitespace-nowrap">
                工程能力
                <span
                  aria-hidden
                  className="absolute -right-1 -bottom-2 left-1 h-1 -rotate-1 rounded-full bg-primary/70"
                />
              </span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              从浏览器交互到全栈链路，把 AI 时代的前端难点做成可运行、可测试、可复用的工程实验。
            </p>
          </div>

          <Image
            alt="流式事件、断线恢复与数据系统的手绘插画"
            className="mx-auto hidden h-auto w-full max-w-[21rem] md:block"
            height={512}
            loading="eager"
            src="/illustrations/labs-hero-stream-system-transparent.png"
            width={768}
          />

          <div className="grid grid-cols-2 gap-3 md:hidden">
            <Image
              alt=""
              className="h-auto w-full"
              height={512}
              loading="eager"
              src="/illustrations/labs-hero-builder-transparent.png"
              width={768}
            />
            <Image
              alt=""
              className="h-auto w-full"
              height={512}
              loading="eager"
              src="/illustrations/labs-hero-stream-system-transparent.png"
              width={768}
            />
          </div>
        </section>

        <section aria-label="实验模块" className="mt-12 grid w-full gap-4 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {LAB_REGISTRY.map((lab) => {
            return (
              <Link key={lab.slug} className="group outline-none" href={lab.route}>
                <Card className="h-full overflow-hidden border-border/80 bg-gradient-to-b from-accent/40 to-card shadow-none transition-[border-color,transform,box-shadow] duration-300 ease-out group-hover:border-primary/30 group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-ring motion-safe:group-hover:-translate-y-1 motion-reduce:transition-none">
                  <CardContent className="flex min-h-64 flex-col p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-primary shadow-sm">
                        <FlaskConical aria-hidden className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="line-clamp-2 leading-6 font-semibold">{lab.title}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">{lab.category}</p>
                      </div>
                    </div>
                    <p className="mt-5 line-clamp-3 text-sm leading-6 text-muted-foreground">{lab.description}</p>
                    {lab.status === 'building' && (
                      <div className="mt-auto pt-6">
                        <Badge variant="secondary">开发中</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
};
export default LabsPage;
