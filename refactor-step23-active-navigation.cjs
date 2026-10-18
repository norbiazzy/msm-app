'use strict';

// MSM step 23: highlight the visible deal section in the sticky sidebar.
// Works on desktop only; uses existing deal anchor IDs; no API or data changes.
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const root = process.cwd();
const frontend = path.join(root, 'frontend');
const sidebarPath = path.join(frontend, 'src', 'features', 'deals', 'DealSidebar.tsx');
const detailPath = path.join(frontend, 'src', 'features', 'deals', 'DealDetail.tsx');
const invoicePath = path.join(frontend, 'src', 'features', 'deals', 'invoices', 'InvoiceRequestPanel.tsx');
const cssPath = path.join(frontend, 'src', 'styles.css');
const marker = 'MSM_STEP23_ACTIVE_DEAL_NAV';

function stop(message) {
  console.error('[MSM step23] ' + message);
  process.exit(1);
}
function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h.toString(16).padStart(8, '0');
}
function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0 || text.indexOf(from, first + from.length) >= 0) {
    throw new Error(label + ': unique source marker not found; no changes made');
  }
  return text.slice(0, first) + to + text.slice(first + from.length);
}
function normalize(text) { return text.replace(/\r\n/g, '\n'); }
function encode(text, original) {
  return original.includes('\r\n') ? text.replace(/\n/g, '\r\n') : text;
}

if (![sidebarPath, detailPath, invoicePath, cssPath, path.join(frontend, 'package.json')].every(fs.existsSync)) {
  stop('Run from D:\\job\\it\\msm-app. Required frontend files were not found.');
}

const originalSidebar = fs.readFileSync(sidebarPath, 'utf8');
const originalCss = fs.readFileSync(cssPath, 'utf8');
const sidebar = normalize(originalSidebar);
const css = normalize(originalCss);

if (sidebar.includes(marker) || css.includes(marker)) {
  if (sidebar.includes(marker) && css.includes(marker)) {
    console.log('[MSM step23] Navigation highlight is already installed. Nothing changed.');
    process.exit(0);
  }
  stop('Partial step23 marker found. Do not overwrite manually modified files.');
}
if (hash(sidebar) !== '5cb5a1bd') {
  stop('DealSidebar.tsx differs from the reviewed GitHub version. No changes were made.');
}
for (const id of ['dealCInvoice', 'dealCPayments', 'dealCIncoming', 'dealCDocuments']) {
  const source = id === 'dealCInvoice' ? fs.readFileSync(invoicePath, 'utf8') : fs.readFileSync(detailPath, 'utf8');
  if (!source.includes('id="' + id + '"')) stop('Missing section anchor: ' + id);
}
if (!css.includes('.dealWorkspaceCActions') || !css.includes('.dealWorkspaceCSidebar')) {
  stop('Expected deal sidebar CSS is missing.');
}

