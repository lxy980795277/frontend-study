import DOMPurify from 'dompurify';
let hooksInstalled = false;
export const sanitizeMarkdownHtml = (html: string): string => {
  installHooks();
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['rel', 'target'],
    USE_PROFILES: {
      html: true,
    },
  });
};
const installHooks = (): void => {
  if (hooksInstalled) {
    return;
  }
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node instanceof HTMLAnchorElement) {
      node.setAttribute('rel', 'noopener noreferrer');
      node.setAttribute('target', '_blank');
    }
  });
  hooksInstalled = true;
};
