import {
  updateDealInfo,
  updateShipmentDate,
  updateSupplierPurchase,
} from './api';

import {
  MultiFilePicker,
  SingleFilePicker,
} from './MultiFilePicker';

import {
  updateInvoiceAmount,
} from './api';

import {
  RecentActivityPanel,
} from './RecentActivityPanel';
import {
  BackgroundUploadList,
  type BackgroundUploadJob,
  startBackgroundUploadJob,
  useBackgroundUploads,
} from './backgroundUploads';

import {
  PurchasesBlock,
  SupplierPaymentTask,
} from './PurchasesBlock';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  addClientPayment,
  confirmInvoice,
  createDeal,
  createInvoice,
  dealFileUrl,
  getDeal,
  listDeals,
  listTasks,
  login,
  requestInvoiceCorrection,
  returnInvoiceRequest,
  submitInvoiceRequest,
  withdrawInvoiceRequest,
  updatePaymentStatus,
  updateTaskStatus,
  uploadDealFile,
  type Task,
} from './api';
import type { ClientPaymentMethod, CurrentUser, Deal, Invoice, PaymentStatus, SellerType } from './types';

const sellerLabels: Record<SellerType, string> = { ST: 'СТ', MSM: 'МСМ', IP: 'ИП' };
type View = 'home' | 'new' | 'tasks' | 'deal';

function readRoute(): { view: View; dealId?: string } {
  const hash = window.location.hash.replace(/^#/, '');

  if (hash === 'new') {
    return { view: 'new' };
  }

  if (hash === 'tasks' || hash.startsWith('tasks/')) {
    return { view: 'tasks' };
  }

  if (hash.startsWith('deal/')) {
    return {
      view: 'deal',
      dealId: decodeURIComponent(
        hash.slice('deal/'.length)
      ),
    };
  }

  return { view: 'home' };
}

function routeHash(
  view: View,
  dealId?: string
) {
  if (view === 'deal' && dealId) {
    return '#deal/' + encodeURIComponent(dealId);
  }

  return '#' + view;
}

function App() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [view, setView] = useState<View>(
    () => readRoute().view
  );
  const [selectedDealId, setSelectedDealId] =
    useState<string | null>(
      () => readRoute().dealId ?? null
    );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function reload(currentUser = user) {
    if (!currentUser) return;
    const data = await listDeals(currentUser.role === 'MANAGER' ? currentUser.id : undefined);
    setDeals(data);
  }

  function navigate(
    nextView: View,
    dealId?: string
  ) {
    const nextHash = routeHash(
      nextView,
      dealId
    );

    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
      return;
    }

    setView(nextView);
    setSelectedDealId(dealId ?? null);
  }

  useEffect(() => {
    const syncRoute = () => {
      const route = readRoute();

      setView(route.view);
      setSelectedDealId(
        route.dealId ?? null
      );
    };

    if (!window.location.hash) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname +
          window.location.search +
          '#home'
      );
    }

    syncRoute();

    window.addEventListener(
      'hashchange',
      syncRoute
    );

    return () => {
      window.removeEventListener(
        'hashchange',
        syncRoute
      );
    };
  }, []);

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
  useEffect(() => {
    if (!user) return;

    const timer = window.setInterval(
      () => {
        void reload(user);
      },
      7000
    );

    return () => {
      window.clearInterval(timer);
    };
  }, [user?.id, user?.role]);


  if (loading) return <ScreenMessage>Загрузка…</ScreenMessage>;
  if (error || !user) return <ScreenMessage>Не удалось запустить приложение: {error}</ScreenMessage>;

  const title = view === 'new' ? 'Новый запрос на счёт' : view === 'tasks' ? 'Задачи' : view === 'deal' ? 'Сделка' : 'Мои сделки';

  return (
    <main className="shell">
      <header className="topbar">
        <div><div className="eyebrow">МСМ · Telegram Mini App</div><h1>{title}</h1></div>
        <div className="topbarActions">
          <ThemeToggle />
          <div className="userBadge">{user.firstName}<span>{roleName(user.role)}</span></div>
        </div>
      </header>

      {view === 'home' ? (
        <Home
          deals={deals}
          onNew={() => navigate('new')}
          onOpen={(id) => navigate('deal', id)}
        />
      ) : view === 'tasks' ? (
        <TasksView user={user} onChanged={() => reload()} />
      ) : view === 'deal' && selectedDealId ? (
        <DealDetail
          dealId={selectedDealId}
          user={user}
          onBack={async () => {
            await reload();
            navigate('home');
          }}
        />
      ) : (
        <NewDealForm
          user={user}
          onCancel={() => navigate('home')}
          onCreated={async () => {
            await reload();
            navigate('home');
          }}
        />
      )}

      <nav className="bottomNav">
        <button className={view === 'home' || view === 'deal' ? 'active' : ''} onClick={() => navigate('home')}>Сделки</button>
        <button className={view === 'tasks' ? 'active' : ''} onClick={() => navigate('tasks')}>Задачи</button>
        <button disabled>Месяц</button>
      </nav>
    </main>
  );
}


function invoiceRequestNeedsManager(
  deal: Deal,
) {

  return deal.tasks.some(
    (task) =>
      task.type ===
        'ISSUE_CLIENT_INVOICE' &&
      task.status ===
        'NEED_DATA'
  );
}


function Home({
  deals,
  onNew,
  onOpen,
}: {
  deals: Deal[];
  onNew: () => void;
  onOpen: (id: string) => void;
}) {

  const backgroundUploads =
    useBackgroundUploads();


  const active =
    useMemo(
      () =>
        deals
          .filter(
            (deal) =>
              deal.status !==
              'CLOSED'
          )
          .sort(
            (a, b) =>
              Number(
                invoiceRequestNeedsManager(
                  b
                )
              ) -
              Number(
                invoiceRequestNeedsManager(
                  a
                )
              )
          ),
      [deals]
    );


  return (

    <section className="content homeContent">

      <div className="homeLayout">

        <div className="homeDeals">

          <button
            className="primary wide"
            onClick={onNew}
          >
            + Новый счёт
          </button>


          <div className="sectionHead">

            <h2>
              Активные сделки
            </h2>

            <span>
              {active.length}
            </span>

          </div>


          <div className="dealList">

            {active.length === 0 && (

              <div className="empty">
                Пока нет активных сделок.
              </div>

            )}


            {active.map(
              (deal) => (

              <DealCard
                key={deal.id}
                deal={deal}
                uploadJob={
                  backgroundUploads.find(
                    (job) =>
                      job.dealId === deal.id
                  )
                }
                onOpen={() =>
                  onOpen(
                    deal.id
                  )
                }
              />

            ))}

          </div>

        </div>


        <RecentActivityPanel />

      </div>

    </section>
  );
}


function DealCard({
  deal,
  onOpen,
  uploadJob,
}: {
  deal: Deal;
  onOpen: () => void;
  uploadJob?: BackgroundUploadJob;
}) {
  const invoice = deal.invoices[0];
  const urgent = deal.tasks.some((t) => t.urgent);

  const needsManagerAction =
    invoiceRequestNeedsManager(
      deal
    );

  const latestReturn =
    deal.auditEvents?.find(
      (event) =>
        event.action ===
        'INVOICE_REQUEST_RETURNED'
    );

  const returnReason =
    String(
      latestReturn
        ?.newValue
        ?.reasonLabel ||
      'Нужно уточнить данные для счёта'
    );

  return (
    <button
      className={
        'dealCard clickable' +
        (
          needsManagerAction
            ? ' dealCardNeedsAction'
            : ''
        )
      }
      onClick={onOpen}
    >
      <div className="dealTop">
        <div>
          <strong>{invoice ? `${sellerLabels[deal.sellerType]}-${invoice.number}` : `ЗК-${deal.internalNumber}`}</strong>
          <span>{deal.clientName}</span>
        </div>
        {urgent && <b className="urgent">СРОЧНО</b>}
      </div>

      <div className="dealMeta">
        <span>Отгрузка: {deal.plannedShipmentAt ? new Date(deal.plannedShipmentAt).toLocaleDateString('ru-RU') : 'не указана'}</span>

        {needsManagerAction ? (
          <b className="dealCardActionStatus">
            Нужны данные
          </b>
        ) : (
          <span>{invoice ? statusLabel(invoice.status) : 'Ожидаем счёт'}</span>
        )}
      </div>

      <div className="paymentMini">{paymentStatusLabel(deal.paymentStatus)}</div>

      {uploadJob && (
        <div
          className={
            'dealUploadState dealUpload-' +
            uploadJob.status.toLowerCase()
          }
        >
          <div className="dealUploadStateTop">
            <strong>
              {
                uploadJob.status === 'SUCCESS'
                  ? '✓ ' +
                    (uploadJob.successTitle ||
                      uploadJob.title)
                  : uploadJob.status === 'ERROR'
                    ? 'Не удалось отправить файлы'
                    : uploadJob.title
              }
            </strong>

            <b>
              {uploadJob.progress}%
            </b>
          </div>

          <div className="dealUploadMiniBar">
            <span
              style={{
                width:
                  uploadJob.progress + '%',
              }}
            />
          </div>

          {uploadJob.status === 'RUNNING' && (
            <span>
              {uploadJob.currentFile
                ? 'Загружаем: ' +
                  uploadJob.currentFile
                : 'Подготавливаем отправку…'}
            </span>
          )}

          {uploadJob.status === 'ERROR' &&
            uploadJob.error && (
              <span>
                {uploadJob.error}
              </span>
            )}
        </div>
      )}

      {needsManagerAction ? (
        <div className="dealCardActionBox">
          <div className="dealCardActionHead">
            <strong>
              Бухгалтерия вернула запрос
            </strong>
            <span>
              {returnReason}
            </span>
          </div>

          {latestReturn?.reason && (
            <p>
              {latestReturn.reason}
            </p>
          )}

          <span className="dealCardActionCta">
            Исправить и повторно отправить →
          </span>
        </div>
      ) : (
        <>
          {deal.managerComment && <div className="note">📝 {deal.managerComment}</div>}
          {deal.tasks.length > 0 && <div className="tasksHint">Активных задач: {deal.tasks.length}</div>}
        </>
      )}
    </button>
  );
}

