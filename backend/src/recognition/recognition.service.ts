/* MSM_FIXES_V10 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma, RecognitionStatus } from '@prisma/client';
import { spawn } from 'child_process';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, extname } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';

type RecognitionKind = 'invoice' | 'poa' | 'payment';

@Injectable()
export class RecognitionService implements OnModuleInit {
  private readonly logger = new Logger(RecognitionService.name);
  private readonly running = new Set<string>();
  constructor(private readonly prisma: PrismaService, private readonly files: FilesService) {}

  onModuleInit() {
    // Uploads interrupted by a server restart are retried automatically.
    void this.prisma.documentRecognition.findMany({
      where: { status: { in: ['PENDING', 'PROCESSING'] } },
      select: { fileId: true }, take: 100,
    }).then((pending) => {
      for (const row of pending) this.schedule(row.fileId, true);
    }).catch((e) => this.logger.warn('Could not resume recognition: ' + String(e)));
  }

  static detect(category: string, filename: string): RecognitionKind | null {
    const c = (category || '').toUpperCase();
    const n = (filename || '').toLowerCase();
    if (c.startsWith('POWER_OF_ATTORNEY_RESULT_') || /доверенност|doverennost/.test(n)) return 'poa';
    if (c.startsWith('SUPPLIER_PAYMENT_') || c.startsWith('SUPPLIER_PAYMENT_STAMPED_') || /плат[её]жн|payment.order/i.test(n)) return 'payment';
    if (c === 'CLIENT_INVOICE_ATTACHMENT' || c === 'CUSTOMER_INVOICE_PRIMARY' || c.startsWith('CORRECTION_PRIMARY_') || c === 'INCOMING_SUPPLIER_INVOICE' || /сч[её]т.+оплат|invoice|^уо-/.test(n)) return 'invoice';
    return null;
  }

  async registerUpload(fileId: string, category: string, filename: string) {
    const kind = RecognitionService.detect(category, filename);
    if (!kind) return;
    await this.prisma.documentRecognition.upsert({
      where: { fileId },
      create: { fileId, kind, status: RecognitionStatus.PENDING, engineVersion: 'msm-recognition-1.0' },
      update: {},
    });
    this.schedule(fileId);
  }

  // Fire-and-forget after the file was already saved. The task is never blocked.
  schedule(fileId: string, force = false) {
    if (this.running.has(fileId)) return;
    this.running.add(fileId);
    void this.process(fileId, force).catch((err) => this.logger.warn(
      `Document recognition ${fileId} failed: ${String(err)}`
    )).finally(() => this.running.delete(fileId));
  }

  async retry(fileId: string) {
    const stored = await this.prisma.documentRecognition.findUnique({ where: { fileId } });
    if (!stored) throw new Error('Для этого файла распознавание не зарегистрировано');
    if (this.running.has(fileId)) return {status:'PROCESSING'};
    await this.prisma.documentRecognition.update({where:{fileId},data:{status:RecognitionStatus.PENDING,errorText:null}});
    this.schedule(fileId, true);
    return {status:'PENDING'};
  }

  async get(fileId: string) {
    return this.prisma.documentRecognition.findUnique({
      where: { fileId },
      select: { kind: true, status: true, engineVersion: true, result: true,
        errorText: true, updatedAt: true },
    });
  }

  private async process(fileId: string, force = false) {
    const record = await this.prisma.documentRecognition.findUnique({ where: { fileId } });
    if (!record || (record.status === RecognitionStatus.DONE && !force)) return;
    await this.prisma.documentRecognition.update({
      where: { fileId }, data: { status: RecognitionStatus.PROCESSING, errorText: null },
    });
    let dir: string | undefined;
    try {
      const stored = await this.prisma.storedFile.findUniqueOrThrow({ where: { id: fileId } });
      const document = await this.files.download(fileId);
      dir = await mkdtemp(join(tmpdir(), 'msm-recog-'));
      const ext = extname(stored.originalName).toLowerCase();
      const input = join(dir, 'document' + (ext || '.pdf'));
      await writeFile(input, document.buffer, { mode: 0o600 });
      // The backend is run from its project directory (as in the existing MSM dev setup).
      const script = join(process.cwd(), 'src', 'recognition', 'document_worker.py');
      const python = process.env.MSM_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
      const data = await this.execute(python, script, record.kind as RecognitionKind, input);
      await this.prisma.documentRecognition.update({
        where: { fileId }, data: { status: RecognitionStatus.DONE, result: data as Prisma.InputJsonValue,
          errorText: null },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.prisma.documentRecognition.update({
        where: { fileId }, data: { status: RecognitionStatus.FAILED, errorText: msg.slice(0, 1000) },
      }).catch(() => undefined);
    } finally {
      if (dir) await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private execute(python: string, script: string, kind: RecognitionKind, input: string) {
    return new Promise<unknown>((resolve, reject) => {
      const child = spawn(python, [script, '--kind', kind, '--input', input], {
        cwd: process.cwd(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
      });
      let out = ''; let err = '';
      const timer = setTimeout(() => { child.kill(); reject(new Error('Время распознавания документа истекло (120 секунд)')); }, 120000);
      child.stdout.on('data', (buf: Buffer) => { out += buf.toString('utf8'); if (out.length > 3_000_000) child.kill(); });
      child.stderr.on('data', (buf: Buffer) => { if (err.length < 1000) err += buf.toString('utf8'); });
      child.on('error', (e) => { clearTimeout(timer); reject(e); });
      child.on('close', (code) => {
        clearTimeout(timer);
        try {
          // PDF libraries sometimes print a "warning: ..." line to stdout before JSON.
          // Recognize ONLY a complete JSON line with our protocol, never execute or trust other text.
          const candidates = out.trim().split(/\r?\n/).reverse();
          let res: { ok: boolean; error?: string; data?: unknown } | null = null;
          for (const line of candidates) {
            if (!line.trim().startsWith('{')) continue;
            try {
              const decoded = JSON.parse(line) as { ok?: unknown; error?: string; data?: unknown };
              if (typeof decoded.ok === 'boolean') {
                res = { ok: decoded.ok, error: decoded.error, data: decoded.data };
                break;
              }
            } catch { /* diagnostics are not JSON */ }
          }
          if (!res) throw new Error('Python не возвратил корректный результат JSON');
          if (code === 0 && res.ok) resolve(res.data);
          else reject(new Error(res.error || err || 'Ошибка распознавания'));
        } catch (e) { reject(new Error('Worker failed: ' + (err || String(e)))); }
      });
    });
  }
}
