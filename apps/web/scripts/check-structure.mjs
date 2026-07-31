import { readFile, readdir } from 'node:fs/promises';
import { basename, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const sourceDirectory = fileURLToPath(new URL('../src/', import.meta.url));
const nextSpecialFiles = new Set(['error.tsx', 'global-error.tsx', 'layout.tsx', 'not-found.tsx', 'page.tsx']);
const kebabCasePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const fileNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+)*$/;
const routeGroupPattern = /^\([a-z0-9]+(?:-[a-z0-9]+)*\)$/;
const violations = [];
const labRootPattern = /^labs\/([^/]+)\//;

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

  const labMatch = relativePath.match(labRootPattern);
  if (labMatch && relativePath.includes('/components/lab/')) {
    violations.push(`${relativePath}: Lab components must not add a redundant components/lab directory`);
  }

  if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
    const sourceText = await readFile(file, 'utf8');
    const sourceFile = ts.createSourceFile(
      file,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const inLabTypesDirectory = labMatch !== null && relativePath.includes('/types/');

    const recordNodeViolation = (node, message) => {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      violations.push(`${relativePath}:${String(position.line + 1)} ${message}`);
    };

    const inspectNode = (node) => {
      if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
        recordNodeViolation(node, 'runtime functions must use arrow-function expressions');
      }

      if (ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
        recordNodeViolation(node, 'class and object runtime methods must use arrow-function properties');
      }

      if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
        recordNodeViolation(node, 'arrow functions must use block bodies with explicit returns');
      }

      if (
        labMatch &&
        !inLabTypesDirectory &&
        (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) &&
        !node.name.text.endsWith('Props')
      ) {
        recordNodeViolation(node, 'non-Props Lab types must live in the Lab types directory');
      }

      if (
        inLabTypesDirectory &&
        (ts.isVariableStatement(node) ||
          ts.isFunctionDeclaration(node) ||
          ts.isClassDeclaration(node) ||
          ts.isEnumDeclaration(node))
      ) {
        recordNodeViolation(node, 'Lab type modules must not declare runtime values');
      }

      ts.forEachChild(node, inspectNode);
    };

    inspectNode(sourceFile);
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

const labDirectories = new Set(
  files.flatMap((file) => {
    const relativePath = relative(sourceDirectory, file);
    const match = relativePath.match(labRootPattern);
    return match?.[1] ? [match[1]] : [];
  }),
);

for (const labDirectory of labDirectories) {
  const hasTypes = files.some((file) => {
    return relative(sourceDirectory, file).startsWith(`labs/${labDirectory}/types/`);
  });
  const hasComponentEntry = files.some((file) => {
    return relative(sourceDirectory, file) === `labs/${labDirectory}/components/index.tsx`;
  });
  if (!hasTypes) {
    violations.push(`labs/${labDirectory}: each Lab must provide a root types directory`);
  }
  if (!hasComponentEntry) {
    violations.push(`labs/${labDirectory}: each Lab must provide components/index.tsx without a redundant lab layer`);
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
