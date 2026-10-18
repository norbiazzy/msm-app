'use strict';

// MSM step 24: match sidebar navigation to the real order of deal sections.
// Highlight the active section without changing the button background.
// This script is intended to run AFTER refactor-step23-active-navigation.cjs.
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const root = process.cwd();
const front = path.join(root, 'frontend');
const sidebarFile = path.join(front, 'src', 'features', 'deals', 'DealSidebar.tsx');
const overviewFile = path.join(front, 'src', 'features', 'deals', 'DealOverview.tsx');
const dealFile = path.join(front, 'src', 'features', 'deals', 'DealDetail.tsx');
const invoiceFile = path.join(front, 'src', 'features', 'deals', 'invoices', 'InvoiceRequestPanel.tsx');
const clientFile = path.join(front, 'src', 'features', 'deals', 'DealClientSection.tsx');
const cssFile = path.join(front, 'src', 'styles.css');
const marker = 'MSM_STEP24_ORDERED_NAV_NO_FLASH';
const oldMarker = 'MSM_STEP23_ACTIVE_DEAL_NAV';

function fail(message) {
  console.error('[MSM step24] ' + message);
  process.exit(1);
}
function normalize(s) { return s.replace(/\r\n/g, '\n'); }
function matchEol(s, original) {
  return original.includes('\r\n') ? s.replace(/\n/g, '\r\n') : s;
}
function uniqueReplace(s, from, to, label) {
  const start = s.indexOf(from);
  if (start < 0 || s.indexOf(from, start + from.length) >= 0) {
    throw new Error('Expected one ' + label + '. Original files have not been changed.');
  }
  return s.slice(0, start) + to + s.slice(start + from.length);
}
function between(s, begin, finish, replacement, label, retainFinish = true) {
  const start = s.indexOf(begin);
  if (start < 0 || s.indexOf(begin, start + begin.length) !== -1) {
    throw new Error('Cannot uniquely locate ' + label + ' (begin).');
  }
  const end = s.indexOf(finish, start + begin.length);
  if (end < 0 || s.indexOf(finish, end + finish.length) !== -1) {
    throw new Error('Cannot uniquely locate ' + label + ' (end).');
  }
  return s.slice(0, start) + replacement + s.slice(end + (retainFinish ? 0 : finish.length));
}

const required = [sidebarFile, overviewFile, dealFile, invoiceFile, cssFile, path.join(front, 'package.json'), clientFile];
if (!required.every(fs.existsSync)) fail('Run from D:\\job\\it\\msm-app (required files not found).');
const original = new Map(required.slice(0, 5).map(p => [p, fs.readFileSync(p, 'utf8')]));
let sidebar = normalize(original.get(sidebarFile));
let overview = normalize(original.get(overviewFile));
let css = normalize(original.get(cssFile));

if (sidebar.includes(marker) || css.includes(marker)) {
  if (sidebar.includes(marker) && css.includes(marker) && overview.includes('id="dealCOverview"')) {
    console.log('[MSM step24] Already applied; no files changed.');
    process.exit(0);
  }
  fail('Partial step24 installation detected; stopping rather than overwriting changes.');
}
if (!sidebar.includes('/* ' + oldMarker + ' */') || !css.includes('/* ' + oldMarker + ' */')) {
  fail('Stage 23 active sidebar navigation was not found. Run stage 23 first.');
}
if (overview.includes('id="dealCOverview"')) {
  fail('Overview anchor is already customized; stopping to avoid duplicate IDs.');
}
const dealCode = normalize(original.get(dealFile));
const invoiceCode = normalize(original.get(invoiceFile));
const clientCode = normalize(fs.readFileSync(clientFile, 'utf8'));
for (const [id, source] of [
  ['dealCClient', clientCode], ['dealCInvoice', invoiceCode],
  ['dealCPayments', dealCode], ['dealCIncoming', dealCode],
  ['dealCDocuments', dealCode],
]) {
  if (!source.includes('id="' + id + '"')) fail('Expected deal section anchor was not found: ' + id);
}

const navLogic = `/* ${oldMarker} */
/* ${marker} */
const DEAL_NAV_ITEMS = [
  { id: 'dealCOverview', label: 'Сводка сделки' },
  { id: 'dealCClient', label: 'Данные клиента' },
  { id: 'dealCInvoice', label: 'Счёт и корректировки' },
  { id: 'dealCPayments', label: 'Оплата клиента' },
  { id: 'dealCIncoming', label: 'Поставщики и закупки' },
  { id: 'dealCDocuments', label: 'Доверенности и ЭТрН' },
] as const;

type DealSectionId = (typeof DEAL_NAV_ITEMS)[number]['id'];

export function DealSidebar({ deal, current, incomingTotal, canManageDeal, onEditDeal }: DealSidebarProps) {
  const [activeSection, setActiveSection] = useState<DealSectionId>('dealCOverview');

  useEffect(() => {
    const sections = DEAL_NAV_ITEMS
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element instanceof HTMLElement);
    if (sections.length !== DEAL_NAV_ITEMS.length) return;

    let frame: number | undefined;
    const refresh = () => {
      frame = undefined;
      const readingLine = Math.min(180, Math.max(105, window.innerHeight * 0.23));
      let next: DealSectionId = 'dealCOverview';
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= readingLine) {
          next = section.id as DealSectionId;
        }
      }
      // The last section remains selected after its top moves out of view.
      if (window.scrollY > 0 &&
          window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 16) {
        next = 'dealCDocuments';
      }
      setActiveSection((previous) => previous === next ? previous : next);
    };
    const schedule = () => {
      if (frame === undefined) frame = window.requestAnimationFrame(refresh);
    };

    // A passive listener tracks the reading position without layout changes.
    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(schedule, { rootMargin: '-90px 0px -55% 0px' });
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
    // Do not preselect on click; scrolling decides the active section.
    // This prevents selecting, deselecting and reselecting during smooth scroll.
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

`;

