import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  confirmInvoice,
  createDeal,
  createInvoice,
  dealFileUrl,
  getDeal,
  listDeals,
  listTasks,
  login,
  requestInvoiceCorrection,
  updateTaskStatus,
  uploadDealFile,
  type Task,
} from './api';
import type { CurrentUser, Deal, Invoice, SellerType } from './types';

const sellerLabels: Record<SellerType, string> = { ST: 'СТ', MSM: 'МСМ', IP: 'ИП' };
type View = 'home' | 'new' | 'tasks' | 'deal';

function App() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [view, setView] = useState<View>('home');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
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

  const title = view === 'new' ? 'Новый запрос на счёт' : view === 'tasks' ? 'Задачи' : view === 'deal' ? 'Сделка' : 'Мои сделки';

  return (
    <main className="shell">
      <header className="topbar">
        <div><div className="eyebrow">МСМ · Telegram Mini App</div><h1>{title}</h1></div>
        <div className="userBadge">{user.firstName}<span>{roleName(user.role)}</span></div>
      </header>

      {view === 'home' ? (
        <Home
          deals={deals}
          onNew={() => setView('new')}
          onOpen={(id) => { setSelectedDealId(id); setView('deal'); }}
        />
      ) : view === 'tasks' ? (
        <TasksView user={user} onChanged={() => reload()} />
      ) : view === 'deal' && selectedDealId ? (
        <DealDetail
          dealId={selectedDealId}
          user={user}
          onBack={async () => { await reload(); setView('home'); }}
        />
      ) : (
        <NewDealForm
          user={user}
          onCancel={() => setView('home')}
          onCreated={async () => { await reload(); setView('home'); }}
        />
      )}

      <nav className="bottomNav">
        <button className={view === 'home' || view === 'deal' ? 'active' : ''} onClick={() => setView('home')}>Сделки</button>
        <button className={view === 'tasks' ? 'active' : ''} onClick={() => setView('tasks')}>Задачи</button>
        <button disabled>Месяц</button>
      </nav>
    </main>
  );
}

function Home({ deals, onNew, onOpen }: { deals: Deal[]; onNew: () => void; onOpen: (id: string) => void }) {
  const active = useMemo(() => deals.filter((d) => d.status !== 'CLOSED'), [deals]);
  return (
    <section className="content">
      <button className="primary wide" onClick={onNew}>+ Новый счёт</button>
      <div className="sectionHead"><h2>Активные сделки</h2><span>{active.length}</span></div>
      <div className="dealList">
        {active.length === 0 && <div className="empty">Пока нет активных сделок.</div>}
        {active.map((deal) => <DealCard key={deal.id} deal={deal} onOpen={() => onOpen(deal.id)} />)}
      </div>
    </section>
  );
}

function DealCard({ deal, onOpen }: { deal: Deal; onOpen: () => void }) {
  const invoice = deal.invoices[0];
  const urgent = deal.tasks.some((t) => t.urgent);
  return (
    <button className="dealCard clickable" onClick={onOpen}>
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
    </button>
  );
}

