import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createDeal, createInvoice, listDeals, listTasks, login, updateTaskStatus, uploadDealFile, type Task } from './api';
import type { CurrentUser, Deal, SellerType } from './types';

const sellerLabels: Record<SellerType, string> = {
  ST: 'СТ',
  MSM: 'МСМ',
  IP: 'ИП',
};

function App() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [view, setView] = useState<'home' | 'new' | 'tasks'>('home');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function reload(currentUser = user) {
    if (!currentUser) return;
    const data = await listDeals(currentUser.role === 'MANAGER' ? currentUser.id : undefined);
    setDeals(data);
  }

  useEffect(() => {
    (async () => {
      try {
        const currentUser = await login();
        setUser(currentUser);
        await reload(currentUser);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка запуска');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <ScreenMessage>Загрузка…</ScreenMessage>;
  if (error || !user) return <ScreenMessage>Не удалось запустить приложение: {error}</ScreenMessage>;

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">МСМ · Telegram Mini App</div>
          <h1>{view === 'new' ? 'Новый запрос на счёт' : 'Мои сделки'}</h1>
        </div>
        <div className="userBadge">{user.firstName}<span>{roleName(user.role)}</span></div>
      </header>

      {view === 'home' ? (
        <Home deals={deals} onNew={() => setView('new')} />
      ) : view === 'tasks' ? (
        <TasksView user={user} onChanged={() => reload()} />
      ) : (
        <NewDealForm
          user={user}
          onCancel={() => setView('home')}
          onCreated={async () => {
            await reload();
            setView('home');
          }}
        />
      )}

      <nav className="bottomNav">
        <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>Сделки</button>
        <button className={view === 'tasks' ? 'active' : ''} onClick={() => setView('tasks')}>Задачи</button>
        <button disabled>Месяц</button>
      </nav>
    </main>
  );
}

function Home({ deals, onNew }: { deals: Deal[]; onNew: () => void }) {
  const active = useMemo(() => deals.filter((d) => d.status !== 'CLOSED'), [deals]);
  return (
    <section className="content">
      <button className="primary wide" onClick={onNew}>+ Новый счёт</button>
      <div className="sectionHead"><h2>Активные сделки</h2><span>{active.length}</span></div>
      <div className="dealList">
        {active.length === 0 && <div className="empty">Пока нет активных сделок.</div>}
        {active.map((deal) => <DealCard key={deal.id} deal={deal} />)}
      </div>
    </section>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  const invoice = deal.invoices[0];
  const urgent = deal.tasks.some((t) => t.urgent);
  return (
    <article className="dealCard">
      <div className="dealTop">
        <div>
          <strong>{invoice ? `${sellerLabels[deal.sellerType]}-${invoice.number}` : `ЗК-${deal.internalNumber}`}</strong>
          <span>{deal.clientName}</span>
        </div>
        {urgent && <b className="urgent">СРОЧНО</b>}
      </div>
      <div className="dealMeta">
        <span>Отгрузка: {deal.plannedShipmentAt ? new Date(deal.plannedShipmentAt).toLocaleDateString('ru-RU') : 'не указана'}</span>
        <span>{invoice ? statusLabel(invoice.status) : 'Ожидаем счёт'}</span>
      </div>
      {deal.managerComment && <div className="note">📝 {deal.managerComment}</div>}
      {deal.tasks.length > 0 && <div className="tasksHint">Активных задач: {deal.tasks.length}</div>}
    </article>
  );
}

function NewDealForm({ user, onCancel, onCreated }: { user: CurrentUser; onCancel: () => void; onCreated: () => void }) {
  const [sellerType, setSellerType] = useState<SellerType>('MSM');
  const [requestMode, setRequestMode] = useState<'TEXT' | 'INCOMING_INVOICE'>('TEXT');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [requestText, setRequestText] = useState('');
  const [marginMode, setMarginMode] = useState('TOTAL_PLUS');
  const [marginValue, setMarginValue] = useState('');
  const [accountingComment, setAccountingComment] = useState('');
  const [managerComment, setManagerComment] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await createDeal({
        sellerType,
        clientName,
        clientPhone: clientPhone || undefined,
        requestMode,
        requestText,
        marginMode,
        marginValue: marginValue ? Number(marginValue) : undefined,
        accountingComment: accountingComment || undefined,
        managerComment: managerComment || undefined,
        urgent,
        managerId: user.id,
        createdById: user.id,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать заявку');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="content form" onSubmit={submit}>
      <Field title="От кого выставляем">
        <div className="segmented">
          {(['ST', 'MSM', 'IP'] as SellerType[]).map((type) => (
            <button type="button" key={type} className={sellerType === type ? 'selected' : ''} onClick={() => setSellerType(type)}>{sellerLabels[type]}</button>
          ))}
        </div>
      </Field>

      <Field title="Кому продаём">
        <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="ООО «Главолснаб»" required />
      </Field>
      <Field title="Телефон">
        <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+7…" />
      </Field>

      <Field title="Как передаём данные">
        <div className="segmented two">
          <button type="button" className={requestMode === 'TEXT' ? 'selected' : ''} onClick={() => setRequestMode('TEXT')}>Позиции текстом</button>
          <button type="button" className={requestMode === 'INCOMING_INVOICE' ? 'selected' : ''} onClick={() => setRequestMode('INCOMING_INVOICE')}>По входящему</button>
        </div>
      </Field>

      <Field title={requestMode === 'TEXT' ? 'Позиции и стоимость' : 'Описание входящего счёта'}>
        <textarea rows={5} value={requestText} onChange={(e) => setRequestText(e.target.value)} placeholder="Bonolit D500 — 32,4 м³ × 5 600 ₽…" required />
      </Field>

      <Field title="Наценка / цена">
        <div className="inline">
          <select value={marginMode} onChange={(e) => setMarginMode(e.target.value)}>
            <option value="TOTAL_PLUS">+ к сумме</option>
            <option value="UNIT_PLUS">+ за единицу</option>
            <option value="PERCENT">+ %</option>
            <option value="FINAL">Итоговая цена</option>
          </select>
          <input inputMode="decimal" value={marginValue} onChange={(e) => setMarginValue(e.target.value)} placeholder="0" />
        </div>
      </Field>

      <Field title="Комментарий бухгалтерии">
        <textarea rows={3} value={accountingComment} onChange={(e) => setAccountingComment(e.target.value)} placeholder="Доставку выделить отдельной строкой…" />
      </Field>
      <Field title="Мой комментарий">
        <textarea rows={3} value={managerComment} onChange={(e) => setManagerComment(e.target.value)} placeholder="Позвонить клиенту после 14:00…" />
      </Field>

      <label className="urgentToggle"><input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} /><span>Срочное</span></label>
      {error && <div className="error">{error}</div>}
      <div className="actions">
        <button type="button" className="secondary" onClick={onCancel}>Отмена</button>
        <button className="primary" disabled={saving}>{saving ? 'Отправляем…' : 'Отправить бухгалтерии'}</button>
      </div>
    </form>
  );
}


function TasksView({ user, onChanged }: { user: CurrentUser; onChanged: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Task | null>(null);

  async function reloadTasks() {
    setLoading(true);
    try { setTasks(await listTasks()); } finally { setLoading(false); }
  }
  useEffect(() => { void reloadTasks(); }, []);

  if (selected) {
    return <TaskDetail task={selected} user={user} onBack={() => { setSelected(null); void reloadTasks(); onChanged(); }} />;
  }

  return <section className="content">
    <div className="sectionHead"><h2>Задачи бухгалтерии</h2><span>{tasks.filter(t => !['DONE','CANCELLED'].includes(t.status)).length}</span></div>
    {loading ? <div className="empty">Загрузка…</div> : <div className="dealList">
      {tasks.map(task => <button key={task.id} className="taskCard" onClick={() => setSelected(task)}>
        <div><strong>{task.title}</strong><span>{task.deal.clientName} · ЗК-{task.deal.internalNumber}</span></div>
        <div className="taskState">{task.urgent && <b className="urgent">СРОЧНО</b>}<span>{taskStatus(task.status)}</span></div>
      </button>)}
    </div>}
  </section>;
}

function TaskDetail({ task, user, onBack }: { task: Task; user: CurrentUser; onBack: () => void }) {
  const [number, setNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function take() {
    setSaving(true); setError('');
    try { await updateTaskStatus(task.id, 'IN_PROGRESS', user.id); onBack(); } catch (e) { setError(String(e)); } finally { setSaving(false); }
  }

  async function finishInvoice() {
    setSaving(true); setError('');
    try {
      let fileId: string | undefined;
      if (file) {
        const uploaded = await uploadDealFile(task.deal.id, file, 'CLIENT_INVOICE');
        fileId = uploaded.id;
      }
      await createInvoice(task.deal.id, {
        number,
        amount: amount ? Number(amount) : undefined,
        invoiceDate: invoiceDate || undefined,
        fileId,
        actorId: user.id,
      });
      onBack();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setSaving(false); }
  }

  const canAttachInvoice = ['ISSUE_CLIENT_INVOICE','CORRECT_CLIENT_INVOICE'].includes(task.type);
  return <section className="content form">
    <button className="backLink" onClick={onBack}>← К задачам</button>
    <div className="detailHero">
      <div className="eyebrow">ЗК-{task.deal.internalNumber}</div>
      <h2>{task.title}</h2>
      <p>{task.deal.clientName}</p>
      {task.urgent && <b className="urgent">СРОЧНО</b>}
    </div>
    {task.deal.requestText && <div className="infoBox"><strong>Запрос менеджера</strong><p>{task.deal.requestText}</p></div>}
    {task.description && <div className="infoBox"><strong>Комментарий</strong><p>{task.description}</p></div>}

    {task.status === 'NEW' && <button className="primary wide" disabled={saving} onClick={take}>В работу</button>}

    {canAttachInvoice && !['DONE','CANCELLED'].includes(task.status) && <>
      <Field title="Номер готового счёта"><input value={number} onChange={e => setNumber(e.target.value)} placeholder="1548" required /></Field>
      <Field title="Сумма"><input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="420000" /></Field>
      <Field title="Дата счёта"><input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} /></Field>
      <Field title="PDF счёта"><input type="file" accept="application/pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} /></Field>
      <button className="primary wide" disabled={saving || !number} onClick={finishInvoice}>{saving ? 'Сохраняем…' : 'Счёт готов'}</button>
      <div className="microcopy">Файл отправляется ботом в служебный Telegram-архив, а в базе хранится Telegram file_id.</div>
    </>}
    {error && <div className="error">{error}</div>}
  </section>;
}

function taskStatus(status: string) { return ({ NEW: 'Новая', IN_PROGRESS: 'В работе', NEED_DATA: 'Нужны данные', DONE: 'Выполнена', CANCELLED: 'Отменена' } as Record<string,string>)[status] || status; }

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return <label className="field"><span>{title}</span>{children}</label>;
}
function ScreenMessage({ children }: { children: React.ReactNode }) { return <div className="screenMessage">{children}</div>; }
function roleName(role: CurrentUser['role']) { return ({ MANAGER: 'Менеджер', ACCOUNTANT: 'Бухгалтер', LEADER: 'Руководитель', ADMIN: 'Админ' } as const)[role]; }
function statusLabel(status: string) { return ({ WAITING_MANAGER_REVIEW: 'Ожидает проверки', CONFIRMED: 'Счёт подтверждён', CORRECTION_REQUESTED: 'На корректировке' } as Record<string, string>)[status] || status; }

export default App;
