import { useEffect, useMemo, useState } from 'react';
import { dealFileUrl } from './api';
import type { CurrentUser, Deal } from './types';
import './FilesLibrary.css';

type FileLink = {
  id: string;
  createdAt: string;
  deal?: { id: string; internalNumber: number; clientName: string } | null;
  task?: { id: string; title: string } | null;
};
type LibraryFile = {
  id: string;
  originalName: string;
  mimeType?: string | null;
  size?: number | null;
  category: string;
  createdAt: string;
  provider: string;
  poolSource?: string;
  uploadedById?: string | null;
  deal?: { id: string; internalNumber: number; clientName: string } | null;
  libraryLinks?: FileLink[];
};
const API = import.meta.env.VITE_API_URL || '/api';

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, init);
  if (!response.ok) {
    throw new Error((await response.text()).slice(0, 300) || `Ошибка ${response.status}`);
  }
  return response.json() as Promise<T>;
}
const formatDate = (date: string) => new Date(date).toLocaleString('ru-RU');
const sizeLabel = (n?: number | null) => n == null ? '—' : n < 1024 * 1024 ? `${Math.ceil(n / 1024)} КБ` : `${(n / 1048576).toFixed(2)} МБ`;
const fileCategory = (s: string) => ({ MANAGER_ATTACHMENT: 'Вложение менеджера', LIBRARY: 'Файл', CLIENT_INVOICE: 'Счёт', PAYMENT_ORDER: 'Платёжка', POWER_OF_ATTORNEY: 'Доверенность' } as Record<string, string>)[s] || s;

