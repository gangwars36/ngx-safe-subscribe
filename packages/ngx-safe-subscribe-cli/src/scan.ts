import { Project, Node, SourceFile, CallExpression, SyntaxKind } from 'ts-morph';

/**
 * RxJS operators that make a subscription "safe" — the stream completes on its
 * own, so no manual unsubscribe is required.
 */
const SAFE_OPERATORS = [
  'takeUntil',
  'takeUntilDestroyed',
  'untilDestroyed',
  'take',
  'first',
  'takeWhile',
];

export interface Finding {
  file: string;
  line: number;
  column: number;
  snippet: string;
}

export interface ScanResult {
  findings: Finding[];
  totalSubscribes: number;
  filesScanned: number;
}

/**
 * Scan a directory of TypeScript files for `.subscribe()` calls that look
 * unmanaged (i.e. potential memory leaks).
 *
 * @param target A directory (e.g. "./src") or a glob pattern.
 */
export function scan(target: string): ScanResult {
  const pattern = target.includes('*') ? target : `${target.replace(/\/+$/, '')}/**/*.ts`;

  const project = new Project({ skipAddingFilesFromTsConfig: true });
  project.addSourceFilesAtPaths([
    pattern,
    '!**/node_modules/**',
    '!**/*.spec.ts',
    '!**/*.d.ts',
  ]);

  const findings: Finding[] = [];
  let totalSubscribes = 0;

  for (const sourceFile of project.getSourceFiles()) {
    sourceFile.forEachDescendant((node) => {
      if (!Node.isCallExpression(node)) return;

      const expr = node.getExpression();
      if (!Node.isPropertyAccessExpression(expr)) return;
      if (expr.getName() !== 'subscribe') return;

      totalSubscribes++;

      if (isSafe(node, sourceFile)) return;

      const { line, column } = sourceFile.getLineAndColumnAtPos(node.getStart());
      findings.push({
        file: sourceFile.getFilePath(),
        line,
        column,
        snippet: node.getText().replace(/\s+/g, ' ').slice(0, 90),
      });
    });
  }

  return {
    findings,
    totalSubscribes,
    filesScanned: project.getSourceFiles().length,
  };
}

function isSafe(node: CallExpression, sourceFile: SourceFile): boolean {
  const text = node.getText();

  // 1. Completing operator anywhere in the chain (takeUntil, take(1), first...)
  if (SAFE_OPERATORS.some((op) => text.includes(`${op}(`))) {
    return true;
  }

  // 2. Added to a composite Subscription: someSub.add(source.subscribe())
  let ancestor = node.getParent();
  while (ancestor) {
    if (Node.isCallExpression(ancestor)) {
      const e = ancestor.getExpression();
      if (Node.isPropertyAccessExpression(e) && e.getName() === 'add') {
        return true;
      }
    }
    ancestor = ancestor.getParent();
  }

  // 3. Stored in a handle that is .unsubscribe()d somewhere in the file
  const parent = node.getParent();
  let handle: string | undefined;
  if (Node.isBinaryExpression(parent)) {
    handle = parent.getLeft().getText();
  } else if (Node.isVariableDeclaration(parent)) {
    handle = parent.getName();
  } else if (Node.isPropertyDeclaration(parent) && !parent.isStatic()) {
    // Class field initializer: `sub1 = source.subscribe();` lives on `this`
    handle = `this.${parent.getName()}`;
  }
  if (handle) {
    const shortName = handle.split('.').pop();
    const fileText = sourceFile.getFullText();
    if (
      fileText.includes(`${handle}.unsubscribe(`) ||
      (shortName && fileText.includes(`${shortName}.unsubscribe(`))
    ) {
      return true;
    }

    // 4. Class uses @AutoUnsubscribe(): any subscription stored on `this`
    // is torn down automatically by the decorator. We inspect the real class
    // decorator via the AST — a text search would wrongly match the name when
    // it only appears in a comment, string, or doc block.
    if (handle.startsWith('this.')) {
      const classDecl = node.getFirstAncestorByKind(SyntaxKind.ClassDeclaration);
      if (classDecl && classDecl.getDecorator('AutoUnsubscribe')) {
        return true;
      }
    }
  }

  return false;
}
