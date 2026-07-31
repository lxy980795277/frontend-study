import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import '@/styles/globals.css';
const geistSans = Geist({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-geist-sans',
});
const geistMono = Geist_Mono({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-geist-mono',
});
export const metadata: Metadata = {
  description: '面向 AI 应用时代的前端高阶工程实验平台',
  title: 'AI Frontend Engineering Lab',
};
interface RootLayoutProps {
  children: ReactNode;
}
export const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html className={`${geistSans.variable} ${geistMono.variable}`} lang="zh-CN">
      <body>{children}</body>
    </html>
  );
};
export default RootLayout;
