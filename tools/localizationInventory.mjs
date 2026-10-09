import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

export function englishPattern(node) {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isTemplateExpression(node)) return node.head.text + node.templateSpans.map((s, i) => `⟪${i}⟫${s.literal.text}`).join('');
  return null;
}

export function localizedNodes(file, source) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const entries = [];
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const props = node.properties.filter((p) => ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p));
      const en = props.find((p) => p.name.getText(tree) === 'en');
      const zh = props.find((p) => p.name.getText(tree) === 'zh');
      if (en && zh) {
        const enExpression = ts.isPropertyAssignment(en) ? en.initializer : en.name;
        const zhExpression = ts.isPropertyAssignment(zh) ? zh.initializer : zh.name;
        const key = englishPattern(enExpression);
        entries.push({ key, zh: englishPattern(zhExpression), file, line: tree.getLineAndCharacterOfPosition(en.getStart(tree)).line + 1, en, enExpression, node, tree });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return entries;
}

export function inventory(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return inventory(file);
    if (!/\.tsx?$/.test(file) || /\.test\./.test(file) || /translations|translation-input/.test(file)) return [];
    const source = fs.readFileSync(file, 'utf8');
    const authored = localizedNodes(file, source).flatMap(({ key, zh, file, line, enExpression }) => {
      const entries = key === null ? [] : [{ key, zh, file, line }];
      function nested(node) {
        if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node)) {
          nested(node.expression);
        } else if (ts.isStringLiteralLike(node)) {
          if (node !== enExpression && node.text.trim()) entries.push({ key: node.text, zh: null, file, line });
        } else if (ts.isTemplateExpression(node)) {
          if (node !== enExpression) entries.push({ key: englishPattern(node), zh: null, file, line });
          node.templateSpans.forEach((s) => nested(s.expression));
        } else if (ts.isConditionalExpression(node)) {
          nested(node.whenTrue); nested(node.whenFalse);
        } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
          nested(node.left); nested(node.right);
        }
      }
      nested(enExpression);
      return entries;
    });
    // Composed legacy paragraphs can keep their translated pieces in parallel closures.
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ['contentTemplate', 'contentFragment'].includes(node.expression.text)) {
        const key = node.arguments[0] && englishPattern(node.arguments[0]);
        if (key !== null && key !== undefined) authored.push({ key, zh: null, file, line: tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1 });
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
    return authored;
  });
}

if (process.argv[2] && process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const entries = inventory(process.argv[2]);
  if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(entries, null, 2) + '\n');
  else process.stdout.write(JSON.stringify(entries, null, 2) + '\n');
}
