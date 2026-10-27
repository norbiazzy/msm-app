'use strict';
// Explicit allowlist only. Move to a sibling recovery archive; no permanent deletion.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(process.argv[2] || 'D:\\job\\it\\msm-app');
if(!fs.existsSync(path.join(ROOT,'backend','prisma','schema.prisma')))throw new Error('Not an MSM project');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const archive=path.join(path.dirname(ROOT),'MSM_CLEANUP_ARCHIVE',stamp);
const allowExact=new Set([
  'BACKUP-v064-o2.txt','EtrnSourceDocuments.v064-n2.tsx','PoaEtrnPanel.v064-n2.tsx',
  'backup-before-rollback-status.txt','backup-before-rollback.patch','backup-before-v064-o2.cjs',
  'check-tasks.cjs','msm-current-full-snapshot.txt','msm-current-snapshot.txt','msm-git-status.txt',
  'msm-part1a-current.zip','MSM_request_mode_sources.zip','README_INSTALL.txt',
  'INSTALL_UPDATE.bat','apply-update.cjs'
]);
const matching = name => allowExact.has(name)
  || /^refactor-step\d+(?:-[\w-]+)?\.cjs$/i.test(name)
  || /^MSM_step\d+[^/]*\.(?:zip|cjs)$/i.test(name)
  || /^MSM_invoice_reader_test(?:_v\d+)?\.zip$/i.test(name);
const moved=[], skipped=[];
for(const entry of fs.readdirSync(ROOT,{withFileTypes:true})){
  const n=entry.name;
  if (entry.isFile() && matching(n)) {
    const from=path.join(ROOT,n);const to=path.join(archive,n);
    fs.mkdirSync(path.dirname(to),{recursive:true});
    fs.renameSync(from,to);moved.push(n);
  } else if(entry.isDirectory() && n==='patch') {
    // Remove old unpacked v1 patch ONLY when it bears its unique signature.
    const marker=path.join(ROOT,'patch','backend','prisma','migrations','20261018213000_file_pool','migration.sql');
    const known=new Set([
      'backend/prisma/migrations/20261018213000_file_pool/migration.sql',
      'backend/src/file-library/file-library.controller.ts',
      'backend/src/file-library/file-library.module.ts',
      'frontend/src/FilesLibrary.css','frontend/src/FilesLibrary.tsx'
    ]);
    const walk=(dir,prefix='')=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name]);
    const list=walk(path.join(ROOT,n));
    if(fs.existsSync(marker) && list.every(f=>known.has(f))){
      fs.mkdirSync(archive,{recursive:true});fs.renameSync(path.join(ROOT,n),path.join(archive,n));moved.push(n+'/');
    } else skipped.push('patch/ (unknown or additional contents)');
  }
}
// Build caches safe to recreate; keep a copy to avoid irreversible side effects.
for(const n of ['frontend/tsconfig.app.tsbuildinfo','frontend/tsconfig.node.tsbuildinfo']){
 const from=path.join(ROOT,...n.split('/'));
 if(fs.existsSync(from)){
   const to=path.join(archive,...n.split('/'));fs.mkdirSync(path.dirname(to),{recursive:true});
   fs.renameSync(from,to);moved.push(n);
 }
}
fs.mkdirSync(archive,{recursive:true});
const report=`MSM safe project cleanup\nSource: ${ROOT}\nDate: ${new Date().toISOString()}\n\nMoved: ${moved.length}\n${moved.join('\n')}\n\nNot touched: .git, env files, node_modules, database, uploads, src, migrations, unknown artifacts.\n\nReview manually: backend/migration-preview.sql, backend/step36-preview.sql, unusual root filenames.\nSkipped: ${skipped.join(', ')||'none'}\n`;
fs.writeFileSync(path.join(archive,'CLEANUP_REPORT.txt'),report,'utf8');
console.log('CLEANUP_OK. Moved '+moved.length+' known obsolete files.');
console.log('Recovery folder: '+archive);
console.log('Review the report before deleting the recovery folder.');
