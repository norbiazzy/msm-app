#!/usr/bin/env node
/*
 * MSM step36: убрать "Формат запроса" / requestMode.
 * Подготовлено по присланному пользователем архиву исходных файлов.
 * Не удаляет базу данных и не запускает миграции.
 * Патчи применяются только при точном совпадении исходных файлов SHA-256.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const root = __dirname;
const patches = {"backend/prisma/schema.prisma":{"before":"ee0c946ebe00af4b38bf8a5f8c349b6772f5edd3a922ca2ca282898ab3a5838e","after":"27a0c6c3b99ff2a78b016700662ec47f6c243a5cda8ae6cf41660bc74051979d","ops":[[2209,2236,""]]},"backend/src/deals/dto.ts":{"before":"060cf3420d422b78834cf72629b210dbf179652614ec8b6a00da2cd73ce76346","after":"8bccd849d494e987a9a76164f27d205de48fff3c413a0d1eae8ec0c00c131b5d","ops":[[510,573,""]]},"backend/src/deals/deals.controller.ts":{"before":"416d410bbaf30a18ff07691e4b5f865e2b320a28399efa9dced3054775a714cf","after":"9bd4038f0e6c93ecc9ffe5b0c7392d34fca4c0cc3177f93b9cb992768d7a89bf","ops":[[1713,1741,""]]},"backend/src/deals/deals.service.ts":{"before":"1e81a69a24923faf085aa03ce32e82219f7c37bead550a38cd262812d2fdcce2","after":"3e064d33a4e826e3caa79cb73e68ae7e7a70f603a6071c3320e9a7fb9cdf1828","ops":[[3765,3830,""],[10552,10606,""],[17615,17643,""],[19798,19963,""],[21015,21080,""]]},"frontend/src/types.ts":{"before":"3a993e98d7e345cf82940317cf2aa1105b4d44afed82e0ca17abf3d5237569ff","after":"613725176da5bd02f5fb8f67a0352ffa581b6f911a05b4b23ff3bb7847d302ae","ops":[[2692,2716,""]]},"frontend/src/api.ts":{"before":"2d8562d71035f002f3e57c4e34e97131c0ef3bfb77115306b6799394b9fb8b66","after":"75b9c10350735c7df0757c4984a72d94ec3fa914b411a23063e80ffcefa29d24","ops":[[12874,12900,""]]},"frontend/src/features/deals/NewDealForm.tsx":{"before":"7f023c44c24a48a4cdbaf1ad443d2c0936ac66317c6c328be90cabf41730b9dc","after":"8db504ea3ff59951d75a292444d43ebc43caf21ad15c9dd02a2e35580ccf4877","ops":[[3733,3856,""]]},"frontend/src/InvoiceRequestTaskPanel.tsx":{"before":"454141e8d5f5341378619ac3f4c2d2c2137fd097ed1aae4a67f6bebdeee97a7f","after":"26d681f09b774c9ac9485a203f82890e395a7d3d7d34fe1a66bd33d2f5cdaef6","ops":[[523,546,""],[1160,1248,"ICBjb25zdCBkZWFsID0gdGFzay5kZWFsOwo="],[1641,1762,""],[2962,3144,""],[9748,9841,""],[11749,11814,""],[17087,17503,""]]}};
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const patchBuffer = (raw, ops) => {
  const parts = [];
  let pos = 0;
  for (const [start, end, b64] of ops) {
    if (start < pos || end < start || end > raw.length) throw new Error('Повреждены границы патча');
    parts.push(raw.subarray(pos, start), Buffer.from(b64, 'base64'));
    pos = end;
  }
  parts.push(raw.subarray(pos));
  return Buffer.concat(parts);
};
const files = Object.keys(patches);
const run = (cmd, args, cwd = root) => {
  const label = [cmd,...args].join(' ');
  process.stdout.write('> ' + label + '\n');
  const result = spawnSync(cmd, args, {cwd, stdio:'inherit', shell:process.platform==='win32'});
  if (result.error) throw new Error(label + ': ' + result.error.message);
  if (result.status !== 0) throw new Error(label + ' завершился с кодом ' + result.status);
};
const findReferences = (dir, found) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findReferences(full, found);
    else if (entry.isFile() && /\.(ts|tsx|prisma)$/.test(entry.name)) {
      const s = fs.readFileSync(full, 'utf8');
      if (/requestMode|Формат запроса/.test(s)) found.push(path.relative(root, full));
    }
  }
};
function main() {
  console.log('[MSM step36] Убираем поле «Формат запроса» из исходного кода. Базу не меняем.');
  const originals = new Map();
  const updates = new Map();
  const mismatches = [];
  let alreadyApplied = 0;
  for (const [rel, spec] of Object.entries(patches)) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) {mismatches.push(rel + ' (нет файла)');continue;}
    const raw = fs.readFileSync(file);
    const hash = sha256(raw);
    if (hash === spec.after) {alreadyApplied++;continue;}
    if (hash !== spec.before) {mismatches.push(rel + ' (файл отличается от архива)');continue;}
    const out = patchBuffer(raw, spec.ops);
    if (sha256(out) !== spec.after) throw new Error('Неверная контрольная сумма патча: ' + rel);
    originals.set(rel, raw);
    updates.set(rel, out);
  }
  if (mismatches.length) {
    console.error('STOP: файлы изменились после создания архива, ни один файл не перезаписан:');
    for (const x of mismatches) console.error(' - ' + x);
    console.error('Нужен новый архив актуальных исходников. Не запускайте миграции.');
    process.exitCode = 2;return;
  }
  if (alreadyApplied > 0 && alreadyApplied < files.length) {
    console.error('STOP: частично установленное обновление. Никаких изменений не внесено.');
    process.exitCode = 2;return;
  }
  if (alreadyApplied === files.length) {
    console.log('Уже установлено: все 8 файлов соответствуют этапу 36.');return;
  }
  const allRefs = [];
  findReferences(path.join(root,'backend','src'),allRefs);
  findReferences(path.join(root,'frontend','src'),allRefs);
  const unhandled = allRefs.filter(x => !updates.has(x.replace(/\\/g,'/')));
  if (unhandled.length) {
    console.error('STOP: дополнительные зависимости requestMode. Ничего не изменено:',unhandled);
    process.exitCode = 2;return;
  }
  const srcSchema = updates.get('backend/prisma/schema.prisma').toString('utf8');
  if (!srcSchema.includes('workflowMode') || !srcSchema.includes('SupplierRealization')) {
    console.error('STOP: схема Prisma не содержит этап 35. Ничего не изменено.');
    process.exitCode = 2;return;
  }
  for (const [rel, raw] of updates) if (/requestMode|Формат запроса/.test(raw.toString('utf8'))) {
    throw new Error('После правки поле осталось в ' + rel);
  }
  const backup = path.join(root, 'MSM_step36_backup_' + new Date().toISOString().replace(/[:.]/g,'-'));
  fs.mkdirSync(backup, {recursive:true});
  for (const [rel, raw] of originals) {
    const dest = path.join(backup, rel);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest, raw);
  }
  console.log('Резервные копии исходников:',backup);
  let modified = false;
  try {
    modified = true;
    for (const [rel, out] of updates) fs.writeFileSync(path.join(root,rel),out);
    run('npx',['prisma','validate'],path.join(root,'backend'));
    run('npx',['prisma','generate'],path.join(root,'backend'));
    run('npm',['run','build'],path.join(root,'backend'));
    run('npm',['run','build'],path.join(root,'frontend'));
    run('git',['diff','--check','--',...files]);
    const remaining=[];
    findReferences(path.join(root,'backend','src'), remaining);
    findReferences(path.join(root,'frontend','src'), remaining);
    if (/requestMode/.test(fs.readFileSync(path.join(root,'backend/prisma/schema.prisma'),'utf8'))) remaining.push('backend/prisma/schema.prisma');
    if (remaining.length) throw new Error('Обнаружены остаточные зависимости: '+remaining.join(', '));
    console.log('SUCCESS: поле «Формат запроса» удалено из исходного кода, обе сборки прошли.');
    console.log('ВАЖНО: база PostgreSQL ещё не изменена; столбец в БД удалим отдельно после проверки схемы.');
  } catch (e) {
    console.error('ERROR:', e.message);
    if (modified) {
      let rollbackOk = true;
      for (const [rel, raw] of originals) {
        try {fs.writeFileSync(path.join(root,rel),raw);}catch(err){rollbackOk=false;console.error('Не восстановлен '+rel+': '+err.message);}
      }
      console.error(rollbackOk ? 'ROLLBACK: исходные файлы восстановлены.' : 'ROLLBACK: не все файлы удалось восстановить; используйте резервную папку.');
      try {run('npx',['prisma','generate'],path.join(root,'backend'));}
      catch(err){console.error('Не удалось восстановить Prisma Client:',err.message);}
    }
    process.exitCode = 1;
  }
}
main();
