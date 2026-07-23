/** @type {import('prettier').Config} */
const config = {
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 120,
  proseWrap: 'preserve',
  semi: true,
  tabWidth: 2,
  useTabs: false,
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './apps/web/src/styles/globals.css',
};

export default config;
