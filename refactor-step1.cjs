/**
 * MSM App - Step 1: safely extract stateless formatters from App.tsx.
 * Expected baseline: main at d76f1fa (or equivalent App.tsx anchors).
 * Execute in repo root: node refactor-step1.cjs
 * No business logic changes. Fails before writing if expectations are not met.
 */
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const appPath = path.join(root, 'frontend', 'src', 'App.tsx');
const outPath = path.join(root, 'frontend', 'src', 'shared', 'formatters.ts');
if (!fs.existsSync(appPath)) throw new Error('Run from msm-app repository root. frontend/src/App.tsx missing.');
if (fs.existsSync(outPath)) throw new Error('Destination shared/formatters.ts already exists; stopped without changes.');
const old = fs.readFileSync(appPath, 'utf8');
const eol = old.includes('\r\n') ? '\r\n' : '\n';
let app = old;
function moveExact(start, end, label) {
  const i = app.indexOf(start), j = app.indexOf(end, i + start.length);
  if (i < 0 || j < 0 || app.indexOf(start, i+1) !== -1 || j <= i) {
    throw new Error(`Cannot uniquely identify ${label}. No files changed.`);
  }
  const extracted = app.slice(i, j);
  app = app.slice(0, i) + app.slice(j);
  return extracted;
}
// The single-line constant must be moved with auditLabel, which reads it.
const seller = moveExact('const sellerLabels: Record<SellerType, string> =', `${eol}type View =`, 'sellerLabels').trim();
const formatterBlock = moveExact('function todayLocalDate() {', 'function ThemeToggle() {', 'formatter block').trim();
const footerStart = 'function roleName(role: CurrentUser[\'role\'])';
const footerEnd = 'export default App;';
const footerIndex = app.indexOf(footerStart);
const footerEndIndex = app.indexOf(footerEnd);
if (footerIndex === -1 || footerEndIndex === -1 || footerEndIndex <= footerIndex) throw new Error('Footer anchors changed. No files changed.');
const footerBlock = app.slice(footerIndex, footerEndIndex).trim();
if (!footerBlock.startsWith(footerStart) || !footerBlock.includes('function statusLabel(')) throw new Error('Footer content unexpected.');
app = app.slice(0, footerIndex) + app.slice(footerEndIndex);
for (const f of ['todayLocalDate','formatMoneyInput','parseMoneyInput','money','auditLabel','paymentStatusLabel','paymentMethodLabel','taskStatus','roleName','statusLabel']) {
  if (!new RegExp(`function\\s+${f}\\s*\\(`).test(formatterBlock + '\n' + footerBlock)) throw new Error(`Missing formatter ${f}`);
}
const imports = [
  'import type { ClientPaymentMethod, CurrentUser, PaymentStatus, SellerType } from \'../types\';',
  '',
  seller,
  '',
  formatterBlock.replace(/^function (todayLocalDate|formatMoneyInput|parseMoneyInput|money|auditLabel|paymentStatusLabel|paymentMethodLabel|taskStatus)\(/gm, 'export function $1('),
  '',
  footerBlock.replace(/^function (roleName|statusLabel)\(/gm, 'export function $1('),
  ''
].join(eol);
// Move sellerLabels into new module, preserving direct usage in App.
const output = imports.replace(/^const sellerLabels:/m, 'export const sellerLabels:');
const importLine = `import { auditLabel, formatMoneyInput, money, parseMoneyInput, paymentMethodLabel, paymentStatusLabel, roleName, sellerLabels, statusLabel, taskStatus, todayLocalDate } from './shared/formatters';`;
app = importLine + eol + app;
// Keep App's original EOL format.
const normalizedOut = output.replace(/\r?\n/g, eol);
const normalizedApp = app;
// Pre-validate all exports resolve: no git or npm command is performed here.
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, normalizedOut, 'utf8');
fs.writeFileSync(appPath, normalizedApp, 'utf8');
console.log('Refactor step 1 complete. Changed App.tsx and added shared/formatters.ts.');
console.log('NEXT: cd frontend; npm run build');
console.log('If build fails: git restore frontend/src/App.tsx; Remove-Item frontend/src/shared/formatters.ts');
