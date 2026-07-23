# Labs Source

每个实验使用独立目录：

```text
<lab-name>/
├── index.ts
├── lab-page.tsx
├── components/
├── core/
├── adapters/
├── hooks/
├── store/
├── fixtures/
└── __tests__/
```

路由文件只从 Lab 的 `index.ts` 引用公开页面入口。
