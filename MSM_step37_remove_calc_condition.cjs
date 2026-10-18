#!/usr/bin/env node
/**
 * MSM step37: safely remove obsolete calculation condition from invoice requests.
 * Prepared against the MSM step36 source snapshot (commit 1aa1f18).
 * Does not access or change PostgreSQL. Does not commit or push.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = __dirname;
const patches = {"backend/prisma/schema.prisma":{"before":"27a0c6c3b99ff2a78b016700662ec47f6c243a5cda8ae6cf41660bc74051979d","after":"84478464fe6d7b0ad58521ea94f938c353b710c4059cd266bc8fdaee6ceb92f7","ops":[[2237,2323,""]]},"backend/src/deals/dto.ts":{"before":"8bccd849d494e987a9a76164f27d205de48fff3c413a0d1eae8ec0c00c131b5d","after":"ab1a85c21548929183456571035a405ce00bd5abe2a5eb36d35cf8341af32ba9","ops":[[597,708,""]]},"backend/src/deals/deals.controller.ts":{"before":"9bd4038f0e6c93ecc9ffe5b0c7392d34fca4c0cc3177f93b9cb992768d7a89bf","after":"49dc3131bf7eda09859883a8631a92ca0dc4f6320f01f0d96d088eee9254d071","ops":[[1011,1066,""],[1920,1975,""]]},"backend/src/deals/deals.service.ts":{"before":"3e064d33a4e826e3caa79cb73e68ae7e7a70f603a6071c3320e9a7fb9cdf1828","after":"81c7a72e02655020d30d2116deb81a9ae2493637070e8867b803750f16a5c6c4","ops":[[3830,3958,""],[10819,10999,""],[11694,11749,""],[13184,13462,""],[13742,13852,""],[15805,15923,""],[17703,17758,""],[20236,20490,""],[21158,21286,""]]},"frontend/src/InvoiceRequestTaskPanel.tsx":{"before":"26d681f09b774c9ac9485a203f82890e395a7d3d7d34fe1a66bd33d2f5cdaef6","after":"310adf74b25b24f2ab0ef41d98615da2de06025f9e5dfade4c2ac45c22aa35ef","ops":[[671,716,""],[2314,2627,""],[2756,3112,""],[9967,10150,""],[10668,11046,""],[11486,11554,""],[18106,18861,""]]},"frontend/src/api.ts":{"before":"75b9c10350735c7df0757c4984a72d94ec3fa914b411a23063e80ffcefa29d24","after":"1cf428fc09b6607aa94800e01df740c729b6b87d09a6977a62c1e75a9715e2d5","ops":[[13076,13127,""],[13841,13892,""]]},"frontend/src/types.ts":{"before":"613725176da5bd02f5fb8f67a0352ffa581b6f911a05b4b23ff3bb7847d302ae","after":"c24fc67abd149742cb19f9d7491bfa160fa262489ec54e73d461c21acbd8de47","ops":[[2716,2772,""]]}};
const migrationRel = "backend/prisma/migrations/20261016180000_remove_invoice_calc_condition/migration.sql";
const migrationSQL = "-- MSM step37: obsolete invoice request calculation condition.\n-- Payment status, deferral terms and supplier purchase payments are unchanged.\nALTER TABLE \"Deal\"\n  DROP COLUMN IF EXISTS \"marginMode\",\n  DROP COLUMN IF EXISTS \"marginValue\";\n";
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const keyRegexp = /marginMode|marginValue|numericMargin|nextMarginMode|nextMarginValue|Условие расчёта|Значение условия/;
const run = (cmd, args, cwd = root) => {
  console.log('> ' + [cmd, ...args].join(' '));
  const result = spawnSync(cmd, args, { cwd, shell:process.platform==='win32', stdio:'inherit' });
  if (result.error) throw new Error(result.error.message);
  if (result.status !== 0) throw new Error([cmd,...args].join(' ') + ' failed with ' + result.status);
};
const replaceBuffer = (raw, ops) => {
  const chunks = [];
  let index = 0;
  for (const [start,end,insert] of ops) {
    if (start < index || end < start || end > raw.length) throw new Error('Invalid patch offsets');
    chunks.push(raw.subarray(index,start), Buffer.from(insert,'base64'));
    index=end;
  }
  chunks.push(raw.subarray(index));
  return Buffer.concat(chunks);
};
const findResiduals = () => {
  const found = [];
  const search = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir, {withFileTypes:true})) {
      if (['node_modules','dist','.git'].includes(item.name)) continue;
      const full = path.join(dir, item.name);
      if (item.isDirectory()) search(full);
      else if (item.isFile() && /\.(ts|tsx|prisma)$/.test(item.name) && keyRegexp.test(fs.readFileSync(full,'utf8')))
        found.push(path.relative(root,full));
    }
  };
  search(path.join(root,'backend','src'));
  search(path.join(root,'frontend','src'));
  if (keyRegexp.test(fs.readFileSync(path.join(root,'backend/prisma/schema.prisma'),'utf8')))
    found.push('backend/prisma/schema.prisma');
  return found;
};
function main() {
  console.log('[MSM step37] Убираем «Условие расчёта» и «Значение условия». PostgreSQL не изменяется.');
  const originals=new Map(), changed=new Map(), issues=[];
  let already=0;
  for (const [rel, spec] of Object.entries(patches)) {
    const dst=path.join(root,rel);
    if (!fs.existsSync(dst)) { issues.push('Нет файла: '+rel);continue; }
    const raw=fs.readFileSync(dst), hash=sha256(raw);
    if (hash===spec.after) {already++;continue;}
    if (hash!==spec.before) {issues.push('Изменён после этапа 36: '+rel);continue;}
    const result=replaceBuffer(raw,spec.ops);
    if (sha256(result)!==spec.after) throw new Error('Patch verification failed: '+rel);
    originals.set(rel,raw);changed.set(rel,result);
  }
  const migrationPath=path.join(root,migrationRel);
  const sqlExists=fs.existsSync(migrationPath);
  if (sqlExists && fs.readFileSync(migrationPath,'utf8')!==migrationSQL) {
    issues.push('Иная миграция уже существует по пути '+migrationRel);
  }
  if (issues.length) {
    console.error('STOP: файлы не совпадают с проверенной версией. Изменения не вносились:');
    issues.forEach(i=>console.error(' - '+i));
    console.error('Пришлите актуальный архив исходников для безопасного исправления.');
    process.exitCode=2;return;
  }
  if (already>0 && already<Object.keys(patches).length) {
    console.error('STOP: этап 37 установлен частично. Ничего не изменено.');
    process.exitCode=2;return;
  }
  if (already===Object.keys(patches).length) {
    if (!sqlExists) {console.error('STOP: изменения исходников есть, миграция отсутствует.');process.exitCode=2;return;}
    const leftovers=findResiduals();
    if (leftovers.length) {console.error('STOP: остались зависимости:',leftovers);process.exitCode=2;return;}
    console.log('Уже установлено: исходники и SQL-миграция этапа 37 на месте.');return;
  }
  const leftoversBefore=findResiduals();
  const unexpected=leftoversBefore.filter(f=>!changed.has(f.replace(/\\/g,'/')));
  if (unexpected.length) {
    console.error('STOP: незапланированные зависимости:',unexpected);
    process.exitCode=2;return;
  }
  const schema=changed.get('backend/prisma/schema.prisma').toString('utf8');
  if (!schema.includes('workflowMode') || !schema.includes('SupplierRealization')) {
    console.error('STOP: изменения этапа 35 не найдены.');process.exitCode=2;return;
  }
  for (const [rel,raw] of changed) if (keyRegexp.test(raw.toString('utf8'))) {
    throw new Error('Unremoved field: '+rel);
  }
  const backup=path.join(root,'MSM_step37_backup_'+new Date().toISOString().replace(/[:.]/g,'-'));
  fs.mkdirSync(backup,{recursive:true});
  for (const [rel,raw] of originals) {
    const dest=path.join(backup,rel);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest,raw);
  }
  console.log('Резервные копии:',backup);
  let started=false, createdMigration=false;
  try {
    started=true;
    for (const [rel,raw] of changed) fs.writeFileSync(path.join(root,rel),raw);
    if (!sqlExists) {
      fs.mkdirSync(path.dirname(migrationPath),{recursive:true});
      fs.writeFileSync(migrationPath,migrationSQL,'utf8');
      createdMigration=true;
    }
    const remaining=findResiduals();
    if (remaining.length) throw new Error('Остались зависимости: '+remaining.join(', '));
    run('npx',['prisma','validate'],path.join(root,'backend'));
    run('npx',['prisma','generate'],path.join(root,'backend'));
    run('npm',['run','build'],path.join(root,'backend'));
    run('npm',['run','build'],path.join(root,'frontend'));
    run('git',['diff','--check','--',...Object.keys(patches)]);
    console.log('SUCCESS: этап 37 установлен, Prisma и обе сборки прошли.');
    console.log('Миграция создана: '+migrationRel);
    console.log('ВНИМАНИЕ: к PostgreSQL миграция НЕ применялась.');
  } catch(e) {
    console.error('ERROR:',e.message);
    if (started) {
      let ok=true;
      for (const [rel,raw] of originals) try {fs.writeFileSync(path.join(root,rel),raw);}
        catch(x) {ok=false;console.error('Не восстановлено '+rel+': '+x.message);}
      if (createdMigration) {
        try {
          fs.unlinkSync(migrationPath);
          fs.rmdirSync(path.dirname(migrationPath));
        } catch(x){ok=false;console.error('Не удалена миграция: '+x.message);}
      }
      console.error(ok?'ROLLBACK: файлы восстановлены.':'ROLLBACK частичный; используйте резервную папку.');
      try {run('npx',['prisma','generate'],path.join(root,'backend'));}
      catch(x){console.error('Prisma Client не восстановился (возможно, EPERM): '+x.message);}
    }
    process.exitCode=1;
  }
}
main();