let nextSidebar = sidebar;
try {
  nextSidebar = replaceOnce(nextSidebar,
    "import type { Deal, Invoice } from '../../types';",
    "import { useEffect, useState } from 'react';\nimport type { Deal, Invoice } from '../../types';",
    'React hooks import');

  nextSidebar = replaceOnce(nextSidebar,
    'export function DealSidebar({ deal, current, incomingTotal, canManageDeal, onEditDeal }: DealSidebarProps) {\n  return (',
    `/* ${marker} */
const DEAL_SECTION_IDS = [
  'dealCInvoice',
  'dealCPayments',
  'dealCIncoming',
  'dealCDocuments',
] as const;
type DealSectionId = (typeof DEAL_SECTION_IDS)[number];

export function DealSidebar({ deal, current, incomingTotal, canManageDeal, onEditDeal }: DealSidebarProps) {
  const [activeSection, setActiveSection] = useState<DealSectionId>('dealCInvoice');

  useEffect(() => {
    // The four anchors are present in the main deal workspace.
    const sections = DEAL_SECTION_IDS
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element instanceof HTMLElement);
    if (sections.length !== DEAL_SECTION_IDS.length) return;

    let frame: number | undefined;
    const refresh = () => {
      frame = undefined;
      // Read which anchor most recently crossed the reading line below the header.
      const readingLine = Math.min(180, Math.max(105, window.innerHeight * 0.23));
      let next: DealSectionId = 'dealCInvoice';
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= readingLine) {
          next = section.id as DealSectionId;
        }
      }
      setActiveSection((current) => current === next ? current : next);
    };
    const schedule = () => {
      if (frame === undefined) frame = window.requestAnimationFrame(refresh);
    };

    // IntersectionObserver observes section boundaries. A rAF-throttled passive
    // scroll listener also handles long sections and smooth anchor navigation.
    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(schedule, { rootMargin: '-90px 0px -60% 0px' });
    sections.forEach((section) => observer?.observe(section));
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [deal.id]);

  function goToSection(id: DealSectionId) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (`, 'DealSidebar state and section navigation');

  for (const [id] of [
    ['dealCInvoice'], ['dealCPayments'], ['dealCIncoming'], ['dealCDocuments'],
  ]) {
    const oldClick = `                onClick={() =>
                  document
                    .getElementById(
                      '${id}'
                    )
                    ?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    })
                }`;
    const newClick = `                data-deal-section="${id}"
                aria-current={activeSection === '${id}' ? 'location' : undefined}
                onClick={() => goToSection('${id}')}`;
    nextSidebar = replaceOnce(nextSidebar, oldClick, newClick, 'Navigation link ' + id);
  }
} catch (error) {
  stop(error.message);
}

const newCss = `
/* ${marker} */
/* The active section is highlighted only on desktop, inside the sticky deal sidebar.
   Mobile navigation remains styled exactly as before. */
@media (min-width: 821px) {
  .boView-deal .dealWorkspaceCActions > button[data-deal-section] {
    position: relative;
    border: 1px solid var(--bo-line) !important;
    background: var(--bo-panel) !important;
    color: var(--bo-text) !important;
    transition: background-color 150ms ease, border-color 150ms ease;
  }

  .boView-deal .dealWorkspaceCActions > button[data-deal-section][aria-current='location'] {
    border-color: var(--bo-accent-strong) !important;
    background: var(--bo-accent-strong) !important;
    color: #fff !important;
    font-weight: 850;
    box-shadow: inset 4px 0 0 var(--bo-green);
  }

  .boView-deal .dealWorkspaceCActions > button[data-deal-section]:focus-visible {
    outline: 2px solid var(--bo-accent) !important;
    outline-offset: 2px;
  }
}

/* Smooth navigation should leave the target visible under the sticky top bar. */
.dealWorkspaceCPage #dealCInvoice,
.dealWorkspaceCPage #dealCPayments,
.dealWorkspaceCPage #dealCIncoming,
.dealWorkspaceCPage #dealCDocuments {
  scroll-margin-top: 105px;
}
/* END_${marker} */
`;
const nextCss = css.replace(/\n?$/, '\n') + newCss.trimStart();

let touched = false;
try {
  fs.writeFileSync(sidebarPath, encode(nextSidebar, originalSidebar), 'utf8');
  touched = true;
  fs.writeFileSync(cssPath, encode(nextCss, originalCss), 'utf8');
  console.log('[MSM step23] Active navigation installed. Running TypeScript and Vite build...');
  execSync('npm run build', { cwd: frontend, stdio: 'inherit' });
  console.log('[MSM step23] Checking whitespace in git diff...');
  execSync('git diff --check', { cwd: root, stdio: 'inherit' });
  console.log('SUCCESS: step 23 compiled. Test automatic section highlighting on desktop.');
} catch (error) {
  if (touched) {
    fs.writeFileSync(sidebarPath, originalSidebar, 'utf8');
    fs.writeFileSync(cssPath, originalCss, 'utf8');
    console.error('[MSM step23] Original files restored; local changes from earlier steps preserved.');
  }
  console.error('[MSM step23] Failed: ' + error.message);
  process.exit(1);
}
