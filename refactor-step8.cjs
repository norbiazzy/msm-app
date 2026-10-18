'use strict';

// MSM refactoring, stage 8: extract the client details/editor from DealDetail.
// Based on branch main at commit 3c5c645, compatible with stage 7 once applied.
// No business API, state transitions, or upload logic is changed.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

function stop(message) {
  console.error('\n[MSM step 8] ' + message);
  process.exitCode = 1;
}

const root = process.cwd();
const folder = path.join(root, 'frontend', 'src', 'features', 'deals');
const sourcePath = path.join(folder, 'DealDetail.tsx');
const targetPath = path.join(folder, 'DealClientSection.tsx');
const frontend = path.join(root, 'frontend');
const sidebarPath = path.join(folder, 'DealSidebar.tsx');
const attentionPath = path.join(folder, 'DealAttention.tsx');

if (!fs.existsSync(path.join(frontend, 'package.json')) || !fs.existsSync(sourcePath)) {
  stop('Run this script from D:\\job\\it\\msm-app (the repository root).');
} else if (!fs.existsSync(sidebarPath) || !fs.existsSync(attentionPath)) {
  stop('Stage 7 is not applied yet. First run: node .\\refactor-step7.cjs');
} else if (fs.existsSync(targetPath)) {
  stop('DealClientSection.tsx already exists. No files changed. Check whether stage 8 is already applied.');
} else {
  const original = fs.readFileSync(sourcePath, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  let code = original.replace(/\r\n/g, '\n');
  let created = false;
  let changed = false;

  function exactlyOne(needle, label) {
    const first = code.indexOf(needle);
    if (first === -1 || code.indexOf(needle, first + needle.length) !== -1) {
      throw new Error('Expected exactly one ' + label + '. No changes were applied.');
    }
    return first;
  }

  try {
    const sidebarImport = "import { DealSidebar } from './DealSidebar';";
    const attentionImport = "import { DealAttention } from './DealAttention';";
    exactlyOne(sidebarImport, 'DealSidebar import (stage 7)');
    exactlyOne(attentionImport, 'DealAttention import (stage 7)');

    const startMarker = '      <div id="dealCClient" className="dealInfoBox dealCAnchor">';
    const nextMarker = '      <div\n        id="dealCInvoice"';
    const start = exactlyOne(startMarker, 'customer section');
    const end = exactlyOne(nextMarker, 'next invoice section');
    if (end <= start) throw new Error('Unexpected client section boundaries.');
    const section = code.slice(start, end);
    const required = [
      'Редактировать клиента',
      'Телефон заказчика',
      'Адреса доставки',
      'saveDealInfo',
      'addDeliveryAddress',
      'removeDeliveryAddress',
      'normalizedPhone()',
      'openMax',
      'Сохранить информацию',
    ];
    for (const marker of required) {
      if (!section.includes(marker)) throw new Error('Missing client section element: ' + marker);
    }
    if (section.split('\n').length < 350 || section.split('\n').length > 550) {
      throw new Error('Unexpected client section size; refusing to modify file.');
    }

    const props = [
      ['deal', 'Deal'],
      ['canManageDeal', 'boolean'],
      ['dealInfoOpen', 'boolean'],
      ['setDealInfoOpen', 'Setter<boolean>'],
      ['phoneMenuOpen', 'boolean'],
      ['setPhoneMenuOpen', 'Setter<boolean>'],
      ['normalizedPhone', '() => string'],
      ['openMax', '() => void'],
      ['editClientName', 'string'],
      ['setEditClientName', 'Setter<string>'],
      ['editContactName', 'string'],
      ['setEditContactName', 'Setter<string>'],
      ['editClientPhone', 'string'],
      ['setEditClientPhone', 'Setter<string>'],
      ['editManagerComment', 'string'],
      ['setEditManagerComment', 'Setter<string>'],
      ['editAddresses', 'string[]'],
      ['setEditAddresses', 'Setter<string[]>'],
      ['addDeliveryAddress', '() => void'],
      ['removeDeliveryAddress', '(index: number) => void'],
      ['saving', 'boolean'],
      ['saveDealInfo', '() => Promise<void>'],
    ];
    for (const [name] of props) {
      if (!new RegExp('\\b' + name + '\\b').test(section)) {
        throw new Error('Expected prop reference is missing: ' + name);
      }
    }
    const target = [
      "import type { Dispatch, SetStateAction } from 'react';",
      "import type { Deal } from '../../types';",
      "import { Field } from '../../shared/Field';",
      '',
      'type Setter<T> = Dispatch<SetStateAction<T>>;',
      '',
      'type DealClientSectionProps = {',
      ...props.map(([name, type]) => `  ${name}: ${type};`),
      '};',
      '',
      'export function DealClientSection({',
      ...props.map(([name]) => `  ${name},`),
      '}: DealClientSectionProps) {',
      '  return (',
      section.trimEnd(),
      '  );',
      '}',
      '',
    ].join('\n');
    const replacement = [
      '      <DealClientSection',
      ...props.map(([name]) => `        ${name}={${name}}`),
      '      />',
      '',
      '',
    ].join('\n');

    code = code.slice(0, start) + replacement + code.slice(end);
    code = code.replace(attentionImport, attentionImport + "\nimport { DealClientSection } from './DealClientSection';");
    if (code.includes(startMarker)) throw new Error('Original client section was not removed.');

    fs.writeFileSync(targetPath, target.replace(/\n/g, eol), 'utf8');
    created = true;
    fs.writeFileSync(sourcePath, code.replace(/\n/g, eol), 'utf8');
    changed = true;
    console.log('DealDetail.tsx: ' + original.replace(/\r\n/g, '\n').split('\n').length + ' -> ' + code.split('\n').length + ' lines');
    console.log('Created: frontend/src/features/deals/DealClientSection.tsx');
    console.log('Building frontend...\n');
    const result = cp.spawnSync('npm', ['run', 'build'], {
      cwd: frontend,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });
    if (result.error || result.status !== 0) {
      throw new Error('Frontend build failed (exit code ' + result.status + ').');
    }
    console.log('\nSUCCESS: stage 8 compiled. Test client editing, address changes, and phone actions in the browser.');
  } catch (err) {
    if (changed) fs.writeFileSync(sourcePath, original, 'utf8');
    if (created && fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
    stop(String(err.message || err) + '\nStage 8 rolled back. Previous changes were preserved.');
  }
}
