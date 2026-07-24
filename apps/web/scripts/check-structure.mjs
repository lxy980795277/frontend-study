import { readdir } from 'node:fs/promises';
import { basename, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDirectory = fileURLToPath(new URL('../src/', import.meta.url));
const nextSpecialFiles = new Set(['error.tsx', 'global-error.tsx', 'layout.tsx', 'not-found.tsx', 'page.tsx']);
const kebabCasePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const fileNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+)*$/;
const routeGroupPattern = /^\([a-z0-9]+(?:-[a-z0-9]+)*\)$/;
const violations = [];

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...(await walk(entryPath)));
      continue;
    }
    files.push(entryPath);
  }

  return files;
};

const files = await walk(sourceDirectory);

for (const file of files) {
  const relativePath = relative(sourceDirectory, file);
  const fileName = basename(file);
  const pathSegments = relativePath.split('/');
  const directorySegments = pathSegments.slice(0, -1);

  directorySegments.forEach((segment) => {
    if (segment !== '__tests__' && !kebabCasePattern.test(segment) && !routeGroupPattern.test(segment)) {
      violations.push(`${relativePath}: source directories must use kebab-case`);
    }
  });

  if (!fileNamePattern.test(fileName)) {
    violations.push(`${relativePath}: source files must use kebab-case`);
  }

  if (/\.(service|store)\.ts$/.test(fileName)) {
    violations.push(`${relativePath}: frontend files must not use .service.ts or .store.ts suffixes`);
  }

  if (!fileName.endsWith('.tsx') || fileName.endsWith('.spec.tsx')) {
    continue;
  }

  if (relativePath.startsWith('app/') && nextSpecialFiles.has(fileName)) {
    continue;
  }

  if (fileName !== 'index.tsx') {
    violations.push(`${relativePath}: React components must use <component-name>/index.tsx`);
    continue;
  }

  const componentDirectoryName = basename(dirname(file));
  if (!kebabCasePattern.test(componentDirectoryName)) {
    violations.push(`${relativePath}: component directory must use kebab-case`);
  }
}

if (violations.length > 0) {
  console.error('Web structure check failed:');
  violations.forEach((violation) => {
    console.error(`- ${violation}`);
  });
  process.exitCode = 1;
} else {
  process.stdout.write('Web structure check passed.\n');
}
