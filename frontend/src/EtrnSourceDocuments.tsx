/* PART_V064_N2_ETRN_SOURCE_DOCUMENTS */
import type { Task } from './api';
import { TaskDocuments } from './TaskDocuments';
/* MSM_STEP27_POA_ETRN_SHARED_DOCUMENTS */
/* MSM_STEP30_ETRN_UNIFIED_LAYOUT */

/** A single document list. Specific file IDs always come from this ETRN task. */
export function EtrnSourceDocuments({ task }: { task: Task }) {
  if (task.type !== 'ETRN') return null;
  const files = task.deal.files || [];
  const payload = task.payload || {};
  const poaId = String(payload.poaFileId || '');
  const invoiceId = String(payload.invoiceFileId || '');
  const poaFile = files.find(file => poaId && file.id === poaId);
  const invoiceFile = files.find(file => invoiceId && file.id === invoiceId);
  const extraFiles = files.filter(file => file.category === 'TASK_ATTACHMENT_' + task.id);

  return (
    <div className="etrnTaskDocs">
      {(!poaFile || !invoiceFile) && (
        <div className="infoBox" role="status">
          <strong>Проверьте документы для ЭТрН</strong>
          {!poaFile && <p>Доверенность: файл не найден</p>}
          {!invoiceFile && <p>Актуальный счёт: файл не найден</p>}
        </div>
      )}
      <TaskDocuments
        title="Документы ЭТрН"
        subtitle="Доверенность, счёт и дополнительные вложения"
        current={[
          ...(poaFile ? [{ file: poaFile, description: 'Доверенность' }] : []),
          ...(invoiceFile ? [{ file: invoiceFile, description: 'Актуальный счёт' }] : []),
          ...extraFiles.map(file => ({ file, description: 'Приложено при исправлении' })),
        ]}
      />
    </div>
  );
}
/* END_PART_V064_N2_ETRN_SOURCE_DOCUMENTS */
