'use strict';

// MSM step 22: keep the deal's left sidebar visible while scrolling on desktop.
// CSS-only. Does not change actions, APIs, data, or mobile layout.
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const root = process.cwd();
const frontendDir = path.join(root, 'frontend');
const cssFile = path.join(frontendDir, 'src', 'styles.css');
const marker = '/* MSM_STEP22_STICKY_DEAL_SIDEBAR */';

function fail(message) {
  console.error('[MSM step22] ' + message);
  process.exit(1);
}

if (!fs.existsSync(cssFile) || !fs.existsSync(path.join(frontendDir, 'package.json'))) {
  fail('Run this script from the msm-app repository root (frontend/src/styles.css was not found).');
}

const original = fs.readFileSync(cssFile, 'utf8');
if (original.includes(marker)) {
  console.log('[MSM step22] Sticky sidebar is already installed; nothing changed.');
  process.exit(0);
}

// These anchors belong to the deal workspace, not to tasks or the global shell.
for (const anchor of [
  '.dealWorkspaceCLayout',
  '.dealWorkspaceCSidebar',
  'position: sticky;',
  '.boView-deal.boShell',
  'overflow-x: hidden;',
]) {
  if (!original.includes(anchor)) {
    fail('Unexpected stylesheet version: missing ' + JSON.stringify(anchor) + '. No changes made.');
  }
}

// Avoid creating a second patch over a customized desktop-only sticky rule.
if (original.includes('MSM_STEP22_STICKY_DEAL_SIDEBAR')) {
  fail('The stylesheet already includes a step22 marker; no changes made.');
}

const css = `
${marker}
/* Desktop deal only. The global overflow-x:hidden on html/body/#root
   creates non-scrolling overflow ancestors that can break position:sticky.
   clip still prevents horizontal spill without capturing vertical scrolling. */
@media (min-width: 821px) {
  html:has(.boView-deal.boShell),
  body:has(.boView-deal.boShell),
  #root:has(.boView-deal.boShell) {
    overflow-x: clip !important;
    overflow-y: visible !important;
  }

  .boView-deal .dealWorkspaceCLayout {
    align-items: start;
  }

  .boView-deal .dealWorkspaceCSidebar {
    position: sticky;
    top: 88px;
    align-self: start;
    max-height: calc(100dvh - 108px);
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    z-index: 2;
  }
}
/* END_MSM_STEP22_STICKY_DEAL_SIDEBAR */
`;

const newline = original.includes('\r\n') ? '\r\n' : '\n';
const next = (original.endsWith('\n') ? original : original + newline) + css.trimStart().replace(/\n/g, newline);
let modified = false;
try {
  fs.writeFileSync(cssFile, next, 'utf8');
  modified = true;
  console.log('[MSM step22] Added desktop-only sticky sidebar CSS.');
  console.log('[MSM step22] Running frontend build...');
  execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });
  console.log('[MSM step22] Checking Git diff whitespace...');
  execSync('git diff --check', { cwd: root, stdio: 'inherit' });
  console.log('SUCCESS: step 22 compiled. Scroll a long deal on desktop and verify the sidebar follows the viewport.');
} catch (error) {
  if (modified) {
    fs.writeFileSync(cssFile, original, 'utf8');
    console.error('[MSM step22] The original styles.css has been restored.');
  }
  console.error('[MSM step22] Build/diff check failed:', error.message);
  process.exit(1);
}
