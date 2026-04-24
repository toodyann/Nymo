import fs from 'node:fs/promises';
import path from 'node:path';

const workspaceRoot = process.cwd();
const stylesRoot = path.join(workspaceRoot, 'src', 'styles');
const keepFiles = new Set([
  path.join(stylesRoot, 'mobile', 'mobile-modern.css')
]);

async function listCssFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listCssFiles(p));
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      files.push(p);
    }
  }
  return files;
}

function removeMaxWidthMediaBlocks(input) {
  let out = '';
  let i = 0;
  const len = input.length;

  while (i < len) {
    const idx = input.indexOf('@media', i);
    if (idx === -1) {
      out += input.slice(i);
      break;
    }

    // Copy up to @media
    out += input.slice(i, idx);

    // Check if this @media is a max-width query
    const headerEnd = input.indexOf('{', idx);
    if (headerEnd === -1) {
      // malformed, copy rest
      out += input.slice(idx);
      break;
    }
    const header = input.slice(idx, headerEnd);
    const isMaxWidth = /\(\s*max-width\s*:\s*[^)]+\)/i.test(header);
    if (!isMaxWidth) {
      // keep this @media, continue scanning after it
      out += input.slice(idx, headerEnd + 1);
      i = headerEnd + 1;
      continue;
    }

    // Skip this entire block by finding matching closing brace.
    let depth = 0;
    let j = headerEnd;
    while (j < len) {
      const ch = input[j];
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          j += 1; // include closing brace
          break;
        }
      }
      j += 1;
    }
    // If we failed to find a close, drop remainder.
    i = j >= len ? len : j;
  }

  // Normalize excessive blank lines.
  out = out.replace(/\n{3,}/g, '\n\n');
  return out;
}

async function main() {
  const cssFiles = await listCssFiles(stylesRoot);
  const targets = cssFiles.filter((p) => !keepFiles.has(p));

  let changed = 0;
  for (const filePath of targets) {
    const before = await fs.readFile(filePath, 'utf8');
    if (!before.includes('@media')) continue;
    if (!/@media\s*\(\s*max-width\s*:/i.test(before)) continue;

    const after = removeMaxWidthMediaBlocks(before);
    if (after !== before) {
      await fs.writeFile(filePath, after, 'utf8');
      changed += 1;
    }
  }

  process.stdout.write(`Removed max-width @media blocks in ${changed} files.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

