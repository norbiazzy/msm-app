import { createPortal } from 'react-dom';
import { dealFileUrl } from './api';
import { useEffect, useMemo, useState } from 'react';

export type LibrarySelection = { id: string; originalName: string };
type AvailableFile = LibrarySelection & { category?: string; createdAt?: string; deal?: {clientName?: string} | null };
const API = import.meta.env.VITE_API_URL || '/api';

/** Link the original from the shared pool; do not upload its bytes twice. */
export async function linkLibraryFile(fileId: string, dealId: string, taskId: string | undefined, actorId: string) {
  const response = await fetch(`${API}/file-library/${encodeURIComponent(fileId)}/link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dealId, taskId, actorId }),
  });
  if (!response.ok) throw new Error(`Не удалось связать файл библиотеки: ${await response.text()}`);
}

export function LibraryFileChooser({value, onSelect, allowedExtensions = ['pdf','xls','xlsx'], showSelection = true}: {
  value: LibrarySelection | null;
  onSelect: (value: LibrarySelection | null) => void;
  allowedExtensions?: string[];
  showSelection?: boolean;
}) {
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<AvailableFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!opened) return;
    let live = true;
    setBusy(true); setError('');
    void fetch(`${API}/file-library`)
      .then(async response => {
        if (!response.ok) throw new Error('Библиотека файлов ещё не подключена или сервер недоступен');
        return response.json() as Promise<AvailableFile[]>;
      })
      .then(files => { if (live) setItems(Array.isArray(files) ? files : []); })
      .catch(e => { if (live) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [opened]);
  const filtered = useMemo(() => items.filter(item =>
    allowedExtensions.some(ext => item.originalName.toLowerCase().endsWith('.' + ext.toLowerCase())) &&
    `${item.originalName} ${item.deal?.clientName || ''}`.toLowerCase().includes(query.toLowerCase()),
  ), [items, query, allowedExtensions]);
  return <>
    <div className="msmInvoiceLibraryControl">
      <button type="button" className="fileButton msmInvoiceLibraryButton" onClick={event => {event.preventDefault();event.stopPropagation();setOpened(true);}}>Библиотека</button>
      {showSelection && value && <div className="msmLibrarySelected">Выбран файл: <strong>{value.originalName}</strong>{' '}
        <a className="fileButton" href={dealFileUrl(value.id)} target="_blank" rel="noopener noreferrer">Открыть</a>{' '}<button type="button" className="secondary compactButton" onClick={event => {event.preventDefault();event.stopPropagation();onSelect(null);}}>Убрать</button></div>}
    </div>
    {opened && createPortal(<div className="msmLibModalBackdrop" role="presentation" onClick={e => {e.stopPropagation();if (e.target === e.currentTarget) {e.preventDefault();setOpened(false);}}}>
      <section className="msmLibModal" role="dialog" aria-modal="true" aria-label="Выбор файла из библиотеки">
        <div className="msmLibModalHead"><strong>Выбрать из библиотеки</strong>
          <button type="button" className="secondary compactButton" onClick={event => {event.preventDefault();event.stopPropagation();setOpened(false);}} aria-label="Закрыть">✕</button>
        </div>
        <input aria-label="Поиск в библиотеке" placeholder="Поиск по названию или контрагенту" value={query} onChange={e => setQuery(e.target.value)} autoFocus />
        {busy && <p>Загружаем файлы…</p>}
        {error && <p className="error" role="alert">{error}</p>}
        {!busy && !error && filtered.length === 0 && <p>Подходящие файлы не найдены.</p>}
        <div className="msmLibModalList">
          {filtered.map(item => <button type="button" key={item.id} onClick={event => { event.preventDefault();event.stopPropagation();onSelect({id:item.id,originalName:item.originalName}); setOpened(false); }}>
            <strong>{item.originalName}</strong><small>{item.deal?.clientName || 'Без сделки'}{item.createdAt ? ' · ' + new Date(item.createdAt).toLocaleDateString('ru-RU') : ''}</small>
          </button>)}
        </div>
        <small>Файл не копируется: при сохранении он связывается с нужной сделкой или задачей.</small>
      </section>
    </div>, document.body)}
  </>;
}
