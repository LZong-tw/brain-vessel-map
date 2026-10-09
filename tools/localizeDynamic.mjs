import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { englishPattern, localizedNodes } from './localizationInventory.mjs';

export function localizeDynamic(file, source, rebuild = false) {
  const allNodes = localizedNodes(file, source);
  const nodes = allNodes.filter((entry) => !ts.isStringLiteralLike(entry.enExpression) && (rebuild || !entry.node.properties.some((p) => p.name?.getText(entry.tree) === 'localized')));
  const registrations = allNodes.filter((entry) => nodes.includes(entry) || entry.node.properties.some((p) => p.name?.getText(entry.tree) === 'localized')).filter(({node, tree}) => !(ts.isCallExpression(node.parent) && node.parent.expression.getText(tree) === 'withLocalized'));
  if (!nodes.length && !registrations.length) return source;
  const imports = new Set(nodes.length ? ['AdditionalLang'] : []);
  if (registrations.length) imports.add('withLocalized');
  const existingImport = /^import \{([^\n]+)\} from '\.\.\/i18n\/content';\r?\n/.exec(source);
  if (existingImport) for (const name of existingImport[1].split(',')) imports.add(name.trim().replace(/^type /, ''));
  const expression = (node, tree) => {
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node)) return expression(node.expression, tree);
    // English sentence capitalization splits the first letter from the rest.
    // Other languages need the whole translated label, followed by an empty suffix.
    const capitalization = /^(\w+)\.en\.charAt\(0\)\.toUpperCase\(\)$/.exec(node.getText(tree));
    if (capitalization) { imports.add('localizedContent'); return `localizedContent(${capitalization[1]}, contentLang)`; }
    if (/^\w+\.en\.slice\(1\)$/.test(node.getText(tree))) return "''";
    if (ts.isPropertyAccessExpression(node) && node.name.text === 'en') {
      imports.add('localizedContent');
      return `localizedContent(${node.expression.getText(tree)}, contentLang)`;
    }
    if (ts.isConditionalExpression(node)) return `(${node.condition.getText(tree)} ? ${expression(node.whenTrue, tree)} : ${expression(node.whenFalse, tree)})`;
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) return `(${expression(node.left, tree)} + ${expression(node.right, tree)})`;
    if (ts.isTemplateExpression(node)) return template(node, tree);
    imports.add('contentFragment');
    return `contentFragment(${node.getText(tree)}, contentLang)`;
  };
  const template = (node, tree) => {
    imports.add('contentTemplate');
    return `contentTemplate(${JSON.stringify(englishPattern(node))}, [${node.templateSpans.map((span) => expression(span.expression, tree)).join(', ')}], contentLang)`;
  };
  const edits = nodes.map(({ node, enExpression, tree }) => {
    const existing = node.properties.find((p) => p.name?.getText(tree) === 'localized');
    if (existing) return { at: existing.initializer.getStart(tree), end: existing.initializer.end, text: `(contentLang: AdditionalLang) => ${expression(enExpression, tree)}` };
    const last = node.properties[node.properties.length - 1];
    return { at: last.end, text: `, localized: (contentLang: AdditionalLang) => ${expression(enExpression, tree)}` };
  });
  for (const {node, tree} of registrations) edits.push({at: node.end, text: ')'}, {at: node.getStart(tree), text: 'withLocalized('});
  edits.sort((a, b) => b.at - a.at);
  for (const edit of edits) source = source.slice(0, edit.at) + edit.text + source.slice(edit.end ?? edit.at);
  const location = '../i18n/content';
  const names = [...imports].map((name) => name === 'AdditionalLang' ? 'type AdditionalLang' : name).join(', ');
  source = source.replace(/^import \{[^\n]+\} from '\.\.\/i18n\/content';\r?\n/, '');
  return `import { ${names} } from '${location}';\n${source}`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  for (const file of process.argv.slice(2)) fs.writeFileSync(file, localizeDynamic(file, fs.readFileSync(file, 'utf8')));
}