function DealDetail({
  dealId,
  user,
  onBack,
}: {
  dealId: string;
  user: CurrentUser;
  onBack: () => void;
}) {

  const backgroundUploads =
    useBackgroundUploads();

  const [deal, setDeal] =
    useState<Deal | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [
    correctionOpen,
    setCorrectionOpen,
  ] = useState(false);

  const [
    correction,
    setCorrection,
  ] = useState('');

  const [
    correctionFiles,
    setCorrectionFiles,
  ] = useState<File[]>([]);

  const [
    correctionPrimaryFile,
    setCorrectionPrimaryFile,
  ] = useState<File | null>(null);

  const [urgent, setUrgent] =
    useState(false);

  const [
    correctionSellerType,
    setCorrectionSellerType,
  ] = useState<SellerType>('MSM');

  const [
    quickEdit,
    setQuickEdit,
  ] = useState<
    'invoiceAmount' |
    'incomingAmount' |
    'shipmentDate' |
    null
  >(null);

  const [
    incomingAmountDraft,
    setIncomingAmountDraft,
  ] = useState('');

  const [saving, setSaving] =
    useState(false);

  const [
    managerAmount,
    setManagerAmount,
  ] = useState('');

  const [
    invoiceMenuOpen,
    setInvoiceMenuOpen,
  ] = useState(false);

  const [
    shipmentDate,
    setShipmentDate,
  ] = useState('');

  const [
    dealInfoOpen,
    setDealInfoOpen,
  ] = useState(false);

  const [
    phoneMenuOpen,
    setPhoneMenuOpen,
  ] = useState(false);

  const [
    editClientName,
    setEditClientName,
  ] = useState('');

  const [
    editContactName,
    setEditContactName,
  ] = useState('');

  const [
    editClientPhone,
    setEditClientPhone,
  ] = useState('');

  const [
    editManagerComment,
    setEditManagerComment,
  ] = useState('');

  const [
    editAddresses,
    setEditAddresses,
  ] = useState<string[]>([]);

  const [
    requestClientName,
    setRequestClientName,
  ] = useState('');

  const [
    requestSellerType,
    setRequestSellerType,
  ] = useState<SellerType>('MSM');

  const [
    requestMarginMode,
    setRequestMarginMode,
  ] = useState('TOTAL_PLUS');

  const [
    requestMarginValue,
    setRequestMarginValue,
  ] = useState('');

  const [
    requestAccountingComment,
    setRequestAccountingComment,
  ] = useState('');

  const [
    requestIncomingInvoice,
    setRequestIncomingInvoice,
  ] = useState<File | null>(null);

  const [
    requestExtraFiles,
    setRequestExtraFiles,
  ] = useState<File[]>([]);

  const [
    requestUrgent,
    setRequestUrgent,
  ] = useState(false);

  const [
    withdrawConfirmOpen,
    setWithdrawConfirmOpen,
  ] = useState(false);

  const [
    invoiceRequestEditOpen,
    setInvoiceRequestEditOpen,
  ] = useState(false);


  async function reload(
    showLoading = true,
  ) {

    if (showLoading) {
      setLoading(true);
    }


    try {

      const next =
        await getDeal(
          dealId
        );


      setDeal(next);
      setError('');


    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );


    } finally {

      if (showLoading) {
        setLoading(false);
      }
    }
  }


  useEffect(
    () => {

      void reload(true);

    },
    [dealId],
  );


  useEffect(
    () => {

      if (!deal) {
        return;
      }


      const currentInvoice =
        deal.invoices.find(
          (invoice) =>
            invoice.isCurrent
        ) ??
        deal.invoices[0];


      setManagerAmount(
        currentInvoice?.amount
          ? formatMoneyInput(
              String(
                currentInvoice.amount
              )
            )
          : ''
      );

    },
    [deal],
  );


  useEffect(
    () => {

      setShipmentDate(
        deal?.plannedShipmentAt
          ?.slice(0, 10) ||
        ''
      );

    },
    [
      deal?.plannedShipmentAt,
    ],
  );


  useEffect(
    () => {
      const purchases =
        deal?.supplierPurchases || [];

      if (purchases.length === 1) {
        setIncomingAmountDraft(
          purchases[0]
            .incomingInvoiceAmount
            ? formatMoneyInput(
                String(
                  purchases[0]
                    .incomingInvoiceAmount
                )
              )
            : ''
        );
      } else {
        setIncomingAmountDraft('');
      }
    },
    [deal?.supplierPurchases],
  );


  useEffect(
    () => {

      setEditClientName(
        deal?.clientName ||
        ''
      );

      setEditContactName(
        deal?.contactName ||
        ''
      );

      setEditClientPhone(
        deal?.clientPhone ||
        ''
      );

      setEditManagerComment(
        deal?.managerComment ||
        ''
      );

      setEditAddresses(
        deal?.deliveryAddresses &&
        Array.isArray(
          deal.deliveryAddresses
        )
          ? [...deal.deliveryAddresses]
          : []
      );

      setRequestClientName(
        deal?.clientName || ''
      );

      setRequestSellerType(
        deal?.sellerType ||
        'MSM'
      );

      setCorrectionSellerType(
        deal?.sellerType ||
        'MSM'
      );

      setRequestMarginMode(
        deal?.marginMode ||
        'TOTAL_PLUS'
      );

      setRequestMarginValue(
        deal?.marginValue === undefined ||
        deal?.marginValue === null
          ? ''
          : String(deal.marginValue)
      );

      setRequestAccountingComment(
        deal?.accountingComment || ''
      );

    },
    [
      deal?.contactName,
      deal?.clientPhone,
      deal?.managerComment,
      deal?.deliveryAddresses,
      deal?.clientName,
      deal?.sellerType,
      deal?.marginMode,
      deal?.marginValue,
      deal?.accountingComment,
    ],
  );


  useEffect(
    () => {
      if (!phoneMenuOpen) {
        return;
      }

      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setPhoneMenuOpen(false);
        }
      };

      window.addEventListener('keydown', closeOnEscape);

      return () => {
        window.removeEventListener('keydown', closeOnEscape);
      };
    },
    [phoneMenuOpen],
  );


  if (loading) {

    return (

      <section className="content">

        <div className="empty">
          Загрузка сделки…
        </div>

      </section>
    );
  }


  if (!deal) {

    return (

      <section className="content">

        <div className="error">
          {
            error ||
            'Сделка не найдена'
          }
        </div>

      </section>
    );
  }


  const current =
    deal.invoices.find(
      (invoice) =>
        invoice.isCurrent
    ) ??
    deal.invoices[0];


  const customerInvoiceHistory =
    (deal.files || [])
      .filter(
        (file) =>
          file.category ===
            'CUSTOMER_INVOICE_PRIMARY' ||
          file.category
            ?.startsWith(
              'CORRECTION_PRIMARY_'
            )
      )
      .sort(
        (a, b) =>
          new Date(
            a.createdAt || 0
          ).getTime() -
          new Date(
            b.createdAt || 0
          ).getTime()
      );


  const currentCustomerInvoice =
    customerInvoiceHistory[
      customerInvoiceHistory.length - 1
    ];


  const previousCustomerInvoices =
    customerInvoiceHistory.slice(
      0,
      -1,
    );


  const invoiceRequestTask =
    deal.tasks.find(
      (task) =>
        task.type ===
          'ISSUE_CLIENT_INVOICE' &&
        ![
          'DONE',
          'CANCELLED',
        ].includes(
          task.status
        )
    );


  const invoiceRequestUploadJob =
    backgroundUploads.find(
      (job) =>
        job.dealId === dealId
    );


  const latestInvoiceReturn =
    deal.auditEvents?.find(
      (event) =>
        event.action ===
        'INVOICE_REQUEST_RETURNED'
    );


  const supplierPurchases =
    deal.supplierPurchases || [];


  const incomingTotal =
    supplierPurchases.reduce(
      (sum, purchase) =>
        sum +
        Number(
          purchase.incomingInvoiceAmount ||
          0
        ),
      0,
    );


  const supplierNames =
    supplierPurchases
      .map(
        (purchase) =>
          purchase.supplierName
      )
      .filter(Boolean);


  const supplierSummary =
    supplierNames.length > 0
      ? supplierNames.join(', ')
      : 'Не указан';


  const editableIncomingPurchase =
    supplierPurchases.length === 1
      ? supplierPurchases[0]
      : undefined;


  const canManageDeal =
    [
      'MANAGER',
      'LEADER',
      'ADMIN',
    ].includes(
      user.role
    );


  const canManageInvoice =
    Boolean(current) &&
    canManageDeal;


  const canConfirm =
    canManageInvoice &&
    current?.status ===
      'WAITING_MANAGER_REVIEW';


  function parsedManagerAmount() {

    return parseMoneyInput(
      managerAmount
    );
  }


  function copyDealValue(
    value: string,
  ) {
    void navigator.clipboard
      ?.writeText(value)
      .catch(
        () => undefined
      );
  }


  async function saveQuickInvoiceAmount() {

    if (!current) {
      return;
    }

    const parsed =
      parsedManagerAmount();

    if (
      managerAmount.trim() &&
      parsed === undefined
    ) {
      setError(
        'Проверьте сумму счёта'
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateInvoiceAmount(
        dealId,
        current.id,
        {
          amount: parsed,
          actorId: user.id,
        },
      );

      setQuickEdit(null);
      await reload(false);

    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );
    } finally {
      setSaving(false);
    }
  }


  async function saveQuickShipmentDate() {

    setSaving(true);
    setError('');

    try {
      await updateShipmentDate(
        dealId,
        {
          plannedShipmentAt:
            shipmentDate ||
            undefined,
          actorId: user.id,
        },
      );

      setQuickEdit(null);
      await reload(false);

    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );
    } finally {
      setSaving(false);
    }
  }


  async function saveQuickIncomingAmount() {

    if (!editableIncomingPurchase) {
      return;
    }

    const parsed =
      parseMoneyInput(
        incomingAmountDraft
      );

    if (
      incomingAmountDraft.trim() &&
      parsed === undefined
    ) {
      setError(
        'Проверьте входящую сумму'
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateSupplierPurchase(
        dealId,
        editableIncomingPurchase.id,
        {
          incomingInvoiceAmount:
            parsed,
          actorId: user.id,
        },
      );

      setQuickEdit(null);
      await reload(false);

    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );
    } finally {
      setSaving(false);
    }
  }


  function openCorrectionEditor() {
    const activeDeal = deal;

    if (!activeDeal) {
      return;
    }

    setCorrectionSellerType(
      activeDeal.sellerType
    );
    setCorrectionOpen(true);
  }


  function normalizedPhone() {

    let digits =
      editClientPhone
        .replace(/\D/g, '');


    if (
      digits.length === 11 &&
      digits.startsWith('8')
    ) {

      digits =
        '7' +
        digits.slice(1);
    }


    return digits;
  }


  async function saveDealInfo() {

    setSaving(true);
    setError('');


    try {

      await updateDealInfo(
        dealId,
        {
          clientName:
            editClientName
              .trim() ||
            undefined,

          contactName:
            editContactName
              .trim() ||
            undefined,

          clientPhone:
            editClientPhone
              .trim() ||
            undefined,

          managerComment:
            editManagerComment
              .trim() ||
            undefined,

          deliveryAddresses:
            editAddresses
              .map(
                (value) =>
                  value.trim()
              )
              .filter(Boolean),

          actorId:
            user.id,
        },
      );


      setDealInfoOpen(false);
      setPhoneMenuOpen(false);

      await reload(false);


    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );


    } finally {

      setSaving(false);
    }
  }


  function addDeliveryAddress() {

    setEditAddresses(
      (current) => [
        ...current,
        '',
      ]
    );
  }


  function removeDeliveryAddress(
    index: number,
  ) {

    setEditAddresses(
      (current) =>
        current.filter(
          (_, currentIndex) =>
            currentIndex !==
            index
        )
    );
  }


  function openMax() {

    const digits =
      normalizedPhone();


    if (!digits) {
      return;
    }


    void navigator.clipboard
      ?.writeText(
        '+' + digits
      )
      .catch(
        () => undefined
      );


    window.open(
      'https://max.ru/',
      '_blank',
      'noopener,noreferrer'
    );
  }


  async function saveInvoiceRequestSeller() {

    const activeDeal = deal;

    if (!activeDeal) {
      return;
    }

    if (
      requestSellerType ===
      activeDeal.sellerType
    ) {
      return;
    }


    setSaving(true);
    setError('');


    try {

      await updateDealInfo(
        dealId,
        {
          sellerType:
            requestSellerType,

          actorId:
            user.id,
        },
      );


      setInvoiceRequestEditOpen(false);

      await reload(false);


    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );


    } finally {

      setSaving(false);
    }
  }


  async function sendInvoiceRequestAgain() {

    const activeDeal = deal;

    if (!activeDeal) {
      return;
    }


    const parsedMargin =
      parseMoneyInput(
        requestMarginValue
      );


    if (
      requestMarginValue.trim() &&
      parsedMargin === undefined
    ) {
      setError(
        'Проверьте значение условий'
      );
      return;
    }


    setSaving(true);
    setError('');


    try {

      await updateDealInfo(
        dealId,
        {
          sellerType:
            requestSellerType,
          clientName:
            requestClientName.trim() ||
            activeDeal.clientName,
          accountingComment:
            requestAccountingComment
              .trim() ||
            undefined,
          marginMode:
            requestMarginMode,
          marginValue:
            parsedMargin,
          actorId:
            user.id,
        },
      );


      await reload(false);


      const primaryFile =
        requestIncomingInvoice;

      const extraFiles =
        [...requestExtraFiles];

      const filesToUpload = [
        ...(primaryFile
          ? [primaryFile]
          : []),
        ...extraFiles,
      ];


      if (filesToUpload.length > 0) {

        startBackgroundUploadJob({
          dealId,
          title:
            'Отправляем документы бухгалтерии',
          successTitle:
            'Запрос отправлен бухгалтерии',
          subtitle:
            activeDeal.clientName,
          files:
            filesToUpload,

          run:
            async ({
              upload,
              setProgress,
            }) => {

              let uploadIndex = 0;


              if (primaryFile) {

                await upload(
                  dealId,
                  primaryFile,
                  'CUSTOMER_INVOICE_PRIMARY',
                  uploadIndex,
                  filesToUpload.length,
                );

                uploadIndex++;
              }


              for (
                let index = 0;
                index < extraFiles.length;
                index++
              ) {

                await upload(
                  dealId,
                  extraFiles[index],
                  'MANAGER_ATTACHMENT',
                  uploadIndex,
                  filesToUpload.length,
                );

                uploadIndex++;
              }


              setProgress(96);

              await submitInvoiceRequest(
                dealId,
                {
                  actorId:
                    user.id,
                  urgent:
                    requestUrgent,
                },
              );

              setProgress(99);

              await reload(false);
            },
        });

        setRequestIncomingInvoice(null);
        setRequestExtraFiles([]);
        setRequestUrgent(false);
        setInvoiceRequestEditOpen(false);

        return;
      }


      await submitInvoiceRequest(
        dealId,
        {
          actorId:
            user.id,
          urgent:
            requestUrgent,
        },
      );


      setRequestIncomingInvoice(null);
      setRequestExtraFiles([]);
      setRequestUrgent(false);
      setInvoiceRequestEditOpen(false);

      await reload(false);


    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );

    } finally {
      setSaving(false);
    }
  }


  async function withdrawRequest() {

    setSaving(true);
    setError('');


    try {
      await withdrawInvoiceRequest(
        dealId,
        user.id,
      );

      setWithdrawConfirmOpen(false);
      setInvoiceRequestEditOpen(true);
      await reload(false);

    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );

    } finally {
      setSaving(false);
    }
  }


  async function saveInvoiceData() {

    if (!current) {
      return;
    }


    const parsed =
      parsedManagerAmount();


    if (
      managerAmount.trim() &&
      parsed === undefined
    ) {

      setError(
        'Проверьте сумму счёта'
      );

      return;
    }


    setSaving(true);
    setError('');


    try {

      const currentAmount =
        current.amount ===
          undefined ||
        current.amount ===
          null

          ? undefined

          : Number(
              current.amount
            );


      if (
        (
          parsed !== undefined &&
          (
            currentAmount ===
              undefined ||

            Math.abs(
              currentAmount -
              parsed
            ) > 0.001
          )
        ) ||

        (
          parsed === undefined &&
          currentAmount !==
            undefined
        )
      ) {

        await updateInvoiceAmount(
          dealId,
          current.id,
          {
            amount:
              parsed,

            actorId:
              user.id,
          },
        );
      }


      const currentShipment =
        deal?.plannedShipmentAt
          ?.slice(0, 10) ||
        '';


      if (
        shipmentDate !==
        currentShipment
      ) {

        await updateShipmentDate(
          dealId,
          {
            plannedShipmentAt:
              shipmentDate ||
              undefined,

            actorId:
              user.id,
          },
        );
      }


      setInvoiceMenuOpen(
        false
      );


      await reload(false);


    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );


    } finally {

      setSaving(false);
    }
  }


  async function confirm() {

    if (!current) {
      return;
    }


    const parsed =
      parsedManagerAmount();


    if (
      managerAmount.trim() &&
      parsed === undefined
    ) {

      setError(
        'Проверьте сумму счёта'
      );

      return;
    }


    setSaving(true);
    setError('');


    try {

      const currentAmount =
        current.amount ===
          undefined ||
        current.amount === null

          ? undefined

          : Number(
              current.amount
            );


      if (
        parsed !== undefined &&
        (
          currentAmount ===
            undefined ||

          Math.abs(
            currentAmount -
            parsed
          ) > 0.001
        )
      ) {

        await updateInvoiceAmount(
          dealId,
          current.id,
          {
            amount: parsed,
            actorId: user.id,
          },
        );
      }


      await confirmInvoice(
        dealId,
        current.id,
        user.id,
      );


      await reload(false);


    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );


    } finally {

      setSaving(false);
    }
  }


  async function sendCorrection() {

    if (!current) {
      return;
    }


    const activeDeal =
      deal;


    if (!activeDeal) {
      return;
    }


    const hasFiles =
      Boolean(
        correctionPrimaryFile
      ) ||
      correctionFiles.length > 0;


    const correctionText =
      correction.trim() ||
      (
        hasFiles
          ? 'Приложены документы для корректировки'
          : ''
      );


    if (!correctionText) {
      return;
    }


    setSaving(true);
    setError('');


    try {

      const task:
        any =
        await requestInvoiceCorrection(
          dealId,
          current.id,
          {
            actorId:
              user.id,

            comment:
              correctionText,

            urgent,

            sellerType:
              correctionSellerType,
          },
        );


      const filesToUpload =
        [
          ...(
            correctionPrimaryFile
              ? [correctionPrimaryFile]
              : []
          ),
          ...correctionFiles,
        ];


      if (
        filesToUpload.length > 0
      ) {

        const primaryFile =
          correctionPrimaryFile;


        const extraFiles =
          [...correctionFiles];


        startBackgroundUploadJob({

          taskId:
            task.id,

          title:
            'Отправляем документы на корректировку',

          subtitle:
            activeDeal.clientName,

          files:
            filesToUpload,


          run:
            async ({
              upload,
              setProgress,
            }) => {

              let uploadIndex = 0;


              if (primaryFile) {

                await upload(
                  activeDeal.id,
                  primaryFile,

                  'CORRECTION_PRIMARY_' +
                  task.id,

                  uploadIndex,
                  filesToUpload.length,
                );


                uploadIndex++;
              }


              for (
                let index = 0;
                index <
                  extraFiles.length;
                index++
              ) {

                await upload(
                  activeDeal.id,

                  extraFiles[
                    index
                  ],

                  'CORRECTION_ATTACHMENT_' +
                  task.id,

                  uploadIndex,
                  filesToUpload.length,
                );


                uploadIndex++;
              }


              setProgress(99);
            },
        });
      }


      setCorrection('');
      setCorrectionPrimaryFile(null);
      setCorrectionFiles([]);
      setUrgent(false);
      setCorrectionOpen(false);


      await reload(false);


    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );


    } finally {

      setSaving(false);
    }
  }

  return (

    <section className="content form">

      <button
        className="backLink"
        onClick={onBack}
      >
        ← К сделкам
      </button>


      <div className="dealOverview">

        <div className="dealOverviewHead">

          <div>
            <div className="dealOverviewMeta">
              <span>
                ЗК-{deal.internalNumber}
              </span>

              <span>
                {
                  deal.createdAt
                    ? 'Создан ' +
                      new Date(
                        deal.createdAt
                      ).toLocaleString(
                        'ru-RU',
                        {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )
                    : 'Дата создания не указана'
                }
              </span>
            </div>

            <h2>
              {
                current
                  ? sellerLabels[
                      current.sellerType ||
                      deal.sellerType
                    ] +
                    '-' +
                    current.number
                  : 'Счёт готовится'
              }
            </h2>
          </div>

          <div className="dealOverviewInvoiceStatus">
            <span>
              Статус счёта
            </span>
            <b>
              {
                current
                  ? statusLabel(
                      current.status
                    )
                  : invoiceRequestTask?.status ===
                      'NEED_DATA'
                    ? 'Нужны данные'
                    : 'Ожидаем счёт'
              }
            </b>
          </div>

        </div>


        <div className="dealOverviewGrid">

          <button
            type="button"
            className="dealMetric dealMetricButton"
            disabled={!current || !canManageDeal}
            onClick={() =>
              setQuickEdit(
                quickEdit === 'invoiceAmount'
                  ? null
                  : 'invoiceAmount'
              )
            }
          >
            <span>Сумма счёта</span>
            <b>
              {
                current?.amount
                  ? money(
                      current.amount
                    )
                  : 'Не указана'
              }
            </b>
            {current && canManageDeal && (
              <em>Изменить / скопировать</em>
            )}
          </button>


          <button
            type="button"
            className="dealMetric dealMetricButton"
            disabled={
              supplierPurchases.length === 0 ||
              !canManageDeal
            }
            onClick={() =>
              setQuickEdit(
                quickEdit === 'incomingAmount'
                  ? null
                  : 'incomingAmount'
              )
            }
          >
            <span>Входящая сумма</span>
            <b>
              {
                incomingTotal > 0
                  ? money(incomingTotal)
                  : 'Не указана'
              }
            </b>
            {supplierPurchases.length > 0 &&
              canManageDeal && (
              <em>Изменить / скопировать</em>
            )}
          </button>


          <button
            type="button"
            className="dealMetric dealMetricButton"
            disabled={!canManageDeal}
            onClick={() =>
              setQuickEdit(
                quickEdit === 'shipmentDate'
                  ? null
                  : 'shipmentDate'
              )
            }
          >
            <span>Дата доставки</span>
            <b>
              {
                deal.plannedShipmentAt
                  ? new Date(
                      deal.plannedShipmentAt
                    ).toLocaleDateString(
                      'ru-RU'
                    )
                  : 'Не указана'
              }
            </b>
            {canManageDeal && (
              <em>Изменить / скопировать</em>
            )}
          </button>


          <div className="dealMetric">
            <span>Поставщик</span>
            <b>{supplierSummary}</b>
          </div>


          <div className="dealMetric">
            <span>Статус оплаты</span>
            <b>
              {
                paymentStatusLabel(
                  deal.paymentStatus
                )
              }
            </b>
          </div>


          <div className="dealMetric dealMetricMuted">
            <span>От кого выставлен</span>
            <b>
              {
                sellerLabels[
                  current?.sellerType ||
                  deal.sellerType
                ]
              }
            </b>
          </div>

        </div>


        {quickEdit === 'invoiceAmount' &&
          current && (

          <div className="dealQuickEditor">

            <Field title="Сумма счёта">
              <input
                inputMode="decimal"
                value={managerAmount}
                onChange={(e) =>
                  setManagerAmount(
                    formatMoneyInput(
                      e.target.value
                    )
                  )
                }
                placeholder="215 000"
              />
            </Field>

            <div className="dealQuickActions">
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  copyDealValue(
                    current.amount
                      ? money(current.amount)
                      : ''
                  )
                }
              >
                Скопировать
              </button>

              <button
                type="button"
                className="primary"
                disabled={saving}
                onClick={saveQuickInvoiceAmount}
              >
                {saving ? 'Сохраняем…' : 'Сохранить'}
              </button>

              <button
                type="button"
                className="dealQuickClose"
                onClick={() =>
                  setQuickEdit(null)
                }
              >
                ×
              </button>
            </div>

          </div>

        )}


        {quickEdit === 'incomingAmount' && (

          <div className="dealQuickEditor">

            {editableIncomingPurchase ? (
              <>
                <Field title="Входящая сумма">
                  <input
                    inputMode="decimal"
                    value={incomingAmountDraft}
                    onChange={(e) =>
                      setIncomingAmountDraft(
                        formatMoneyInput(
                          e.target.value
                        )
                      )
                    }
                    placeholder="180 000"
                  />
                </Field>

                <div className="dealQuickActions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      copyDealValue(
                        incomingTotal > 0
                          ? money(incomingTotal)
                          : ''
                      )
                    }
                  >
                    Скопировать
                  </button>

                  <button
                    type="button"
                    className="primary"
                    disabled={saving}
                    onClick={saveQuickIncomingAmount}
                  >
                    {saving ? 'Сохраняем…' : 'Сохранить'}
                  </button>

                  <button
                    type="button"
                    className="dealQuickClose"
                    onClick={() =>
                      setQuickEdit(null)
                    }
                  >
                    ×
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="dealQuickMessage">
                  {
                    supplierPurchases.length > 1
                      ? 'Сумма рассчитана по нескольким поставщикам. Измените нужную закупку в блоке «Поставщики».'
                      : 'Сначала добавьте поставщика и сумму закупки.'
                  }
                </div>

                <div className="dealQuickActions">
                  <button
                    type="button"
                    className="secondary"
                    disabled={incomingTotal <= 0}
                    onClick={() =>
                      copyDealValue(
                        incomingTotal > 0
                          ? money(incomingTotal)
                          : ''
                      )
                    }
                  >
                    Скопировать
                  </button>

                  <button
                    type="button"
                    className="dealQuickClose"
                    onClick={() =>
                      setQuickEdit(null)
                    }
                  >
                    ×
                  </button>
                </div>
              </>
            )}

          </div>

        )}


        {quickEdit === 'shipmentDate' && (

          <div className="dealQuickEditor">

            <Field title="Дата доставки">
              <input
                type="date"
                value={shipmentDate}
                onChange={(e) =>
                  setShipmentDate(
                    e.target.value
                  )
                }
              />
            </Field>

            <div className="dealQuickActions">
              <button
                type="button"
                className="secondary"
                disabled={!deal.plannedShipmentAt}
                onClick={() =>
                  copyDealValue(
                    deal.plannedShipmentAt
                      ? new Date(
                          deal.plannedShipmentAt
                        ).toLocaleDateString(
                          'ru-RU'
                        )
                      : ''
                  )
                }
              >
                Скопировать
              </button>

              <button
                type="button"
                className="primary"
                disabled={saving}
                onClick={saveQuickShipmentDate}
              >
                {saving ? 'Сохраняем…' : 'Сохранить'}
              </button>

              <button
                type="button"
                className="dealQuickClose"
                onClick={() =>
                  setQuickEdit(null)
                }
              >
                ×
              </button>
            </div>

          </div>

        )}

      </div>


      <div className="dealInfoBox">

        <div className="dealInfoHead">

          <strong>
            Клиент
          </strong>


          {canManageDeal && (

            <button
              type="button"
              className="dealInfoEditButton"
              aria-label="Редактировать клиента"
              title="Редактировать клиента"

              onClick={() =>
                setDealInfoOpen(
                  (value) =>
                    !value
                )
              }
            >
              {dealInfoOpen ? '×' : '•••'}
            </button>

          )}

        </div>


        {!dealInfoOpen ? (

          <div className="dealInfoView">

            <div className="dealInfoRow dealInfoCompany">

              <span>
                Компания
              </span>

              <b>
                {deal.clientName}
              </b>

            </div>


            <div className="dealInfoRow">

              <span>
                Контактное лицо
              </span>

              <b>
                {
                  deal.contactName ||
                  'Не указано'
                }
              </b>

            </div>


            <div className="dealInfoRow">

              <span>
                Телефон заказчика
              </span>


              {deal.clientPhone ? (

                <div className="dealPhoneWrap">

                  <button
                    type="button"
                    className="dealPhoneButton"

                    onClick={() =>
                      setPhoneMenuOpen(
                        (value) =>
                          !value
                      )
                    }
                  >
                    {deal.clientPhone}
                    <b>•••</b>
                  </button>


                  {phoneMenuOpen && (

                    <>

                      <button
                        type="button"
                        className="popoverDismissLayer"
                        aria-label="Закрыть меню"
                        onClick={() =>
                          setPhoneMenuOpen(false)
                        }
                      />

                      <div
                        className="dealPhoneMenu"
                        onClick={() =>
                          setPhoneMenuOpen(false)
                        }
                      >

                      <a
                        href={
                          'tel:+' +
                          normalizedPhone()
                        }
                      >
                        Позвонить
                      </a>


                      <a
                        href={
                          'https://t.me/+' +
                          normalizedPhone()
                        }

                        target="_blank"
                        rel="noreferrer"
                      >
                        Telegram
                      </a>


                      <a
                        href={
                          'https://wa.me/' +
                          normalizedPhone()
                        }

                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>


                      <button
                        type="button"
                        onClick={openMax}
                      >
                        MAX
                      </button>


                      <button
                        type="button"

                        onClick={() => {

                          void navigator
                            .clipboard
                            ?.writeText(
                              deal.clientPhone ||
                              ''
                            );

                          setPhoneMenuOpen(
                            false
                          );
                        }}
                      >
                        Скопировать номер
                      </button>

                      </div>

                    </>

                  )}

                </div>

              ) : (

                <b>Не указан</b>

              )}

            </div>


            <div className="dealInfoRow dealInfoComment">

              <span>
                Комментарий менеджера
              </span>

              <b>
                {
                  deal.managerComment ||
                  'Нет комментария'
                }
              </b>

            </div>


            <div className="dealInfoRow dealInfoAddress">

              <span>
                Адреса доставки
              </span>


              {
                deal.deliveryAddresses &&
                deal.deliveryAddresses
                  .length > 0 ? (

                <div className="deliveryAddressList">

                  {deal.deliveryAddresses.map(
                    (
                      address,
                      index,
                    ) => (

                    <b
                      key={
                        address +
                        index
                      }
                    >
                      {address}
                    </b>

                  ))}

                </div>

              ) : (

                <b>
                  Не указаны
                </b>

              )}

            </div>

          </div>

        ) : (

          <div className="dealInfoForm">

            <Field title="Компания">

              <input
                value={editClientName}
                onChange={(e) =>
                  setEditClientName(
                    e.target.value
                  )
                }
                placeholder="ООО «Главолснаб»"
              />

            </Field>


            <Field title="Контактное лицо">

              <input
                value={
                  editContactName
                }

                onChange={(e) =>
                  setEditContactName(
                    e.target.value
                  )
                }

                placeholder="Имя заказчика"
              />

            </Field>


            <Field title="Телефон заказчика">

              <input
                value={
                  editClientPhone
                }

                onChange={(e) =>
                  setEditClientPhone(
                    e.target.value
                  )
                }

                placeholder="+7..."
              />

            </Field>


            <Field title="Комментарий менеджера">

              <textarea
                rows={3}

                value={
                  editManagerComment
                }

                onChange={(e) =>
                  setEditManagerComment(
                    e.target.value
                  )
                }

                placeholder="Например: созвониться перед отгрузкой"
              />

            </Field>


            <div className="deliveryAddressEditor">

              <div className="deliveryAddressEditorHead">

                <span>
                  Адреса доставки
                </span>

                <button
                  type="button"
                  className="secondary compactButton"

                  onClick={
                    addDeliveryAddress
                  }
                >
                  + Адрес
                </button>

              </div>


              {
                editAddresses.length ===
                  0 && (

                <div className="microcopy">
                  Адреса пока не добавлены
                </div>

              )}


              {editAddresses.map(
                (
                  address,
                  index,
                ) => (

                <div
                  className="deliveryAddressEditRow"
                  key={index}
                >

                  <input
                    value={address}

                    onChange={(e) => {

                      const value =
                        e.target.value;


                      setEditAddresses(
                        (current) =>
                          current.map(
                            (
                              item,
                              itemIndex,
                            ) =>
                              itemIndex ===
                                index
                                ? value
                                : item
                          )
                      );
                    }}

                    placeholder="Адрес доставки"
                  />


                  <button
                    type="button"
                    className="deliveryAddressRemove"

                    onClick={() =>
                      removeDeliveryAddress(
                        index
                      )
                    }
                  >
                    ×
                  </button>

                </div>

              ))}

            </div>


            <button
              type="button"
              className="primary wide"

              disabled={saving}

              onClick={
                saveDealInfo
              }
            >
              {
                saving
                  ? 'Сохраняем…'
                  : 'Сохранить информацию'
              }
            </button>

          </div>

        )}

      </div>


      {current ? (

        <InvoiceBlock
          invoice={current}
          sellerType={
            current.sellerType ||
            deal.sellerType
          }
        />

      ) : (

        <div className="infoBox">

          <strong>
            Счёт ещё не готов
          </strong>

          <p>
            Бухгалтерия пока не
            загрузила клиентский счёт.
          </p>

        </div>

      )}


      {!current &&
        canManageDeal && (

        <div className="invoiceRequestManagerBox">

          {!invoiceRequestEditOpen &&
            invoiceRequestTask?.status !== 'NEED_DATA' && (

          <div className="invoiceRequestSellerSummary">

            <div>
              <span>
                От кого выставляем
              </span>

              <strong>
                {sellerLabels[deal.sellerType]}
              </strong>
            </div>


            {invoiceRequestTask &&
              invoiceRequestTask.status !== 'NEED_DATA' && (

              <button
                type="button"
                className="secondary compactButton"
                onClick={() =>
                  setInvoiceRequestEditOpen(
                    (value) => !value
                  )
                }
              >
                {
                  invoiceRequestEditOpen
                    ? 'Закрыть'
                    : 'Изменить'
                }
              </button>

            )}

          </div>

          )}


          {invoiceRequestEditOpen &&
            invoiceRequestTask &&
            invoiceRequestTask.status !== 'NEED_DATA' && (

            <div className="invoiceRequestSellerEditor">

              {invoiceRequestTask.status ===
                'IN_PROGRESS' && (

                <div className="invoiceRequestEditWarning">
                  Бухгалтер уже работает. Изменение «от кого» сразу отобразится в задаче.
                </div>

              )}


              <div className="segmented">

                {(['ST', 'MSM', 'IP'] as SellerType[]).map(
                  (type) => (

                  <button
                    type="button"
                    key={type}
                    className={
                      requestSellerType === type
                        ? 'selected'
                        : ''
                    }
                    onClick={() =>
                      setRequestSellerType(type)
                    }
                  >
                    {sellerLabels[type]}
                  </button>

                ))}

              </div>


              <div className="actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={saving}
                  onClick={() => {
                    setRequestSellerType(
                      deal.sellerType
                    );
                    setInvoiceRequestEditOpen(false);
                  }}
                >
                  Отмена
                </button>

                <button
                  type="button"
                  className="primary"
                  disabled={
                    saving ||
                    requestSellerType === deal.sellerType
                  }
                  onClick={saveInvoiceRequestSeller}
                >
                  {
                    saving
                      ? 'Сохраняем…'
                      : 'Сохранить'
                  }
                </button>
              </div>

            </div>

          )}


          {currentCustomerInvoice &&
            !invoiceRequestEditOpen &&
            invoiceRequestTask?.status !== 'NEED_DATA' && (

            <div className="requestPreviousIncoming invoiceRequestIncomingCompact">
              <span>
                Входящий счёт, отправленный бухгалтерии
              </span>

              <div className="versionRow">
                <div>
                  <b>
                    {currentCustomerInvoice.originalName}
                  </b>
                  <span>
                    Актуальный входящий документ
                  </span>
                </div>

                <a
                  href={
                    dealFileUrl(
                      currentCustomerInvoice.id
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть
                </a>
              </div>
            </div>

          )}


          {invoiceRequestUploadJob && (

            <div
              className={
                'invoiceRequestUploadState invoiceRequestUpload-' +
                invoiceRequestUploadJob.status.toLowerCase()
              }
            >

              <div className="invoiceRequestUploadTop">
                <strong>
                  {
                    invoiceRequestUploadJob.status === 'SUCCESS'
                      ? '✓ ' +
                        (invoiceRequestUploadJob.successTitle ||
                          invoiceRequestUploadJob.title)
                      : invoiceRequestUploadJob.status === 'ERROR'
                        ? 'Не удалось отправить документы'
                        : invoiceRequestUploadJob.title
                  }
                </strong>

                <b>
                  {invoiceRequestUploadJob.progress}%
                </b>
              </div>

              <div className="invoiceRequestUploadBar">
                <span
                  style={{
                    width:
                      invoiceRequestUploadJob.progress + '%',
                  }}
                />
              </div>

              {invoiceRequestUploadJob.status === 'RUNNING' && (
                <span>
                  {
                    invoiceRequestUploadJob.currentFile
                      ? 'Сейчас: ' +
                        invoiceRequestUploadJob.currentFile
                      : 'Сохраняем данные и отправляем запрос…'
                  }
                </span>
              )}

              {invoiceRequestUploadJob.status === 'ERROR' &&
                invoiceRequestUploadJob.error && (
                  <span>
                    {invoiceRequestUploadJob.error}
                  </span>
                )}

            </div>

          )}


          {(
            invoiceRequestTask?.status ===
              'NEED_DATA' ||
            (
              !invoiceRequestTask &&
              invoiceRequestEditOpen
            )
          ) ? (

            <>

              {invoiceRequestTask?.status === 'NEED_DATA' ? (

                <>
                  <div className="invoiceRequestReturnedHead">
                    <div>
                      <strong>
                        Бухгалтерия вернула запрос
                      </strong>

                      <span>
                        Исправьте данные и отправьте ту же задачу повторно.
                      </span>
                    </div>

                    <b>Нужны данные</b>
                  </div>


                  <div className="invoiceReturnReason">
                    <span>Причина</span>
                    <strong>
                      {
                        String(
                          latestInvoiceReturn
                            ?.newValue
                            ?.reasonLabel ||
                          'Не указана'
                        )
                      }
                    </strong>

                    {latestInvoiceReturn?.reason && (
                      <p>
                        {latestInvoiceReturn.reason}
                      </p>
                    )}
                  </div>
                </>

              ) : (

                <div className="invoiceRequestReturnedHead invoiceRequestWithdrawnHead">
                  <div>
                    <strong>
                      Запрос отозван
                    </strong>

                    <span>
                      Внесите нужные изменения и отправьте запрос бухгалтерии заново.
                    </span>
                  </div>

                  <b>Редактирование</b>
                </div>

              )}


              <div className="invoiceRequestRepairForm">

                <Field title="От кого выставляем">
                  <div className="segmented">
                    {(['ST', 'MSM', 'IP'] as SellerType[]).map(
                      (type) => (
                      <button
                        type="button"
                        key={type}
                        className={
                          requestSellerType === type
                            ? 'selected'
                            : ''
                        }
                        onClick={() =>
                          setRequestSellerType(type)
                        }
                      >
                        {sellerLabels[type]}
                      </button>
                    ))}
                  </div>
                </Field>


                <Field title="На кого выставлять">
                  <input
                    value={requestClientName}
                    onChange={(e) =>
                      setRequestClientName(
                        e.target.value
                      )
                    }
                  />
                </Field>


                <div className="inline">
                  <Field title="Условия">
                    <select
                      value={requestMarginMode}
                      onChange={(e) =>
                        setRequestMarginMode(
                          e.target.value
                        )
                      }
                    >
                      <option value="PERCENT">
                        ± %
                      </option>
                      <option value="TOTAL_PLUS">
                        + к сумме
                      </option>
                      <option value="UNIT_PLUS">
                        + за единицу
                      </option>
                      <option value="FINAL">
                        Итоговая цена
                      </option>
                    </select>
                  </Field>

                  <Field title="Значение">
                    <input
                      inputMode="decimal"
                      value={requestMarginValue}
                      onChange={(e) =>
                        setRequestMarginValue(
                          e.target.value
                        )
                      }
                      placeholder="-7 или +4"
                    />
                  </Field>
                </div>


                <Field title="Комментарий бухгалтерии">
                  <textarea
                    rows={3}
                    value={requestAccountingComment}
                    onChange={(e) =>
                      setRequestAccountingComment(
                        e.target.value
                      )
                    }
                  />
                </Field>


                <div className="requestPreviousIncoming">

                  <span>
                    Входящий счёт, который уже был отправлен бухгалтерии
                  </span>

                  {currentCustomerInvoice ? (

                    <div className="versionRow">

                      <div>
                        <b>
                          {currentCustomerInvoice.originalName}
                        </b>

                        <span>
                          Текущий исходный документ
                        </span>
                      </div>

                      <a
                        href={
                          dealFileUrl(
                            currentCustomerInvoice.id
                          )
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Открыть
                      </a>

                    </div>

                  ) : (

                    <div className="requestPreviousIncomingEmpty">
                      Входящий счёт ранее не прикладывался
                    </div>

                  )}

                </div>


                <Field title="Новый входящий счёт, если нужен">
                  <SingleFilePicker
                    file={requestIncomingInvoice}
                    onChange={setRequestIncomingInvoice}
                    title="+ Прикрепить новый входящий счёт"
                    accept="application/pdf,image/*"
                  />
                </Field>


                <Field title="Дополнительные документы / реквизиты">
                  <MultiFilePicker
                    files={requestExtraFiles}
                    onChange={setRequestExtraFiles}
                    title="+ Прикрепить документы"
                  />
                </Field>


                <label className="urgentToggle">
                  <input
                    type="checkbox"
                    checked={requestUrgent}
                    onChange={(e) =>
                      setRequestUrgent(
                        e.target.checked
                      )
                    }
                  />
                  <span>Срочно</span>
                </label>


                <button
                  type="button"
                  className="primary wide"
                  disabled={saving}
                  onClick={sendInvoiceRequestAgain}
                >
                  {
                    saving
                      ? 'Отправляем…'
                      : invoiceRequestTask?.status === 'NEED_DATA'
                        ? 'Сохранить и повторно отправить'
                        : 'Сохранить и отправить бухгалтерии'
                  }
                </button>


                {invoiceRequestTask?.status === 'NEED_DATA' ? (
                  <button
                    type="button"
                    className="purchaseCancelButton"
                    disabled={saving}
                    onClick={() =>
                      setWithdrawConfirmOpen(true)
                    }
                  >
                    Отозвать запрос на счёт
                  </button>
                ) : (
                  <button
                    type="button"
                    className="secondary wide"
                    disabled={saving}
                    onClick={() =>
                      setInvoiceRequestEditOpen(false)
                    }
                  >
                    Отмена
                  </button>
                )}

              </div>
            </>

          ) : invoiceRequestTask ? (

            <div className="invoiceRequestStateRow">
              <div>
                <strong>
                  {
                    invoiceRequestTask.status ===
                      'IN_PROGRESS'
                      ? 'Бухгалтер выставляет счёт'
                      : 'Запрос отправлен бухгалтерии'
                  }
                </strong>

                <span>
                  {
                    invoiceRequestTask.status ===
                      'IN_PROGRESS'
                      ? 'Задача уже взята в работу.'
                      : 'Все загруженные документы доступны бухгалтерии.'
                  }
                </span>
              </div>

              {invoiceRequestTask.status !==
                'IN_PROGRESS' && (
                <button
                  type="button"
                  className="purchaseCancelButton invoiceRequestWithdrawCompact"
                  disabled={saving}
                  onClick={() =>
                    setWithdrawConfirmOpen(true)
                  }
                >
                  Отозвать
                </button>
              )}
            </div>

          ) : (

            <div className="invoiceRequestStateRow">
              <div>
                <strong>
                  Запрос на счёт не активен
                </strong>
                <span>
                  Его можно отправить бухгалтерии снова.
                </span>
              </div>

              <button
                type="button"
                className="primary"
                disabled={
                  saving ||
                  invoiceRequestUploadJob?.status === 'RUNNING'
                }
                onClick={() =>
                  setInvoiceRequestEditOpen(true)
                }
              >
                Редактировать и отправить снова
              </button>
            </div>

          )}


          {withdrawConfirmOpen && (
            <div
              className="appModalBackdrop"
              onClick={() =>
                setWithdrawConfirmOpen(false)
              }
            >
              <div
                className="appModal"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                <strong>
                  Отозвать запрос на счёт?
                </strong>

                <p>
                  Если бухгалтер ещё не начал работу, задача будет отменена. Сама сделка и документы останутся в приложении.
                </p>

                <div className="appModalActions">
                  <button
                    type="button"
                    className="secondary"
                    disabled={saving}
                    onClick={() =>
                      setWithdrawConfirmOpen(false)
                    }
                  >
                    Не отзывать
                  </button>

                  <button
                    type="button"
                    className="dangerButton"
                    disabled={saving}
                    onClick={withdrawRequest}
                  >
                    {
                      saving
                        ? 'Отзываем…'
                        : 'Отозвать'
                    }
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      )}


      {current &&
        canManageInvoice &&
        current.status !== 'CORRECTION_REQUESTED' && (

        <div
          className={
            'invoiceDecisionBar' +
            (!canConfirm
              ? ' invoiceDecisionBarSingle'
              : '')
          }
        >

          <button
            type="button"
            className="secondary"
            disabled={saving}
            onClick={openCorrectionEditor}
          >
            Скорректировать
          </button>

          {canConfirm && (
            <button
              type="button"
              className="primary"
              disabled={saving}
              onClick={confirm}
            >
              {saving ? 'Сохраняем…' : 'Всё верно'}
            </button>
          )}

        </div>

      )}


      {current?.status ===
        'CORRECTION_REQUESTED' && (

        <div className="infoBox correctionPending">

          <strong>
            Счёт отправлен на корректировку
          </strong>

          <p>
            Текущая версия остаётся
            видна в истории, но после
            загрузки новой версии станет
            неактуальной.
          </p>

        </div>

      )}


      {correctionOpen &&
        current && (

        <div className="correctionBox">

          <div className="correctionTitle">

            <div>

              <strong>
                Корректировка счёта
              </strong>

              <span>
                Текущий счёт {sellerLabels[current.sellerType || deal.sellerType]}-{current.number}. Новую версию выставить от {sellerLabels[correctionSellerType]}.
              </span>

            </div>


            <button
              type="button"
              className="invoiceMenuClose"

              onClick={() =>
                setCorrectionOpen(
                  false
                )
              }
            >
              ×
            </button>

          </div>


          <Field title="От кого выставляем">

            <div className="segmented">
              {(['ST', 'MSM', 'IP'] as SellerType[]).map(
                (type) => (
                <button
                  type="button"
                  key={type}
                  className={
                    correctionSellerType === type
                      ? 'selected'
                      : ''
                  }
                  onClick={() =>
                    setCorrectionSellerType(type)
                  }
                >
                  {sellerLabels[type]}
                </button>
              ))}
            </div>

          </Field>


          <Field title="Что нужно изменить">

            <textarea
              rows={4}

              value={correction}

              onChange={(e) =>
                setCorrection(
                  e.target.value
                )
              }

              placeholder="Например: изменить количество или стоимость"
            />

          </Field>


          <Field title="Основной входящий счёт">

            <SingleFilePicker
              file={correctionPrimaryFile}
              onChange={setCorrectionPrimaryFile}
              title="+ Выбрать основной счёт"
              accept="application/pdf,image/*"
            />

            <span className="fieldHint">
              Бухгалтеру ориентироваться по этому файлу
            </span>

          </Field>


          <Field title="Дополнительные документы">

            <MultiFilePicker
              files={correctionFiles}
              onChange={
                setCorrectionFiles
              }
              title="+ Прикрепить дополнительно"
            />

          </Field>


          <label className="urgentToggle">

            <input
              type="checkbox"

              checked={urgent}

              onChange={(e) =>
                setUrgent(
                  e.target.checked
                )
              }
            />

            <span>
              Срочная корректировка
            </span>

          </label>


          <button
            className="primary wide"
            disabled={
              saving ||
              (
                !correction.trim() &&
                !correctionPrimaryFile &&
                correctionFiles.length ===
                  0
              )
            }

            onClick={sendCorrection}
          >

            {
              saving
                ? 'Отправляем…'
                : 'Отправить на корректировку'
            }

          </button>

        </div>

      )}


      <PaymentBlock
        deal={deal}
        user={user}
        onChanged={() =>
          reload(false)
        }
      />


      <PurchasesBlock
        deal={deal}
        user={user}
        onChanged={() =>
          reload(false)
        }
      />


      <div className="infoBox">

        <strong>
          Исходный запрос
        </strong>

        <p>
          {
            deal.requestText ||
            'Не указан'
          }
        </p>

        {deal.accountingComment && (

          <p>

            <b>
              Комментарий бухгалтерии:
            </b>

            {' '}

            {deal.accountingComment}

          </p>

        )}

      </div>


      {deal.invoices.length > 0 && (

        <div className="infoBox">

          <strong>
            Версии счёта
          </strong>


          <div className="versionList">

            {[...deal.invoices]
              .sort(
                (a, b) =>
                  Number(
                    b.version || 0
                  ) -
                  Number(
                    a.version || 0
                  )
              )
              .map(
                (invoice) => (

                <InvoiceVersion
                  key={invoice.id}
                  invoice={invoice}
                  sellerType={
                    invoice.sellerType ||
                    deal.sellerType
                  }
                />

              ))}

          </div>

        </div>

      )}


      {deal.auditEvents &&
        deal.auditEvents.length >
          0 && (

        <div className="infoBox">

          <strong>
            Последние события
          </strong>


          <div className="historyList">

            {deal.auditEvents
              .slice(0, 12)
              .map(
                (event) => (

                <div key={event.id}>

                  <span>
                    {
                      new Date(
                        event.createdAt
                      )
                        .toLocaleString(
                          'ru-RU'
                        )
                    }
                  </span>


                  <b>
                    {
                      auditLabel(
                        event.action,
                        event.oldValue,
                        event.newValue
                      )
                    }
                  </b>


                  {event.reason && (

                    <em>
                      {event.reason}
                    </em>

                  )}

                </div>

              ))}

          </div>

        </div>

      )}


      {error && (

        <div className="error">
          {error}
        </div>

      )}

    </section>
  );
}


function InvoiceBlock({
  invoice,
  sellerType,
}: {
  invoice: Invoice;
  sellerType: SellerType;
}) {

  return (

    <div className="invoiceBlock">


      <div className="currentVersionLabel">
        Версия {invoice.version || 1}
        {' · '}
        Текущая
      </div>


      <div>

        <span>
          Счёт
        </span>

        <strong>
          {
            sellerLabels[
              sellerType
            ]
          }-{invoice.number}
        </strong>

      </div>


      <div>

        <span>
          Сумма
        </span>

        <strong>
          {
            invoice.amount
              ? money(
                  invoice.amount
                )
              : 'не указана'
          }
        </strong>

      </div>


      <div>

        <span>
          Дата счёта
        </span>

        <strong>

          {
            invoice.invoiceDate

              ? new Date(
                  invoice.invoiceDate
                )
                  .toLocaleDateString(
                    'ru-RU'
                  )

              : 'не указана'
          }

        </strong>

      </div>


      {invoice.fileId && (

        <a
          className="fileButton"

          href={
            dealFileUrl(
              invoice.fileId
            )
          }

          target="_blank"
          rel="noreferrer"
        >
          Открыть PDF
        </a>

      )}

    </div>
  );
}


function InvoiceVersion({
  invoice,
  sellerType,
}: {
  invoice: Invoice;
  sellerType: SellerType;
}) {

  let stateLabel =
    'Не актуален';


  if (invoice.isCurrent) {

    if (
      invoice.status ===
      'CONFIRMED'
    ) {

      stateLabel =
        'Текущая · подтверждён';

    } else if (
      invoice.status ===
      'CORRECTION_REQUESTED'
    ) {

      stateLabel =
        'Текущая · на корректировке';

    } else {

      stateLabel =
        'Текущая · ожидает проверки';
    }

  } else if (
    invoice.status ===
    'CORRECTION_REQUESTED'
  ) {

    stateLabel =
      'Скорректирован · не актуален';
  }


  return (

    <div
      className={
        'invoiceVersionRow ' +
        (
          invoice.isCurrent
            ? 'invoiceVersionCurrent'
            : 'invoiceVersionOld'
        )
      }
    >

      <div className="invoiceVersionMain">

        <div className="invoiceVersionTitle">

          <b>
            Версия {invoice.version || 1}
          </b>


          <span
            className={
              invoice.isCurrent
                ? 'invoiceVersionBadge current'
                : 'invoiceVersionBadge old'
            }
          >
            {stateLabel}
          </span>

        </div>


        <strong>
          {
            sellerLabels[
              sellerType
            ]
          }-{invoice.number}
        </strong>


        <span>

          {
            invoice.amount
              ? money(
                  invoice.amount
                )
              : 'Сумма не указана'
          }

          {' · '}

          {
            invoice.invoiceDate

              ? new Date(
                  invoice.invoiceDate
                )
                  .toLocaleDateString(
                    'ru-RU'
                  )

              : 'дата не указана'
          }

        </span>

      </div>


      {invoice.fileId && (

        <a
          href={
            dealFileUrl(
              invoice.fileId
            )
          }

          target="_blank"
          rel="noreferrer"
        >
          Открыть
        </a>

      )}

    </div>
  );
}


function PaymentBlock({ deal, user, onChanged }: { deal: Deal; user: CurrentUser; onChanged: () => Promise<void> }) {
  const [editingStatus, setEditingStatus] = useState(false);
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>(deal.paymentStatus);
  const [deferralStartAt, setDeferralStartAt] = useState(deal.deferralStartAt?.slice(0, 10) || '');
  const [deferralEndAt, setDeferralEndAt] = useState(deal.deferralEndAt?.slice(0, 10) || '');
  const [deferralTerms, setDeferralTerms] = useState(deal.deferralTerms || '');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<ClientPaymentMethod>('NONCASH');
  const [comment, setComment] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setStatus(deal.paymentStatus);
    setDeferralStartAt(deal.deferralStartAt?.slice(0, 10) || '');
    setDeferralEndAt(deal.deferralEndAt?.slice(0, 10) || '');
    setDeferralTerms(deal.deferralTerms || '');
  }, [deal.paymentStatus, deal.deferralStartAt, deal.deferralEndAt, deal.deferralTerms]);

  const payments = deal.clientPayments || [];
  const total = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  async function saveStatus() {
    setSaving(true); setError('');
    try {
      await updatePaymentStatus(deal.id, {
        status,
        actorId: user.id,
        deferralStartAt: status === 'DEFERRED' ? deferralStartAt || undefined : undefined,
        deferralEndAt: status === 'DEFERRED' ? deferralEndAt || undefined : undefined,
        deferralTerms: status === 'DEFERRED' ? deferralTerms || undefined : undefined,
      });
      setEditingStatus(false);
      await onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  async function addPayment() {
    
    setSaving(true); setError('');
    try {
      let fileId: string | undefined;
      if (file) {
        const uploaded = await uploadDealFile(deal.id, file, 'CLIENT_PAYMENT');
        fileId = uploaded.id;
      }
      await addClientPayment(deal.id, {
        amount: parseMoneyInput(amount) || 0,
        paidAt,
        method,
        comment: comment.trim() || undefined,
        actorId: user.id,
        fileId,
      });
      setAmount('');
      setComment('');
      setFile(null);
      setAdding(false);
      await onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  return <div className="paymentBox">
    <div className="paymentHead">
      <div>
        <span>Оплата клиента</span>
        <strong>{paymentStatusLabel(deal.paymentStatus)}</strong>
      </div>
      {total > 0 && <b>{money(total)}</b>}
    </div>

    {deal.paymentStatus === 'DEFERRED' && <div className="deferralSummary">
      Отсрочка: {deal.deferralStartAt ? new Date(deal.deferralStartAt).toLocaleDateString('ru-RU') : '—'}
      {' → '}
      {deal.deferralEndAt ? new Date(deal.deferralEndAt).toLocaleDateString('ru-RU') : '—'}
      {deal.deferralTerms && <span>{deal.deferralTerms}</span>}
    </div>}

    <div className="paymentActions">
      <button className="secondary" type="button" onClick={() => setEditingStatus((v) => !v)}>Статус</button>
      <button className="primary" type="button" onClick={() => setAdding((v) => !v)}>+ Платёж</button>
    </div>

    {editingStatus && <div className="paymentForm">
      <Field title="Статус оплаты">
        <select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
          <option value="NO_PREPAYMENT">Без предоплаты</option>
          <option value="WAITING">Ожидаем оплату</option>
          <option value="ADVANCE">Аванс</option>
          <option value="PAID">Оплачен</option>
          <option value="DEFERRED">Отсрочка</option>
        </select>
      </Field>
      {status === 'DEFERRED' && <>
        <div className="inline"><Field title="Начало"><input type="date" value={deferralStartAt} onChange={(e) => setDeferralStartAt(e.target.value)} /></Field><Field title="Окончание"><input type="date" value={deferralEndAt} onChange={(e) => setDeferralEndAt(e.target.value)} /></Field></div>
        <Field title="Условия отсрочки"><textarea rows={2} value={deferralTerms} onChange={(e) => setDeferralTerms(e.target.value)} placeholder="Например: 14 календарных дней после отгрузки" /></Field>
      </>}
      <button className="primary wide" type="button" disabled={saving} onClick={saveStatus}>Сохранить статус</button>
    </div>}

    {adding && <div className="paymentForm">
      <div className="inline"><Field title="Сумма"><input inputMode="decimal" value={amount} onChange={(e) => setAmount(formatMoneyInput(e.target.value))} placeholder="100 000" /></Field><Field title="Дата"><input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /></Field></div>
      <Field title="Способ"><select value={method} onChange={(e) => setMethod(e.target.value as ClientPaymentMethod)}><option value="NONCASH">Безнал</option><option value="CASH">Наличными</option><option value="CARD">Пластик</option><option value="ADVANCE">Аванс</option></select></Field>
      <Field title="Комментарий"><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Например: часть оплаты по счёту" /></Field>
      <Field title="Подтверждение оплаты">
        <SingleFilePicker
          file={file}
          onChange={setFile}
          title="+ Прикрепить подтверждение оплаты"
          accept="application/pdf,image/*"
        />
      </Field>
      <button className="primary wide" type="button" disabled={saving} onClick={addPayment}>Добавить платёж</button>
    </div>}

    {payments.length > 0 && <div className="paymentList">{payments.map((payment) => <div className="paymentRow" key={payment.id}><div><b>{money(payment.amount)}</b><span>{new Date(payment.paidAt).toLocaleDateString('ru-RU')} · {paymentMethodLabel(payment.method)}</span>{payment.comment && <em>{payment.comment}</em>}</div>{payment.fileId && <a href={dealFileUrl(payment.fileId)} target="_blank" rel="noreferrer">Файл</a>}</div>)}</div>}
    {error && <div className="error">{error}</div>}
  </div>;
}

function NewDealForm({ user, onCancel, onCreated }: { user: CurrentUser; onCancel: () => void; onCreated: () => void }) {

  const [sellerType, setSellerType] =
    useState<SellerType>('MSM');

  const [requestMode, setRequestMode] =
    useState<
      'TEXT' |
      'INCOMING_INVOICE'
    >('TEXT');

  const [clientName, setClientName] =
    useState('');

  const [clientPhone, setClientPhone] =
    useState('');

  const [contactName, setContactName] =
    useState('');

  const [deliveryAddress, setDeliveryAddress] =
    useState('');

  const [incomingInvoice, setIncomingInvoice] =
    useState<File | null>(null);

  const [requestText, setRequestText] =
    useState('');

  const [marginMode, setMarginMode] =
    useState('TOTAL_PLUS');

  const [marginValue, setMarginValue] =
    useState('');

  const [
    accountingComment,
    setAccountingComment,
  ] = useState('');

  const [
    managerComment,
    setManagerComment,
  ] = useState('');

  const [
    attachments,
    setAttachments,
  ] = useState<File[]>([]);

  const [uploadStatus, setUploadStatus] =
    useState('');

  const [urgent, setUrgent] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');


  function addAttachments(
    files:
      FileList | null,
  ) {

    if (!files) return;


    const newFiles =
      Array.from(files);


    setAttachments(
      (current) => {

        const combined = [
          ...current,
          ...newFiles,
        ];


        return combined.filter(
          (
            file,
            index,
            all,
          ) =>

            all.findIndex(
              (candidate) =>

                candidate.name ===
                  file.name &&

                candidate.size ===
                  file.size &&

                candidate.lastModified ===
                  file.lastModified

            ) === index
        );
      }
    );
  }


  function removeAttachment(
    index: number,
  ) {

    setAttachments(
      (current) =>

        current.filter(
          (_, fileIndex) =>
            fileIndex !==
            index
        )
    );
  }


  
async function submit(
    e: FormEvent,
  ) {

    e.preventDefault();

    setError('');
    setUploadStatus('');
    setSaving(true);


    try {

      const extraFilesToUpload =
        [...attachments];

      const primaryIncomingInvoice =
        incomingInvoice;

      const filesToUpload =
        [
          ...(primaryIncomingInvoice
            ? [primaryIncomingInvoice]
            : []),
          ...extraFilesToUpload,
        ];


      const deal =
        await createDeal({

          sellerType,

          clientName:
            clientName.trim() ||
            'Тестовый клиент',

          contactName:
            contactName.trim() ||
            undefined,

          clientPhone:
            clientPhone.trim() ||
            undefined,

          deliveryAddresses:
            deliveryAddress.trim()
              ? [deliveryAddress.trim()]
              : undefined,

          requestMode:
            primaryIncomingInvoice
              ? 'INCOMING_INVOICE'
              : 'TEXT',

          requestText:
            requestText.trim() ||
            undefined,

          marginMode,

          marginValue:
            parseMoneyInput(
              marginValue
            ),

          accountingComment:
            accountingComment
              .trim() ||
            undefined,

          managerComment:
            managerComment
              .trim() ||
            undefined,

          urgent,

          deferInvoiceTask:
            true,

          managerId:
            user.id,

          createdById:
            user.id,
        });


      if (
        filesToUpload.length > 0
      ) {

        startBackgroundUploadJob({

          dealId:
            deal.id,

          title:
            'Отправляем бухгалтерии',

          successTitle:
            'Запрос отправлен бухгалтерии',

          subtitle:
            clientName.trim() ||
            'Новая сделка',

          files:
            filesToUpload,


          run:
            async ({
              upload,
              setProgress,
            }) => {

              let uploadIndex = 0;


              if (primaryIncomingInvoice) {

                await upload(
                  deal.id,
                  primaryIncomingInvoice,
                  'CUSTOMER_INVOICE_PRIMARY',
                  uploadIndex,
                  filesToUpload.length,
                );

                uploadIndex++;
              }


              for (
                let index = 0;
                index <
                  extraFilesToUpload.length;
                index++
              ) {

                await upload(
                  deal.id,
                  extraFilesToUpload[
                    index
                  ],
                  'MANAGER_ATTACHMENT',
                  uploadIndex,
                  filesToUpload.length,
                );

                uploadIndex++;
              }


              setProgress(96);

              await submitInvoiceRequest(
                deal.id,
                {
                  actorId:
                    user.id,
                  urgent,
                },
              );

              setProgress(99);
            },
        });

      } else {

        await submitInvoiceRequest(
          deal.id,
          {
            actorId:
              user.id,
            urgent,
          },
        );
      }


      onCreated();


    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : 'Не удалось создать заявку'
      );


    } finally {

      setSaving(false);
    }
  }


  return (

    <form
      className="content form"
      onSubmit={submit}
    >


      <Field title="От кого выставляем">

        <div className="segmented">

          {(['ST', 'MSM', 'IP'] as SellerType[]).map(
            (type) => (

              <button
                type="button"
                key={type}

                className={
                  sellerType === type
                    ? 'selected'
                    : ''
                }

                onClick={() =>
                  setSellerType(
                    type
                  )
                }
              >
                {
                  sellerLabels[
                    type
                  ]
                }
              </button>

            )
          )}

        </div>

      </Field>


      <Field title="Кому продаём">

        <input
          value={clientName}

          onChange={(e) =>
            setClientName(
              e.target.value
            )
          }

          placeholder="ООО «Главолснаб»"
        />

      </Field>


      <Field title="Контактное лицо · необязательно">

        <input
          value={contactName}

          onChange={(e) =>
            setContactName(
              e.target.value
            )
          }

          placeholder="Например: Иван"
        />

      </Field>


      <Field title="Телефон · необязательно">

        <input
          value={clientPhone}

          onChange={(e) =>
            setClientPhone(
              e.target.value
            )
          }

          placeholder="+7…"
        />

      </Field>


      <Field title="Адрес доставки · необязательно">

        <input
          value={deliveryAddress}

          onChange={(e) =>
            setDeliveryAddress(
              e.target.value
            )
          }

          placeholder="Адрес объекта или выгрузки"
        />

      </Field>


      <Field title="Входящий счёт заказчика · если есть">

        <SingleFilePicker
          file={incomingInvoice}
          onChange={setIncomingInvoice}
          title="+ Прикрепить входящий счёт"
          accept="application/pdf,image/*"
        />

      </Field>


      <Field title="Дополнительные вложения">

        <div>

          <label className="fileButton">

            {
              attachments.length
                ? '+ Прикрепить ещё'
                : '+ Прикрепить файлы'
            }


            <input
              type="file"
              multiple

              style={{
                display: 'none',
              }}

              onChange={(e) => {

                addAttachments(
                  e.target.files
                );

                e.currentTarget.value =
                  '';
              }}
            />

          </label>


          {
            attachments.length >
              0 && (

            <div className="versionList">

              {attachments.map(
                (
                  attachment,
                  index,
                ) => (

                <div
                  className="versionRow"

                  key={
                    attachment.name +
                    attachment.size +
                    attachment.lastModified
                  }
                >

                  <div>

                    <b>
                      {
                        attachment.name
                      }
                    </b>

                    <span>
                      {
                        (
                          attachment.size /
                          1024 /
                          1024
                        ).toFixed(2)
                      } МБ
                    </span>

                  </div>


                  <button
                    type="button"
                    className="secondary"

                    onClick={() =>
                      removeAttachment(
                        index
                      )
                    }
                  >
                    Удалить
                  </button>

                </div>

              ))}

            </div>

          )}


          <div className="microcopy">

            Здесь можно добавить спецификации, фото и другие документы.
            Сам входящий счёт прикрепляется отдельным полем выше.

          </div>

        </div>

      </Field>


      <Field
        title={'Позиции и стоимость'}
      >

        <textarea
          rows={5}

          value={requestText}

          onChange={(e) =>
            setRequestText(
              e.target.value
            )
          }

          placeholder="Bonolit D500 — 32,4 м³ × 5 600 ₽…"
        />

      </Field>


      <Field title="Наценка / цена">

        <div className="inline">

          <select
            value={marginMode}

            onChange={(e) =>
              setMarginMode(
                e.target.value
              )
            }
          >

            <option value="TOTAL_PLUS">
              ± к сумме
            </option>

            <option value="UNIT_PLUS">
              ± за единицу
            </option>

            <option value="PERCENT">
              ± %
            </option>

            <option value="FINAL">
              Итоговая цена
            </option>

          </select>


          <input
            inputMode="decimal"

            value={marginValue}

            onChange={(e) =>
              setMarginValue(
                e.target.value
              )
            }

            placeholder="Например: -7 или 4"
          />

        </div>

      </Field>


      <Field title="Комментарий бухгалтерии">

        <textarea
          rows={3}

          value={
            accountingComment
          }

          onChange={(e) =>
            setAccountingComment(
              e.target.value
            )
          }

          placeholder="Доставку выделить отдельной строкой…"
        />

      </Field>


      <Field title="Мой комментарий">

        <textarea
          rows={3}

          value={managerComment}

          onChange={(e) =>
            setManagerComment(
              e.target.value
            )
          }

          placeholder="Позвонить клиенту после 14:00…"
        />

      </Field>


      <label className="urgentToggle">

        <input
          type="checkbox"

          checked={urgent}

          onChange={(e) =>
            setUrgent(
              e.target.checked
            )
          }
        />

        <span>
          Срочное
        </span>

      </label>


      {uploadStatus && (

        <div className="infoBox">
          {uploadStatus}
        </div>

      )}


      {error && (

        <div className="error">
          {error}
        </div>

      )}


      <div className="actions">

        <button
          type="button"
          className="secondary"
          onClick={onCancel}
          disabled={saving}
        >
          Отмена
        </button>


        <button
          className="primary"
          disabled={saving}
        >

          {
            saving
              ? 'Отправляем…'
              : 'Отправить бухгалтерии'
          }

        </button>

      </div>

    </form>
  );
}

function TasksView({ user, onChanged }: { user: CurrentUser; onChanged: () => void }) {
  const backgroundUploads =
    useBackgroundUploads();


  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [selected, setSelected] =
    useState<Task | null>(null);

  const [
    showCompleted,
    setShowCompleted,
  ] = useState(false);


  async function reloadTasks(
    showLoading = true
  ) {

    if (showLoading) {
      setLoading(true);
    }

    try {

      setTasks(
        await listTasks()
      );

    } finally {

      if (showLoading) {
        setLoading(false);
      }

    }
  }


  useEffect(() => {

    void reloadTasks(true);

    const timer =
      window.setInterval(
        () => {
          void reloadTasks(false);
        },
        7000
      );

    return () => {
      window.clearInterval(timer);
    };

  }, []);


  useEffect(() => {

    const syncSelectedTask = () => {

      const hash =
        window.location.hash
          .replace(
            /^#/,
            ''
          );


      if (
        !hash.startsWith(
          'tasks/'
        )
      ) {

        setSelected(null);
        return;
      }


      const taskId =
        decodeURIComponent(
          hash.slice(
            'tasks/'.length
          )
        );


      const found =
        tasks.find(
          (item) =>
            item.id === taskId
        );


      if (found) {
        setSelected(found);
      }
    };


    syncSelectedTask();


    window.addEventListener(
      'hashchange',
      syncSelectedTask
    );


    return () => {

      window.removeEventListener(
        'hashchange',
        syncSelectedTask
      );

    };

  }, [tasks]);


  function taskTime(
    task: Task
  ) {

    if (!task.createdAt) {
      return 0;
    }


    const value =
      new Date(
        task.createdAt
      ).getTime();


    return Number.isFinite(value)
      ? value
      : 0;
  }


  function sortActive(
    items: Task[]
  ) {

    return [...items].sort(
      (a, b) => {

        // Срочные первыми
        // только внутри своей группы.
        if (
          a.urgent !==
          b.urgent
        ) {

          return a.urgent
            ? -1
            : 1;
        }


        // Старые выше новых.
        return (
          taskTime(a) -
          taskTime(b)
        );
      }
    );
  }


  const inProgress =
    useMemo(
      () =>
        sortActive(
          tasks.filter(
            (task) =>
              task.status ===
              'IN_PROGRESS'
          )
        ),
      [tasks]
    );


  const newTasks =
    useMemo(
      () =>
        sortActive(
          tasks.filter(
            (task) =>
              task.status ===
              'NEW'
          )
        ),
      [tasks]
    );


  const needData =
    useMemo(
      () =>
        sortActive(
          tasks.filter(
            (task) =>
              task.status ===
              'NEED_DATA'
          )
        ),
      [tasks]
    );


  const otherActive =
    useMemo(
      () =>
        sortActive(
          tasks.filter(
            (task) =>
              ![
                'IN_PROGRESS',
                'NEW',
                'NEED_DATA',
                'DONE',
                'CANCELLED',
              ].includes(
                task.status
              )
          )
        ),
      [tasks]
    );


  const completed =
    useMemo(
      () =>
        [...tasks]
          .filter(
            (task) =>
              [
                'DONE',
                'CANCELLED',
              ].includes(
                task.status
              )
          )
          .sort(
            (a, b) =>
              taskTime(b) -
              taskTime(a)
          ),
      [tasks]
    );


  const activeCount =
    inProgress.length +
    newTasks.length +
    needData.length +
    otherActive.length;


  function openTask(
    task: Task
  ) {

    window.location.hash =
      '#tasks/' +
      encodeURIComponent(
        task.id
      );

    setSelected(task);
  }


  function renderTask(
    task: Task,
    completedTask = false
  ) {

    const statusClass =
      task.status
        .toLowerCase()
        .replace(
          /_/g,
          '-'
        );



    const isBackgroundUploading =
      backgroundUploads.some(
        (job) =>
          job.taskId === task.id &&
          job.status === 'RUNNING'
      );


    if (
      isBackgroundUploading
    ) {
      return null;
    }

    return (

      <button
        key={task.id}

        className={
          'taskCard taskCardStatus-' +
          statusClass +
          (
            task.urgent &&
            !completedTask
              ? ' taskCardUrgent'
              : ''
          ) +
          (
            completedTask
              ? ' taskCardCompleted'
              : ''
          )
        }

        onClick={() =>
          openTask(task)
        }
      >

        <div className="taskCardMain">

          <div className="taskCardTitle">

            <strong>
              {task.title}
            </strong>


            {task.urgent &&
              !completedTask && (

              <b className="urgent">
                СРОЧНО
              </b>

            )}

          </div>


          <span className="taskClient">

            {task.deal.clientName}

            {' · '}

            ЗК-
            {task.deal.internalNumber}

          </span>


          {task.createdAt && (

            <span className="taskCreated">

              Создана{' '}

              {
                new Date(
                  task.createdAt
                ).toLocaleString(
                  'ru-RU',
                  {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                )
              }

            </span>

          )}

        </div>


        <div className="taskState">

          <span
            className={
              'taskStatusBadge taskStatus-' +
              statusClass
            }
          >

            {
              taskStatus(
                task.status
              )
            }

          </span>

        </div>

      </button>

    );
  }


  function renderGroup(
    title: string,
    items: Task[],
    className: string
  ) {

    if (
      items.length === 0
    ) {
      return null;
    }


    return (

      <div
        className={
          'taskGroup ' +
          className
        }
      >

        <div className="taskGroupHead">

          <strong>
            {title}
          </strong>

          <span>
            {items.length}
          </span>

        </div>


        <div className="dealList">

          {items.map(
            (task) =>
              renderTask(task)
          )}

        </div>

      </div>

    );
  }


  if (selected) {

    return selected.type === 'PAY_SUPPLIER' &&
      selected.supplierPurchase ? (

      <SupplierPaymentTask
        task={selected}
        user={user}

        onBack={() => {

          window.location.hash =
            '#tasks';

          setSelected(null);

          void reloadTasks(
            false
          );

          onChanged();
        }}
      />

    ) : (

      <TaskDetail
        task={selected}
        user={user}

        onBack={() => {

          window.location.hash =
            '#tasks';

          setSelected(null);

          void reloadTasks(
            false
          );

          onChanged();
        }}
      />

    );
  }

  return (

    <section className="content">

      <BackgroundUploadList
        jobs={backgroundUploads}
      />

      <div className="sectionHead">

        <div>

          <h2>
            Задачи бухгалтерии
          </h2>

          <div className="taskQueueCaption">
            Активных задач: {activeCount}
          </div>

        </div>


        <span>
          {activeCount}
        </span>

      </div>


      {loading ? (

        <div className="empty">
          Загрузка…
        </div>

      ) : activeCount === 0 ? (

        <div className="empty">
          Активных задач нет
        </div>

      ) : (

        <div className="taskQueue">

          {renderGroup(
            'В работе',
            inProgress,
            'taskGroupWorking'
          )}


          {renderGroup(
            'Новые',
            newTasks,
            'taskGroupNew'
          )}


          {renderGroup(
            'Нужны данные',
            needData,
            'taskGroupNeedData'
          )}


          {renderGroup(
            'Остальные',
            otherActive,
            'taskGroupOther'
          )}

        </div>

      )}


      {completed.length > 0 && (

        <div className="completedTasksBlock">

          <button
            type="button"
            className="completedToggle"

            onClick={() =>
              setShowCompleted(
                (value) =>
                  !value
              )
            }
          >

            <span>
              {showCompleted
                ? 'Скрыть выполненные'
                : 'Показать выполненные'}
            </span>

            <b>
              {completed.length}
            </b>

          </button>


          {showCompleted && (

            <div className="completedTasksList">

              {completed.map(
                (task) =>
                  renderTask(
                    task,
                    true
                  )
              )}

            </div>

          )}

        </div>

      )}

    </section>
  );
}

function TaskDetail({ task, user, onBack }: { task: Task; user: CurrentUser; onBack: () => void }) {

  const [status, setStatus] =
    useState(task.status);

  const [number, setNumber] =
    useState('');

  const [amount, setAmount] =
    useState('');

  const [
    invoiceFiles,
    setInvoiceFiles,
  ] = useState<File[]>([]);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [
    returnModalOpen,
    setReturnModalOpen,
  ] = useState(false);

  const [
    returnReason,
    setReturnReason,
  ] = useState('');

  const [
    returnComment,
    setReturnComment,
  ] = useState('');


  useEffect(() => {

    setStatus(
      task.status
    );

  }, [
    task.id,
    task.status,
  ]);


  function addInvoiceFiles(
    files:
      FileList | null,
  ) {

    if (!files) return;


    const selected =
      Array.from(files);


    setInvoiceFiles(
      (current) => {

        const combined = [
          ...current,
          ...selected,
        ];


        return combined.filter(
          (
            file,
            index,
            all,
          ) =>

            all.findIndex(
              (candidate) =>

                candidate.name ===
                  file.name &&

                candidate.size ===
                  file.size &&

                candidate.lastModified ===
                  file.lastModified

            ) === index
        );
      }
    );
  }


  function removeInvoiceFile(
    index: number,
  ) {

    setInvoiceFiles(
      (current) =>
        current.filter(
          (_, fileIndex) =>
            fileIndex !==
            index
        )
    );
  }


  async function take() {

    setSaving(true);
    setError('');


    try {

      await updateTaskStatus(
        task.id,
        'IN_PROGRESS',
        user.id,
      );


      setStatus(
        'IN_PROGRESS',
      );


    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );


    } finally {

      setSaving(false);
    }
  }


  async function sendBackToManager() {

    if (!returnReason) {
      setError(
        'Выберите причину возврата'
      );
      return;
    }


    if (
      returnReason === 'OTHER' &&
      !returnComment.trim()
    ) {
      setError(
        'Для причины «Другое» добавьте комментарий'
      );
      return;
    }


    setSaving(true);
    setError('');


    try {
      await returnInvoiceRequest(
        task.id,
        {
          actorId:
            user.id,
          reasonCode:
            returnReason,
          comment:
            returnComment.trim() ||
            undefined,
        },
      );

      setReturnModalOpen(false);
      setReturnReason('');
      setReturnComment('');
      onBack();

    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );

    } finally {
      setSaving(false);
    }
  }


  function finishInvoice() {

    setError('');


    const filesToUpload =
      [...invoiceFiles];


    const numberToSave =
      number.trim();


    const amountToSave =
      parseMoneyInput(amount);


    setInvoiceFiles([]);


    startBackgroundUploadJob({

      taskId:
        task.id,

      title:
        'Загружаем готовый счёт',

      subtitle:
        task.deal.clientName,

      files:
        filesToUpload,


      run:
        async ({
          upload,
          setProgress,
        }) => {

          const ids:
            string[] = [];


          for (
            let index = 0;
            index <
              filesToUpload.length;
            index++
          ) {

            const uploaded =
              await upload(

                task.deal.id,

                filesToUpload[
                  index
                ],

                'CLIENT_INVOICE_ATTACHMENT',

                index,

                filesToUpload.length,
              );


            ids.push(
              uploaded.id
            );
          }


          setProgress(94);


          await createInvoice(
            task.deal.id,
            {

              number:
                numberToSave,

              amount:
                amountToSave,

              invoiceDate:
                todayLocalDate(),

              fileId:
                ids[0],

              actorId:
                user.id,
            },
          );


          setProgress(99);
        },
    });


    onBack();
  }


  const canAttachInvoice =
    [
      'ISSUE_CLIENT_INVOICE',
      'CORRECT_CLIENT_INVOICE',
    ].includes(
      task.type,
    );


  const allDealFiles =
    task.deal.files || [];


  const managerIncomingFiles =
    allDealFiles.filter(
      (file) =>
        file.category ===
        'MANAGER_ATTACHMENT'
    );


  const customerInvoiceFiles =
    allDealFiles
      .filter(
        (file) =>
          file.category ===
            'CUSTOMER_INVOICE_PRIMARY' ||
          file.category
            ?.startsWith(
              'CORRECTION_PRIMARY_'
            )
      )
      .sort(
        (a, b) =>
          new Date(
            a.createdAt || 0
          ).getTime() -
          new Date(
            b.createdAt || 0
          ).getTime()
      );


  const currentCustomerIncoming =
    customerInvoiceFiles[
      customerInvoiceFiles.length - 1
    ];


  const correctionPrimaryFiles =
    allDealFiles.filter(
      (file) =>
        file.category ===
        'CORRECTION_PRIMARY_' +
        task.id
    );


  const correctionExtraFiles =
    allDealFiles.filter(
      (file) =>
        file.category ===
        'CORRECTION_ATTACHMENT_' +
        task.id
    );


  const legacyCorrectionFiles =
    allDealFiles.filter(
      (file) =>
        file.category ===
        'CORRECTION_TASK_' +
        task.id
    );


  const issueExtraFiles =
    allDealFiles.filter(
      (file) =>
        file.category ===
          'MANAGER_ATTACHMENT' ||

        file.category ===
          'INCOMING_SUPPLIER_INVOICE'
    );


  const currentTaskInvoice =
    task.deal.invoices?.[0];


  return (

    <section className="content form">


      <button
        className="backLink"
        onClick={onBack}
      >
        ← К задачам
      </button>


      <div className="detailHero">

        <div className="eyebrow">
          ЗК-
          {task.deal.internalNumber}
        </div>


        <h2>
          {task.title}
        </h2>


        <p>
          {task.deal.clientName}
        </p>


        <div className="statusPill">
          {
            taskStatus(
              status
            )
          }
        </div>


        {task.urgent && (

          <b className="urgent">
            СРОЧНО
          </b>

        )}

      </div>


      {canAttachInvoice && (

        <div className="invoiceTaskBrief">

          <div>
            <span>От кого</span>
            <b className="sellerTaskBadge">
              {
                sellerLabels[
                  task.deal.sellerType
                ]
              }
            </b>
          </div>

          <div>
            <span>На кого</span>
            <b>
              {task.deal.clientName}
            </b>
          </div>

          <div>
            <span>Условия</span>
            <b>
              {
                pricingConditionLabel(
                  task.deal.marginMode,
                  task.deal.marginValue,
                )
              }
            </b>
          </div>

        </div>

      )}


      {task.deal.requestText && (

        <div className="infoBox">

          <strong>
            Запрос менеджера
          </strong>

          <p>
            {task.deal.requestText}
          </p>

        </div>

      )}


      {task.description && (

        <div className="infoBox">

          <strong>
            Комментарий
          </strong>

          <p>
            {task.description}
          </p>

        </div>

      )}


      {task.type ===
        'ISSUE_CLIENT_INVOICE' &&
        currentCustomerIncoming && (

        <div className="infoBox customerInvoiceTaskBox">

          <strong>
            Входящий счёт заказчика
          </strong>

          <p>
            Используйте этот файл как исходный документ для выставления счёта.
          </p>

          <div className="versionList">

            <div className="versionRow correctionPrimaryRow">

              <div>
                <b>
                  {
                    currentCustomerIncoming
                      .originalName
                  }
                </b>

                <span>
                  Основной входящий счёт
                </span>
              </div>

              <a
                href={
                  dealFileUrl(
                    currentCustomerIncoming.id
                  )
                }
                target="_blank"
                rel="noreferrer"
              >
                Открыть
              </a>

            </div>

          </div>

        </div>

      )}


      {task.type ===
        'CORRECT_CLIENT_INVOICE' &&
        currentTaskInvoice && (

        <div className="infoBox correctionTargetBox">

          <strong>
            Корректируем наш счёт
          </strong>

          <p>
            {
              sellerLabels[
                task.deal.sellerType
              ]
            }-{currentTaskInvoice.number}
            {' · '}
            версия {
              currentTaskInvoice.version ||
              1
            }
          </p>


          {currentTaskInvoice.fileId && (

            <a
              className="correctionTargetLink"

              href={
                dealFileUrl(
                  currentTaskInvoice.fileId
                )
              }

              target="_blank"
              rel="noreferrer"
            >
              Открыть текущий PDF
            </a>

          )}

        </div>

      )}


      {task.type ===
        'CORRECT_CLIENT_INVOICE' &&
        correctionPrimaryFiles.length >
          0 && (

        <div className="infoBox correctionPrimaryBox">

          <strong>
            Основа для корректировки
          </strong>

          <p>
            Ориентироваться по этому входящему счёту.
          </p>


          <div className="versionList">

            {correctionPrimaryFiles.map(
              (file) => (

              <div
                className="versionRow correctionPrimaryRow"
                key={file.id}
              >

                <div>

                  <b>
                    {file.originalName}
                  </b>

                  <span>
                    Основной входящий счёт
                  </span>

                </div>


                <a
                  href={
                    dealFileUrl(
                      file.id
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть
                </a>

              </div>

            ))}

          </div>

        </div>

      )}


      {task.type ===
        'CORRECT_CLIENT_INVOICE' &&
        correctionPrimaryFiles.length ===
          0 &&
        legacyCorrectionFiles.length >
          0 && (

        <div className="infoBox correctionPrimaryBox">

          <strong>
            Документы корректировки
          </strong>

          <p>
            Задача создана до разделения основного и дополнительных файлов. Проверьте эти документы вместе с комментарием менеджера.
          </p>


          <div className="versionList">

            {legacyCorrectionFiles.map(
              (file) => (

              <div
                className="versionRow"
                key={file.id}
              >

                <div>
                  <b>
                    {file.originalName}
                  </b>
                </div>

                <a
                  href={
                    dealFileUrl(
                      file.id
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть
                </a>

              </div>

            ))}

          </div>

        </div>

      )}


      {task.type ===
        'CORRECT_CLIENT_INVOICE' &&
        correctionExtraFiles.length >
          0 && (

        <div className="infoBox">

          <strong>
            Дополнительные материалы
          </strong>


          <div className="versionList">

            {correctionExtraFiles.map(
              (file) => (

              <div
                className="versionRow"
                key={file.id}
              >

                <div>

                  <b>
                    {file.originalName}
                  </b>

                  <span>
                    Дополнительный документ
                  </span>

                </div>

                <a
                  href={
                    dealFileUrl(
                      file.id
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть
                </a>

              </div>

            ))}

          </div>

        </div>

      )}


      {task.type ===
        'CORRECT_CLIENT_INVOICE' &&
        managerIncomingFiles.length >
          0 && (

        <div className="infoBox correctionOriginalFiles">

          <strong>
            Исходные вложения сделки
          </strong>


          <div className="versionList">

            {managerIncomingFiles.map(
              (file) => (

              <div
                className="versionRow"
                key={file.id}
              >

                <div>
                  <b>
                    {file.originalName}
                  </b>

                  <span>
                    Было приложено при создании сделки
                  </span>
                </div>

                <a
                  href={
                    dealFileUrl(
                      file.id
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть
                </a>

              </div>

            ))}

          </div>

        </div>

      )}


      {task.type !==
        'CORRECT_CLIENT_INVOICE' &&
        issueExtraFiles.length >
          0 && (

        <div className="infoBox">

          <strong>
            Дополнительные вложения
          </strong>


          <div className="versionList">

            {issueExtraFiles.map(
              (incomingFile) => (

              <div
                className="versionRow"
                key={
                  incomingFile.id
                }
              >

                <div>

                  <b>
                    {
                      incomingFile
                        .originalName
                    }
                  </b>

                  <span>
                    Вложение к заявке
                  </span>

                </div>


                <a
                  href={
                    dealFileUrl(
                      incomingFile.id
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть
                </a>

              </div>

            ))}

          </div>

        </div>

      )}


      {status === 'NEW' && (

        task.type ===
          'ISSUE_CLIENT_INVOICE' ? (

          <div className="invoiceTaskStartActions">

            <button
              type="button"
              className="secondary"
              disabled={saving}
              onClick={() =>
                setReturnModalOpen(true)
              }
            >
              Отказать / вернуть
            </button>

            <button
              className="primary"
              disabled={saving}
              onClick={take}
            >
              {
                saving
                  ? 'Сохраняем…'
                  : 'В работу'
              }
            </button>

          </div>

        ) : (

          <button
            className="primary wide"
            disabled={saving}
            onClick={take}
          >
            {
              saving
                ? 'Сохраняем…'
                : 'В работу'
            }
          </button>
        )

      )}


      {status === 'IN_PROGRESS' && (

        <div className="infoBox invoiceTaskInWorkBox">

          <div>
            <strong>
              Задача в работе
            </strong>

            <p>
              Заполните готовый счёт ниже.
            </p>
          </div>

          {task.type ===
            'ISSUE_CLIENT_INVOICE' && (
            <button
              type="button"
              className="secondary compactButton"
              disabled={saving}
              onClick={() =>
                setReturnModalOpen(true)
              }
            >
              Отказать / вернуть
            </button>
          )}

        </div>

      )}


      {returnModalOpen &&
        task.type ===
          'ISSUE_CLIENT_INVOICE' && (

        <div
          className="appModalBackdrop"
          onClick={() =>
            setReturnModalOpen(false)
          }
        >
          <div
            className="appModal invoiceReturnModal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <strong>
              Отказать / вернуть менеджеру
            </strong>

            <p>
              Выберите, чего не хватает для выставления счёта. Менеджер увидит причину и сможет повторно отправить эту же задачу.
            </p>


            <div className="invoiceReturnReasons">

              {[
                [
                  'NO_INCOMING_INVOICE',
                  'Нет входящего счёта',
                ],
                [
                  'NO_TERMS',
                  'Нет условий',
                ],
                [
                  'NO_DETAILS',
                  'Нет реквизитов / непонятно, на кого делать',
                ],
                [
                  'OTHER',
                  'Другое',
                ],
              ].map(
                ([value, label]) => (

                <button
                  type="button"
                  key={value}
                  className={
                    returnReason === value
                      ? 'invoiceReturnReason selected'
                      : 'invoiceReturnReason'
                  }
                  onClick={() =>
                    setReturnReason(value)
                  }
                >
                  <span className="invoiceReturnRadio" />
                  <b>{label}</b>
                </button>

              ))}

            </div>


            <Field title="Комментарий">
              <textarea
                rows={3}
                value={returnComment}
                onChange={(e) =>
                  setReturnComment(
                    e.target.value
                  )
                }
                placeholder="Что нужно добавить или уточнить"
              />
            </Field>


            {error && (
              <div className="error">
                {error}
              </div>
            )}


            <div className="appModalActions">
              <button
                type="button"
                className="secondary"
                disabled={saving}
                onClick={() =>
                  setReturnModalOpen(false)
                }
              >
                Отмена
              </button>

              <button
                type="button"
                className="primary"
                disabled={saving || !returnReason}
                onClick={sendBackToManager}
              >
                {
                  saving
                    ? 'Отправляем…'
                    : 'Отказать / вернуть'
                }
              </button>
            </div>

          </div>
        </div>

      )}


      {canAttachInvoice &&
        status ===
          'IN_PROGRESS' && (

        <>

          <Field title="Номер готового счёта">

            <input
              value={number}

              onChange={(e) =>
                setNumber(
                  e.target.value
                )
              }

              placeholder="1548"
            />

          </Field>


          <Field title="Сумма">

            <input
              inputMode="decimal"

              value={amount}

              onChange={(e) =>
                setAmount(
                  formatMoneyInput(
                    e.target.value
                  )
                )
              }

              placeholder="420 000"
            />

          </Field>


          <Field title="Файлы готового счёта">

            <div>

              <label className="fileButton">

                {
                  invoiceFiles.length
                    ? '+ Прикрепить ещё'
                    : '+ Прикрепить файлы'
                }


                <input
                  type="file"
                  multiple

                  style={{
                    display: 'none',
                  }}

                  onChange={(e) => {

                    addInvoiceFiles(
                      e.target.files
                    );

                    e.currentTarget.value =
                      '';
                  }}
                />

              </label>


              {invoiceFiles.length > 0 && (

                <div className="versionList">

                  {invoiceFiles.map(
                    (
                      invoiceFile,
                      index,
                    ) => (

                    <div
                      className="versionRow"

                      key={
                        invoiceFile.name +
                        invoiceFile.size +
                        invoiceFile.lastModified
                      }
                    >

                      <div>

                        <b>
                          {
                            invoiceFile.name
                          }
                        </b>

                        <span>
                          {
                            (
                              invoiceFile.size /
                              1024 /
                              1024
                            ).toFixed(2)
                          } МБ
                        </span>

                      </div>


                      <button
                        type="button"
                        className="secondary"

                        onClick={() =>
                          removeInvoiceFile(
                            index
                          )
                        }
                      >
                        Удалить
                      </button>

                    </div>

                  ))}

                </div>

              )}

            </div>

          </Field>


          <button
            className="primary wide"
            disabled={saving}
            onClick={
              finishInvoice
            }
          >

            {
              saving
                ? 'Сохраняем…'
                : 'Счёт готов'
            }

          </button>


          <div className="microcopy">

            Дата счёта ставится
            автоматически —
            сегодняшняя.

            Номер счёта пока
            необязателен только
            для тестирования.

          </div>

        </>

      )}


      {error && (

        <div className="error">
          {error}
        </div>

      )}

    </section>
  );
}


function todayLocalDate() {

  const now =
    new Date();


  const local =
    new Date(

      now.getTime() -

      now.getTimezoneOffset() *
        60000
    );


  return local
    .toISOString()
    .slice(0, 10);
}


function formatMoneyInput(
  value: string,
) {

  const normalized =
    value
      .replace(/\s+/g, '')
      .replace(',', '.')
      .replace(/[^0-9.]/g, '');


  if (!normalized) {
    return '';
  }


  const firstDot =
    normalized.indexOf('.');


  const integerPart =
    (
      firstDot >= 0
        ? normalized.slice(0, firstDot)
        : normalized
    ) || '0';


  const decimalPart =
    firstDot >= 0
      ? normalized
          .slice(firstDot + 1)
          .replace(/\./g, '')
          .slice(0, 2)
      : null;


  const formattedInteger =
    integerPart
      .replace(/^0+(?=\d)/, '')
      .replace(
        /\B(?=(\d{3})+(?!\d))/g,
        ' '
      );


  return decimalPart !== null
    ? formattedInteger + ',' + decimalPart
    : formattedInteger;
}


function parseMoneyInput(
  value: string,
) {

  const normalized =
    value
      .replace(/\s+/g, '')
      .replace(',', '.');


  if (!normalized) {
    return undefined;
  }


  const parsed =
    Number(normalized);


  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}


function money(value: string | number) { return `${Number(value).toLocaleString('ru-RU')} ₽`; }

function auditMoney(
  value: unknown,
) {

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {

    return 'не указана';
  }


  const number =
    Number(value);


  if (
    !Number.isFinite(
      number
    )
  ) {

    return String(value);
  }


  return (
    number.toLocaleString(
      'ru-RU'
    ) +
    ' ₽'
  );
}


function auditDate(
  value: unknown,
) {

  if (!value) {
    return 'не указана';
  }


  const text =
    String(value);


  const parts =
    text.split('-');


  if (
    parts.length === 3
  ) {

    return (
      parts[2] +
      '.' +
      parts[1] +
      '.' +
      parts[0]
    );
  }


  return text;
}


function auditLabel(
  action: string,

  oldValue?: Record<
    string,
    unknown
  >,

  newValue?: Record<
    string,
    unknown
  >,
) {

  if (
    action ===
    'INVOICE_AMOUNT_CHANGED'
  ) {

    return (
      'Изменена сумма счёта: ' +
      auditMoney(
        oldValue?.amount
      ) +
      ' → ' +
      auditMoney(
        newValue?.amount
      )
    );
  }


  if (
    action ===
    'DEAL_SELLER_CHANGED'
  ) {

    const oldSeller =
      String(
        oldValue?.sellerType ||
        '—'
      ) as SellerType;

    const newSeller =
      String(
        newValue?.sellerType ||
        '—'
      ) as SellerType;


    return (
      'Изменено, от кого выставляем: ' +
      (sellerLabels[oldSeller] || oldSeller) +
      ' → ' +
      (sellerLabels[newSeller] || newSeller)
    );
  }


  if (
    action ===
    'SHIPMENT_DATE_CHANGED'
  ) {

    return (
      'Изменена дата отгрузки: ' +
      auditDate(
        oldValue
          ?.plannedShipmentAt
      ) +
      ' → ' +
      auditDate(
        newValue
          ?.plannedShipmentAt
      )
    );
  }


  if (
    action ===
    'DEAL_PHONE_CHANGED'
  ) {

    return (
      'Изменён телефон: ' +
      String(
        oldValue?.clientPhone ||
        'не указан'
      ) +
      ' → ' +
      String(
        newValue?.clientPhone ||
        'не указан'
      )
    );
  }


  const labels:
    Record<string, string> = {

    CREATE:
      'Создана сделка',

    UPLOAD:
      'Загружен счёт',

    CONFIRM:
      'Счёт подтверждён',

    REQUEST_CORRECTION:
      'Запрошена корректировка',

    INVOICE_REQUEST_SUBMITTED:
      'Запрос на счёт отправлен бухгалтерии',

    INVOICE_REQUEST_RESUBMITTED:
      'Запрос на счёт отправлен повторно',

    INVOICE_REQUEST_RETURNED:
      'Бухгалтерия вернула запрос менеджеру',

    INVOICE_REQUEST_WITHDRAWN:
      'Запрос на счёт отозван менеджером',

    CLIENT_PAYMENT_ADDED:
      'Добавлена оплата клиента',

    PAYMENT_STATUS_CHANGED:
      'Изменён статус оплаты',

    SUPPLIER_PURCHASE_CREATED:
      'Добавлена закупка',

    SUPPLIER_PURCHASE_UPDATED:
      'Изменены данные закупки',

    SUPPLIER_PAYMENT_REQUESTED:
      'Запрошена оплата поставщику',

    SUPPLIER_PAYMENT_ADDED:
      newValue?.paidFromBalance
        ? 'Оплата поставщику с остатка'
        : 'Добавлена оплата поставщику',

    SUPPLIER_PAYMENT_STAMPED:
      'Добавлена платёжка с печатью',

    MANAGER_COMMENT_CHANGED:
      'Изменён комментарий менеджера',

    DELIVERY_ADDRESSES_CHANGED:
      'Изменены адреса доставки',

    DEAL_CONTACT_CHANGED:
      'Изменено контактное лицо',
  };


  return (
    labels[action] ||
    'Изменение по сделке'
  );
}


function pricingConditionLabel(
  mode?: string,
  rawValue?: string | number,
) {

  if (
    rawValue === undefined ||
    rawValue === null ||
    rawValue === ''
  ) {
    return 'Не указаны';
  }


  const value =
    Number(rawValue);


  if (!Number.isFinite(value)) {
    return String(rawValue);
  }


  const signed =
    value > 0
      ? '+' + value
      : String(value);


  if (mode === 'PERCENT') {
    return signed + '%';
  }


  if (mode === 'UNIT_PLUS') {
    return signed + ' ₽ за единицу';
  }


  if (mode === 'TOTAL_PLUS') {
    return signed + ' ₽ к сумме';
  }


  if (mode === 'FINAL') {
    return 'Итоговая цена ' +
      value.toLocaleString(
        'ru-RU'
      ) +
      ' ₽';
  }


  return signed;
}


function paymentStatusLabel(status: PaymentStatus) { return ({ NO_PREPAYMENT: 'Без предоплаты', WAITING: 'Ожидаем оплату', ADVANCE: 'Аванс', PAID: 'Оплачен', DEFERRED: 'Отсрочка' } as Record<PaymentStatus,string>)[status]; }
function paymentMethodLabel(method: ClientPaymentMethod) { return ({ NONCASH: 'Безнал', CASH: 'Наличные', CARD: 'Пластик', ADVANCE: 'Аванс' } as Record<ClientPaymentMethod,string>)[method]; }
function taskStatus(status: string) { return ({ NEW: 'Новая', IN_PROGRESS: 'В работе', NEED_DATA: 'Нужны данные', DONE: 'Выполнена', CANCELLED: 'Отменена' } as Record<string,string>)[status] || status; }

function ThemeToggle() {

  const [dark, setDark] =
    useState(() => {

      const saved =
        localStorage.getItem(
          'msm-theme'
        );


      if (saved === 'dark') {
        return true;
      }


      if (saved === 'light') {
        return false;
      }


      return window
        .matchMedia(
          '(prefers-color-scheme: dark)'
        )
        .matches;
    });


  useEffect(() => {

    document
      .documentElement
      .setAttribute(
        'data-theme',
        dark
          ? 'dark'
          : 'light'
      );


    localStorage.setItem(
      'msm-theme',
      dark
        ? 'dark'
        : 'light'
    );

  }, [dark]);


  return (

    <button
      type="button"
      className="themeToggle"

      title={
        dark
          ? 'Светлая тема'
          : 'Тёмная тема'
      }

      onClick={() =>
        setDark(
          (value) =>
            !value
        )
      }
    >

      {
        dark
          ? '☀'
          : '☾'
      }

    </button>
  );
}


function Field({ title, children }: { title: string; children: React.ReactNode }) { return <label className="field"><span>{title}</span>{children}</label>; }
function ScreenMessage({ children }: { children: React.ReactNode }) { return <div className="screenMessage">{children}</div>; }
function roleName(role: CurrentUser['role']) { return ({ MANAGER: 'Менеджер', ACCOUNTANT: 'Бухгалтер', LEADER: 'Руководитель', ADMIN: 'Админ' } as const)[role]; }
function statusLabel(status: string) { return ({ WAITING_MANAGER_REVIEW: 'Ожидает проверки', CONFIRMED: 'Счёт подтверждён', CORRECTION_REQUESTED: 'На корректировке', WAITING_ACCOUNTING: 'Ожидаем счёт' } as Record<string, string>)[status] || status; }

export default App;