const navView = `            <div className="dealWorkspaceCActions" aria-label="Разделы сделки">
              {DEAL_NAV_ITEMS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className="secondary"
                  data-deal-section={id}
                  aria-current={activeSection === id ? 'location' : undefined}
                  onClick={() => goToSection(id)}
                >
                  {label}
                </button>
              ))}

              {canManageDeal && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    onEditDeal();
                    window.setTimeout(() =>
                      document.getElementById('dealCClient')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      }), 0);
                  }}
                >
                  Редактировать данные
                </button>
              )}
            </div>

`;

const navCss = `/* ${oldMarker} */
/* ${marker} */
/* Desktop: subtle active location marker; background never flips on click. */
@media (min-width: 821px) {
  .boView-deal .dealWorkspaceCActions > button[data-deal-section] {
    position: relative;
    border: 1px solid var(--bo-line) !important;
    background: var(--bo-panel) !important;
    color: var(--bo-text) !important;
    font-weight: 750;
    padding-left: 15px;
    transition: color 160ms ease, box-shadow 160ms ease;
  }
  .boView-deal .dealWorkspaceCActions > button[data-deal-section][aria-current='location'] {
    border-color: var(--bo-line) !important;
    background: var(--bo-panel) !important;
    color: var(--bo-accent-strong) !important;
    box-shadow: inset 4px 0 0 var(--bo-accent) !important;
  }
  .boView-deal .dealWorkspaceCActions > button[data-deal-section]:focus-visible {
    outline: 2px solid var(--bo-accent) !important;
    outline-offset: 2px;
  }
  .boView-deal .dealWorkspaceCActions > button:not([data-deal-section]) {
    margin-top: 9px;
    border-top: 1px solid var(--bo-line);
  }
}
/* Anchor targets must not disappear behind the fixed header. */
.dealWorkspaceCPage #dealCOverview,
.dealWorkspaceCPage #dealCClient,
.dealWorkspaceCPage #dealCInvoice,
.dealWorkspaceCPage #dealCPayments,
.dealWorkspaceCPage #dealCIncoming,
.dealWorkspaceCPage #dealCDocuments {
  scroll-margin-top: 105px;
}
/* END_${marker} */
/* END_${oldMarker} */`;

try {
  sidebar = between(sidebar, '/* ' + oldMarker + ' */', '  return (\n        <aside className="dealWorkspaceCSidebar">', navLogic, 'sidebar navigation state');
  sidebar = between(sidebar, '            <div className="dealWorkspaceCActions">', '            <div className="dealWorkspaceCSubhead">\n              Контакт на объекте', navView, 'sidebar navigation buttons');
  if (!sidebar.includes('Контакт на объекте') || !sidebar.includes('Финансы') ||
      sidebar.includes('            <div className="dealWorkspaceCActions">') ||
      (sidebar.match(/data-deal-section=\{id\}/g) || []).length !== 1) {
    throw new Error('Sidebar navigation boundary validation failed; nothing changed.');
  }
  overview = uniqueReplace(overview, '<div className="dealOverview">', '<div id="dealCOverview" className="dealOverview dealCAnchor">', 'overview root anchor');
  css = between(css, '/* ' + oldMarker + ' */', '/* END_' + oldMarker + ' */', navCss, 'stage23 CSS', false);
} catch (error) {
  fail(error.message);
}

const changes = [[sidebarFile, sidebar], [overviewFile, overview], [cssFile, css]];
let touched = false;
try {
  for (const [file, content] of changes) {
    touched = true;
    fs.writeFileSync(file, matchEol(content, original.get(file)), 'utf8');
  }
  console.log('[MSM step24] Reordered six sidebar links. Running frontend build...');
  execSync('npm run build', { cwd: front, stdio: 'inherit' });
  execSync('git diff --check', { cwd: root, stdio: 'inherit' });
  console.log('SUCCESS: step24 compiled. Verify navigation order and scroll highlighting in browser.');
} catch (error) {
  if (touched) {
    for (const [file] of changes) {
      fs.writeFileSync(file, original.get(file), 'utf8');
    }
    console.error('[MSM step24] Build failed. All stage24 file changes have been restored.');
  }
  console.error('[MSM step24] ' + error.message);
  process.exit(1);
}
