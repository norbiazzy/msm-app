/* MSM_STEP25_SHARED_TASK_DOCUMENTS */
import type { StoredFile } from './types';
import { dealFileUrl } from './api';

export type TaskDocument = {
  file: StoredFile;
  description: string;
};

type TaskDocumentsProps = {
  title: string;
  subtitle?: string;
  current?: TaskDocument[];
  history?: TaskDocument[];
  emptyLabel?: string;
};

/** Shared, display-only list. Never uploads, deletes, or changes document categories. */
export function TaskDocuments({
  title,
  subtitle,
  current = [],
  history = [],
  emptyLabel = 'Документы не прикреплены',
}: TaskDocumentsProps) {
  // One file ID can appear in several business categories. Show it once,
  // prioritizing the current list, without hiding older distinct file IDs.
  const seen = new Set<string>();
  const unique = (items: TaskDocument[]) => items.filter(({ file }) => {
    if (!file?.id || seen.has(file.id)) return false;
    seen.add(file.id);
    return true;
  });
  const currentDocs = unique(current);
  const historyDocs = unique(history);
  const total = currentDocs.length + historyDocs.length;

  const row = ({ file, description }: TaskDocument, mode: 'current' | 'history') => (
    <a
      key={file.id}
      className={'taskDocsRow taskDocsRow--' + mode}
      href={dealFileUrl(file.id)}
      target="_blank"
      rel="noreferrer"
      title={file.originalName}
    >
      <span className="taskDocsFileIcon" aria-hidden="true">▤</span>
      <span className="taskDocsFileInfo">
        <strong>{file.originalName}</strong>
        <span>{description}</span>
      </span>
      <span className="taskDocsOpen" aria-hidden="true">Открыть ↗</span>
    </a>
  );

  return (
    <section className="taskDocsShared" aria-label={title}>
      <div className="taskDocsHeader">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <span className="taskDocsCount">Файлов: {total}</span>
      </div>

      {total === 0 && <p className="taskDocsEmpty">{emptyLabel}</p>}

      {currentDocs.length > 0 && (
        <div className="taskDocsSection">
          <div className="taskDocsSectionHeading">
            <strong>Актуальные документы</strong>
            <span>{currentDocs.length}</span>
          </div>
          <div className="taskDocsGrid">
            {currentDocs.map((doc) => row(doc, 'current'))}
          </div>
        </div>
      )}

      {historyDocs.length > 0 && (
        <details className="taskDocsHistory">
          <summary>
            <span>История документов</span>
            <span>{historyDocs.length} ранее приложено</span>
          </summary>
          <div className="taskDocsGrid">
            {historyDocs.map((doc) => row(doc, 'history'))}
          </div>
        </details>
      )}
    </section>
  );
}
/* END_MSM_STEP25_SHARED_TASK_DOCUMENTS */