export function FilesLibrary({ user, deals }: { user: CurrentUser; deals: Deal[] }) {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState(() => localStorage.getItem('msm.library.view') === 'detail');
  const [selected, setSelected] = useState<string | null>(null);
  const [dealId, setDealId] = useState(() => {
    try { return JSON.parse(localStorage.getItem('msm.library.prefill') || '{}').dealId || ''; }
    catch { return ''; }
  });
  const [taskId, setTaskId] = useState(() => {
    try { return JSON.parse(localStorage.getItem('msm.library.prefill') || '{}').taskId || ''; }
    catch { return ''; }
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const tasks = useMemo(() => deals.find((d) => d.id === dealId)?.tasks || [], [deals, dealId]);
  async function reload() {
    const results = await apiJson<LibraryFile[]>('/file-library');
    setFiles(results);
  }
  useEffect(() => { localStorage.removeItem('msm.library.prefill'); void reload().catch(e => setMessage(String(e))); }, []);
  const visible = files.filter(f => `${f.originalName} ${f.category} ${f.deal?.clientName || ''}`.toLowerCase().includes(query.toLowerCase()));
  async function uploadFiles(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    setMessage('Загружаем документы…');
    try {
      let reused = 0;
      for (const file of Array.from(list)) {
        const body = new FormData();
        body.append('file', file);
        body.append('actorId', user.id);
        if (dealId) body.append('dealId', dealId);
        if (taskId) body.append('taskId', taskId);
        const result = await apiJson<{ reused: boolean }>('/file-library/upload', { method: 'POST', body });
        if (result.reused) reused += 1;
      }
      await reload();
      setMessage(`Обработано ${list.length} файлов. Уже существовали: ${reused}.`);
    } catch (error) {
      setMessage(`Ошибка загрузки: ${error instanceof Error ? error.message : String(error)}`);
    } finally { setBusy(false); }
  }
  async function link() {
    if (!selected || !dealId) return;
    setBusy(true); setMessage('');
    try {
      const result = await apiJson<{ reused: boolean }>(`/file-library/${selected}/link`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, taskId: taskId || undefined, actorId: user.id }),
      });
      await reload();
      setMessage(result.reused ? 'Документ уже привязан. Копия не создана.' : 'Документ привязан без повторной загрузки.');
    } catch (error) { setMessage(String(error)); }
    finally { setBusy(false); }
  }
  return (
    <section className="msmLibrary">
      <div className="msmLibraryToolbar">
        <input aria-label="Поиск файлов" value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск файла, номера или контрагента…" />
        <div className="msmLibraryToggle">
          <button type="button" className={!detail ? 'active' : ''} onClick={() => { setDetail(false); localStorage.setItem('msm.library.view', 'brief'); }}>Кратко</button>
          <button type="button" className={detail ? 'active' : ''} onClick={() => { setDetail(true); localStorage.setItem('msm.library.view', 'detail'); }}>Подробно</button>
        </div>
      </div>
      <section className="msmLibraryControls">
        <h3>Добавление и привязка документов</h3>
        <div className="msmLibraryFields">
          <label>Сделка
            <select value={dealId} onChange={e => { setDealId(e.target.value); setTaskId(''); }}>
              <option value="">Без привязки</option>
              {deals.map(d => <option key={d.id} value={d.id}>№ {d.internalNumber} · {d.clientName}</option>)}
            </select>
          </label>
          <label>Задача
            <select disabled={!dealId} value={taskId} onChange={e => setTaskId(e.target.value)}>
              <option value="">Без задачи</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </label>
        </div>
        <div className="msmLibraryActions">
          <label className="msmLibraryUpload">+ Загрузить с телефона или ПК
            <input hidden type="file" multiple disabled={busy} onChange={e => { void uploadFiles(e.target.files); e.currentTarget.value = ''; }} />
          </label>
          <button type="button" disabled={!selected || !dealId || busy} onClick={() => void link()}>Привязать выбранный из пула</button>
        </div>
        {message && <p role="status" className="msmLibraryMessage">{message}</p>}
      </section>
      <p className="msmLibraryCount">Файлов в пуле: {files.length} · Найдено: {visible.length}. Выберите документ и сделку, чтобы связать их без копирования.</p>
      <div className="msmLibraryList">
        {visible.map(file => (
          <article className={'msmLibraryCard' + (file.id === selected ? ' isSelected' : '')} key={file.id}>
            <div className="msmLibraryCardHead">
              <input aria-label={`Выбрать ${file.originalName}`} type="radio" name="selectedPoolFile" checked={selected === file.id} onChange={() => setSelected(file.id)} />
              <div className="msmLibraryInfo">
                <strong>{file.originalName}</strong>
                <small>{fileCategory(file.category)} · {sizeLabel(file.size)} · {formatDate(file.createdAt)}</small>
              </div>
              <a href={dealFileUrl(file.id)} target="_blank" rel="noreferrer">Открыть ↗</a>
            </div>
            {detail && <div className="msmLibraryDetails">
              <div><b>Источник:</b> {file.poolSource === 'DEVICE' ? 'Телефон / ПК' : file.provider === 'TELEGRAM' ? 'Telegram / архив' : 'Приложение'}</div>
              <div><b>Отправитель:</b> {file.uploadedById || 'Для старого файла неизвестен'}</div>
              <div><b>MIME:</b> {file.mimeType || '—'}</div>
              <div><b>Исходная сделка:</b> {file.deal ? `№ ${file.deal.internalNumber} · ${file.deal.clientName}` : 'Не привязан'}</div>
              <div><b>Связи:</b> {file.libraryLinks?.length || 0}</div>
              {file.libraryLinks?.map(link => <div key={link.id} className="msmLibraryLink">↳ {link.deal ? `Сделка № ${link.deal.internalNumber}` : ''}{link.task ? ` · ${link.task.title}` : ''} · {formatDate(link.createdAt)}</div>)}
            </div>}
          </article>
        ))}
        {visible.length === 0 && <p>Файлы не найдены.</p>}
      </div>
    </section>
  );
}

/** Shown in a standard task card. Existing task uploads remain unchanged. */
export function TaskPoolAttachments({ taskId, dealId }: { taskId: string; dealId: string }) {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  useEffect(() => {
    let active = true;
    const update = () => {
      void apiJson<LibraryFile[]>(`/file-library/task/${encodeURIComponent(taskId)}`)
        .then(value => { if (active) setFiles(value); })
        .catch(() => {});
    };
    update();
    const interval = window.setInterval(update, 12000);
    return () => { active = false; window.clearInterval(interval); };
  }, [taskId]);
  return <section className="msmLibraryTaskSection">
    <div className="msmLibraryTaskHeader"><strong>Файлы из общего пула ({files.length})</strong>
      <button type="button" onClick={() => {
        localStorage.setItem('msm.library.prefill', JSON.stringify({ dealId, taskId }));
        window.location.hash = '#files';
      }}>+ Выбрать / загрузить</button>
    </div>
    {files.map(file => <a key={file.id} href={dealFileUrl(file.id)} target="_blank" rel="noreferrer">▤ {file.originalName}</a>)}
  </section>;
}
