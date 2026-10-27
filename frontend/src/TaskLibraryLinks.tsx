import { useEffect, useState } from 'react';
import { dealFileUrl } from './api';
import { RecognitionAudit } from './RecognitionAudit';

type LinkedFile = { id: string; originalName: string; category?: string };
const API = import.meta.env.VITE_API_URL || '/api';

/** Read FilePoolLink references: a library file is not duplicated or relabelled. */
export function TaskLibraryLinks({
  taskIds,
  emptyText,
  showRecognition = false,
  expectedNumber,
  expectedRecipient,
}: {
  taskIds: string[];
  emptyText?: string;
  showRecognition?: boolean;
  expectedNumber?: string | null;
  expectedRecipient?: string | null;
}) {
  const idKey = [...new Set(taskIds.filter(Boolean))].sort().join('|');
  const [files, setFiles] = useState<LinkedFile[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const ids = idKey ? idKey.split('|') : [];
    setLoaded(false);
    setFiles([]);
    setError(false);
    if (!ids.length) {
      setLoaded(true);
      return () => { active = false; };
    }
    const update = async () => {
      try {
        const batches = await Promise.all(ids.map(async id => {
          const response = await fetch(`${API}/file-library/task/${encodeURIComponent(id)}`);
          if (!response.ok) throw new Error('Не удалось прочитать связи библиотеки');
          const data: unknown = await response.json();
          return Array.isArray(data) ? data as LinkedFile[] : [];
        }));
        if (!active) return;
        const unique = new Map<string, LinkedFile>();
        batches.flat().forEach(file => { if (file?.id) unique.set(file.id, file); });
        setFiles([...unique.values()]);
        setError(false);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoaded(true);
      }
    };
    void update();
    const intervalId = window.setInterval(() => { void update(); }, 15000);
    return () => { active = false; window.clearInterval(intervalId); };
  }, [idKey]);

  if (!loaded) return <small className="msmLinkedTaskHint">Проверяем документы из библиотеки…</small>;
  if (error) return <small className="msmLinkedTaskWarning">Не удалось проверить документы из библиотеки</small>;
  if (!files.length) return emptyText ? <span className="purchasePaymentFileMissing">{emptyText}</span> : null;
  return <div className="msmLinkedTaskFiles" aria-label="Документы из библиотеки">
    {files.map(file => <div className="msmLinkedTaskFile" key={file.id}>
      <a href={dealFileUrl(file.id)} target="_blank" rel="noreferrer">
        {file.originalName} · из библиотеки
      </a>
      {showRecognition && <RecognitionAudit fileId={file.id} expectedNumber={expectedNumber} expectedRecipient={expectedRecipient} />}
    </div>)}
  </div>;
}