function DealDetail({ dealId, user, onBack }: { dealId: string; user: CurrentUser; onBack: () => void }) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correction, setCorrection] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [saving, setSaving] = useState(false);

  async function reload() {
    setLoading(true);
    try { setDeal(await getDeal(dealId)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, [dealId]);

  if (loading) return <section className="content"><div className="empty">Загрузка сделки…</div></section>;
  if (!deal) return <section className="content"><div className="error">{error || 'Сделка не найдена'}</div></section>;

  const current = deal.invoices.find((i) => i.isCurrent) ?? deal.invoices[0];
  const canReview = current && current.status === 'WAITING_MANAGER_REVIEW' && ['MANAGER','LEADER','ADMIN'].includes(user.role);

  async function confirm() {
    if (!current) return;
    setSaving(true); setError('');
    try { await confirmInvoice(deal.id, current.id, user.id); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  async function sendCorrection() {
    if (!current || !correction.trim()) return;
    setSaving(true); setError('');
    try {
      await requestInvoiceCorrection(deal.id, current.id, { actorId: user.id, comment: correction.trim(), urgent });
      setCorrection(''); setUrgent(false); setCorrectionOpen(false);
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  return <section className="content form">
    <button className="backLink" onClick={onBack}>← К сделкам</button>
    <div className="detailHero">
      <div className="eyebrow">ЗК-{deal.internalNumber}</div>
      <h2>{current ? `${sellerLabels[deal.sellerType]}-${current.number}` : `ЗК-${deal.internalNumber}`}</h2>
      <p>{deal.clientName}</p>
      <div className="statusPill">{current ? statusLabel(current.status) : 'Ожидаем счёт'}</div>
    </div>

    {current ? <InvoiceBlock invoice={current} sellerType={deal.sellerType} /> : <div className="infoBox"><strong>Счёт ещё не готов</strong><p>Бухгалтерия пока не загрузила клиентский счёт.</p></div>}

    {canReview && <div className="reviewBox">
      <strong>Проверьте готовый счёт</strong>
      <p>Если всё правильно — подтвердите. Если нужна правка — отправьте комментарий бухгалтерии.</p>
      <div className="actions">
        <button className="secondary" disabled={saving} onClick={() => setCorrectionOpen((v) => !v)}>Скорректировать</button>
        <button className="primary" disabled={saving} onClick={confirm}>{saving ? 'Сохраняем…' : 'Всё верно'}</button>
      </div>
    </div>}

    {correctionOpen && <div className="correctionBox">
      <Field title="Что нужно изменить">
        <textarea rows={4} value={correction} onChange={(e) => setCorrection(e.target.value)} placeholder="Например: убрать доставку 23 000 ₽ и изменить количество…" />
      </Field>
      <label className="urgentToggle"><input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} /><span>Срочная корректировка</span></label>
      <button className="primary wide" disabled={saving || !correction.trim()} onClick={sendCorrection}>Отправить бухгалтерии</button>
    </div>}

    <div className="infoBox"><strong>Исходный запрос</strong><p>{deal.requestText || 'Не указан'}</p>{deal.accountingComment && <p><b>Комментарий бухгалтерии:</b> {deal.accountingComment}</p>}</div>

    {deal.invoices.length > 1 && <div className="infoBox">
      <strong>История версий счёта</strong>
      <div className="versionList">{deal.invoices.map((invoice) => <InvoiceVersion key={invoice.id} invoice={invoice} sellerType={deal.sellerType} />)}</div>
    </div>}

    {deal.auditEvents && deal.auditEvents.length > 0 && <div className="infoBox">
      <strong>Последние события</strong>
      <div className="historyList">{deal.auditEvents.slice(0, 8).map((event) => <div key={event.id}><span>{new Date(event.createdAt).toLocaleString('ru-RU')}</span><b>{auditLabel(event.action)}</b>{event.reason && <em>{event.reason}</em>}</div>)}</div>
    </div>}

    {error && <div className="error">{error}</div>}
  </section>;
}

function InvoiceBlock({ invoice, sellerType }: { invoice: Invoice; sellerType: SellerType }) {
  return <div className="invoiceBlock">
    <div><span>Счёт</span><strong>{sellerLabels[sellerType]}-{invoice.number}</strong></div>
    <div><span>Сумма</span><strong>{invoice.amount ? money(invoice.amount) : 'не указана'}</strong></div>
    <div><span>Дата</span><strong>{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('ru-RU') : 'не указана'}</strong></div>
    {invoice.fileId && <a className="fileButton" href={dealFileUrl(invoice.fileId)} target="_blank" rel="noreferrer">Открыть PDF</a>}
  </div>;
}

function InvoiceVersion({ invoice, sellerType }: { invoice: Invoice; sellerType: SellerType }) {
  return <div className="versionRow"><div><b>Версия {invoice.version}</b><span>{sellerLabels[sellerType]}-{invoice.number} · {statusLabel(invoice.status)}</span></div>{invoice.fileId && <a href={dealFileUrl(invoice.fileId)} target="_blank" rel="noreferrer">Файл</a>}</div>;
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
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await createDeal({ sellerType, clientName, clientPhone: clientPhone || undefined, requestMode, requestText, marginMode, marginValue: marginValue ? Number(marginValue) : undefined, accountingComment: accountingComment || undefined, managerComment: managerComment || undefined, urgent, managerId: user.id, createdById: user.id });
      onCreated();
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось создать заявку'); }
    finally { setSaving(false); }
  }

  return <form className="content form" onSubmit={submit}>
    <Field title="От кого выставляем"><div className="segmented">{(['ST','MSM','IP'] as SellerType[]).map((type) => <button type="button" key={type} className={sellerType === type ? 'selected' : ''} onClick={() => setSellerType(type)}>{sellerLabels[type]}</button>)}</div></Field>
    <Field title="Кому продаём"><input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="ООО «Главолснаб»" required /></Field>
    <Field title="Телефон"><input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+7…" /></Field>
    <Field title="Как передаём данные"><div className="segmented two"><button type="button" className={requestMode === 'TEXT' ? 'selected' : ''} onClick={() => setRequestMode('TEXT')}>Позиции текстом</button><button type="button" className={requestMode === 'INCOMING_INVOICE' ? 'selected' : ''} onClick={() => setRequestMode('INCOMING_INVOICE')}>По входящему</button></div></Field>
    <Field title={requestMode === 'TEXT' ? 'Позиции и стоимость' : 'Описание входящего счёта'}><textarea rows={5} value={requestText} onChange={(e) => setRequestText(e.target.value)} placeholder="Bonolit D500 — 32,4 м³ × 5 600 ₽…" required /></Field>
    <Field title="Наценка / цена"><div className="inline"><select value={marginMode} onChange={(e) => setMarginMode(e.target.value)}><option value="TOTAL_PLUS">+ к сумме</option><option value="UNIT_PLUS">+ за единицу</option><option value="PERCENT">+ %</option><option value="FINAL">Итоговая цена</option></select><input inputMode="decimal" value={marginValue} onChange={(e) => setMarginValue(e.target.value)} placeholder="0" /></div></Field>
    <Field title="Комментарий бухгалтерии"><textarea rows={3} value={accountingComment} onChange={(e) => setAccountingComment(e.target.value)} placeholder="Доставку выделить отдельной строкой…" /></Field>
    <Field title="Мой комментарий"><textarea rows={3} value={managerComment} onChange={(e) => setManagerComment(e.target.value)} placeholder="Позвонить клиенту после 14:00…" /></Field>
    <label className="urgentToggle"><input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} /><span>Срочное</span></label>
    {error && <div className="error">{error}</div>}
    <div className="actions"><button type="button" className="secondary" onClick={onCancel}>Отмена</button><button className="primary" disabled={saving}>{saving ? 'Отправляем…' : 'Отправить бухгалтерии'}</button></div>
  </form>;
}

function TasksView({ user, onChanged }: { user: CurrentUser; onChanged: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Task | null>(null);
  async function reloadTasks() { setLoading(true); try { setTasks(await listTasks()); } finally { setLoading(false); } }
  useEffect(() => { void reloadTasks(); }, []);
  if (selected) return <TaskDetail task={selected} user={user} onBack={() => { setSelected(null); void reloadTasks(); onChanged(); }} />;
  return <section className="content"><div className="sectionHead"><h2>Задачи бухгалтерии</h2><span>{tasks.filter(t => !['DONE','CANCELLED'].includes(t.status)).length}</span></div>{loading ? <div className="empty">Загрузка…</div> : <div className="dealList">{tasks.map(task => <button key={task.id} className="taskCard" onClick={() => setSelected(task)}><div><strong>{task.title}</strong><span>{task.deal.clientName} · ЗК-{task.deal.internalNumber}</span></div><div className="taskState">{task.urgent && <b className="urgent">СРОЧНО</b>}<span>{taskStatus(task.status)}</span></div></button>)}</div>}</section>;
}

function TaskDetail({ task, user, onBack }: { task: Task; user: CurrentUser; onBack: () => void }) {
  const [number, setNumber] = useState(''); const [amount, setAmount] = useState(''); const [invoiceDate, setInvoiceDate] = useState(''); const [file, setFile] = useState<File | null>(null); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  async function take() { setSaving(true); setError(''); try { await updateTaskStatus(task.id, 'IN_PROGRESS', user.id); onBack(); } catch (e) { setError(String(e)); } finally { setSaving(false); } }
  async function finishInvoice() { setSaving(true); setError(''); try { let fileId: string | undefined; if (file) { const uploaded = await uploadDealFile(task.deal.id, file, 'CLIENT_INVOICE'); fileId = uploaded.id; } await createInvoice(task.deal.id, { number, amount: amount ? Number(amount) : undefined, invoiceDate: invoiceDate || undefined, fileId, actorId: user.id }); onBack(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setSaving(false); } }
  const canAttachInvoice = ['ISSUE_CLIENT_INVOICE','CORRECT_CLIENT_INVOICE'].includes(task.type);
  return <section className="content form"><button className="backLink" onClick={onBack}>← К задачам</button><div className="detailHero"><div className="eyebrow">ЗК-{task.deal.internalNumber}</div><h2>{task.title}</h2><p>{task.deal.clientName}</p>{task.urgent && <b className="urgent">СРОЧНО</b>}</div>{task.deal.requestText && <div className="infoBox"><strong>Запрос менеджера</strong><p>{task.deal.requestText}</p></div>}{task.description && <div className="infoBox"><strong>Комментарий</strong><p>{task.description}</p></div>}{task.status === 'NEW' && <button className="primary wide" disabled={saving} onClick={take}>В работу</button>}{canAttachInvoice && !['DONE','CANCELLED'].includes(task.status) && <><Field title="Номер готового счёта"><input value={number} onChange={e => setNumber(e.target.value)} placeholder="1548" required /></Field><Field title="Сумма"><input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="420000" /></Field><Field title="Дата счёта"><input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} /></Field><Field title="PDF счёта"><input type="file" accept="application/pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} /></Field><button className="primary wide" disabled={saving || !number} onClick={finishInvoice}>{saving ? 'Сохраняем…' : 'Счёт готов'}</button><div className="microcopy">Файл отправляется ботом в служебный Telegram-архив, а в базе хранится Telegram file_id.</div></>}{error && <div className="error">{error}</div>}</section>;
}

function money(value: string | number) { return `${Number(value).toLocaleString('ru-RU')} ₽`; }
function auditLabel(action: string) { return ({ CREATE: 'Создана сделка', UPLOAD: 'Загружен счёт', CONFIRM: 'Счёт подтверждён', REQUEST_CORRECTION: 'Запрошена корректировка' } as Record<string,string>)[action] || action; }
function taskStatus(status: string) { return ({ NEW: 'Новая', IN_PROGRESS: 'В работе', NEED_DATA: 'Нужны данные', DONE: 'Выполнена', CANCELLED: 'Отменена' } as Record<string,string>)[status] || status; }
function Field({ title, children }: { title: string; children: React.ReactNode }) { return <label className="field"><span>{title}</span>{children}</label>; }
function ScreenMessage({ children }: { children: React.ReactNode }) { return <div className="screenMessage">{children}</div>; }
function roleName(role: CurrentUser['role']) { return ({ MANAGER: 'Менеджер', ACCOUNTANT: 'Бухгалтер', LEADER: 'Руководитель', ADMIN: 'Админ' } as const)[role]; }
function statusLabel(status: string) { return ({ WAITING_MANAGER_REVIEW: 'Ожидает проверки', CONFIRMED: 'Счёт подтверждён', CORRECTION_REQUESTED: 'На корректировке', WAITING_ACCOUNTING: 'Ожидаем счёт' } as Record<string, string>)[status] || status; }

export default App;
