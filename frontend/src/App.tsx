import { TasksView } from './features/tasks/TasksView';
import { FilesLibrary } from './FilesLibrary';
import { DealDetail } from './features/deals/DealDetail';
import { NewDealForm } from './features/deals/NewDealForm';
import { paymentStatusLabel, roleName, sellerLabels, statusLabel, taskStatus } from './shared/formatters';
import { BlockOfficeHome } from './BlockOfficeHome';
import { BlockOfficeMobileNav } from './BlockOfficeMobileNav';
import { RecentActivityPanel } from './RecentActivityPanel';
import { type BackgroundUploadJob, useBackgroundUploads } from './backgroundUploads';
import { resumePendingInvoiceSubmissions } from './invoiceSubmissionQueue';
import { useEffect, useMemo, useState } from 'react';
import { listDeals, login } from './api';
import type { CurrentUser, Deal } from './types';

type View = 'home' | 'new' | 'tasks' | 'deal' | 'files';

function readRoute(): { view: View; dealId?: string } {
  const hash = window.location.hash.replace(/^#/, '');

  if (hash === 'new') {
    return { view: 'new' };
  }

  if (hash === 'files') return { view: 'files' };

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
  const [msmLibraryAvailable, setMsmLibraryAvailable] = useState(false);

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

    void resumePendingInvoiceSubmissions(
      user.id
    );
  }, [user?.id]);

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


  useEffect(() => {
    let live = true;
    void fetch((import.meta.env.VITE_API_URL || '/api') + '/file-library')
      .then(response => { if (live && response.ok) setMsmLibraryAvailable(true); })
      .catch(() => undefined);
    return () => { live = false; };
  }, []);

  if (loading) return <ScreenMessage>Загрузка…</ScreenMessage>;
  if (error || !user) return <ScreenMessage>Не удалось запустить приложение: {error}</ScreenMessage>;

  const title = view === 'new' ? 'Новый запрос на счёт' : view === 'tasks' ? 'Задачи' : view === 'deal' ? 'Сделка' : view === 'files' ? 'Файлы' : 'Мои сделки';

  return (
    <main className={'shell boShell boView-' + view}>
      <header className="topbar">
        <div><div className="eyebrow">МСМ · Telegram Mini App</div><h1>{title}</h1></div>
        <nav className="msmDesktopNav" aria-label="Разделы приложения">
          <button type="button" className={view === 'home' || view === 'deal' ? 'active' : ''} onClick={() => navigate('home')}>Сделки</button>
          <button type="button" className={view === 'tasks' ? 'active' : ''} onClick={() => navigate('tasks')}>Задачи</button>
          {msmLibraryAvailable && <a className={window.location.hash.startsWith('#files') ? 'active' : ''} href="#files">Файлы</a>}
        </nav>
        <div className="topbarActions">
          <ThemeToggle />
          <div className="userBadge">{user.firstName}<span>{roleName(user.role)}</span></div>
        </div>
      </header>

      {view === 'home' ? (
        <BlockOfficeHome
          deals={deals}
          onNew={() => navigate('new')}
          onOpen={(id) => navigate('deal', id)}
        />
      ) : view === 'tasks' ? (
        <TasksView user={user} onChanged={() => reload()} />
      ) : view === 'files' ? (
        <FilesLibrary user={user} deals={deals} />
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
            // PART_V064_O21_V2_DEAL_UPLOAD_VISIBLE_IMMEDIATELY
            // Сначала открываем список сделок:
            // progress становится виден сразу.
            navigate('home');
            await reload();
          }}
        />
      )}

      <nav className="bottomNav">
        <button className={view === 'home' || view === 'deal' ? 'active' : ''} onClick={() => navigate('home')}>Сделки</button>
        <button className={view === 'tasks' ? 'active' : ''} onClick={() => navigate('tasks')}>Задачи</button>
        <button className={view === 'files' ? 'active' : ''} onClick={() => navigate('files')}>Файлы</button>
        <button disabled>Месяц</button>
      </nav>
    
      <BlockOfficeMobileNav />
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


  

  // PART_V064_O24_DEAL_LIST_UPLOAD_BINDING
  const dealUploadJobFor =
    (dealId: string) =>
      backgroundUploads.find(
        (job) =>
          job.dealId === dealId &&
          (
            job.scope === 'DEAL' ||
            (
              !job.taskId &&
              (
                !job.scope ||
                job.scope === 'TASK'
              )
            )
          )
      );

  // PART_V064_O25_DEAL_LIST_PROGRESS_FORCE_VISIBLE
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


  // PART_V064_O21_V2_DEAL_UPLOAD_VISIBLE_IMMEDIATELY
  // Пока серверный reload ещё не вернул новую ЗК,
  // показываем её upload job как временную карточку.
  const pendingDealUploads =
    backgroundUploads.filter(
      (job) =>
        Boolean(job.dealId) &&
        (
          !job.scope ||
          job.scope === 'DEAL'
        ) &&
        !deals.some(
          (deal) =>
            deal.id === job.dealId
        )
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

            {pendingDealUploads.map(
              (job) => (
                <div
                  className="dealCard dealUploadGhostCard"
                  key={job.id}
                >
                  <div className="dealTop">
                    <div>
                      <strong>
                        Новая сделка
                      </strong>
                      <span>
                        {
                          job.subtitle ||
                          'Создаём сделку'
                        }
                      </span>
                    </div>
                  </div>

                  <div className="dealMeta">
                    <span>
                      Счёт на создании
                    </span>
                  </div>

                  <div
                    className={
                      'dealUploadState dealUpload-' +
                      job.status.toLowerCase()
                    }
                  >
                    <div className="dealUploadStateTop">
                      <strong>
                        {
                          job.status === 'SUCCESS'
                            ? '✓ ' +
                              (
                                job.successTitle ||
                                job.title
                              )
                            : job.status === 'ERROR'
                              ? 'Не удалось отправить документы'
                              : job.title
                        }
                      </strong>

                      <b>
                        {job.progress}%
                      </b>
                    </div>

                    <div className="dealUploadMiniBar">
                      <span
                        style={{
                          width:
                            Math.max(
                              0,
                              Math.min(
                                100,
                                job.progress
                              )
                            ) + '%',
                        }}
                      />
                    </div>

                    <span>
                      {
                        job.status === 'RUNNING'
                          ? (
                              job.currentFile
                                ? (
                                    job.completedFiles +
                                    ' из ' +
                                    job.totalFiles +
                                    ' · ' +
                                    job.currentFile
                                  )
                                : 'Подготавливаем отправку…'
                            )
                          : job.status === 'SUCCESS'
                            ? 'Готово'
                            : (
                                job.error ||
                                'Ошибка загрузки'
                              )
                      }
                    </span>
                  </div>
                </div>
              )
            )}

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
                  dealUploadJobFor(
                    deal.id
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
  const invoice =
    deal.invoices[0];

  const urgent =
    deal.tasks.some(
      (task) =>
        task.urgent
    );

  const activeTasks =
    deal.tasks.filter(
      (task) =>
        ![
          'DONE',
          'CANCELLED',
        ].includes(
          task.status
        )
    );

  const needsManagerAction =
    invoiceRequestNeedsManager(
      deal
    );

  const returnedInvoiceTask =
    activeTasks.find(
      (task) =>
        task.type ===
          'ISSUE_CLIENT_INVOICE' &&
        task.status ===
          'NEED_DATA'
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


  function stopCardOpen(
    event: {
      stopPropagation:
        () => void;
    }
  ) {
    event.stopPropagation();
  }


  return (

    <div
      className={
        'dealCard clickable' +
        (
          needsManagerAction
            ? ' dealCardNeedsAction'
            : ''
        )
      }
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {

        if (
          event.key ===
            'Enter' ||
          event.key ===
            ' '
        ) {

          event.preventDefault();
          onOpen();
        }
      }}
    >

      <div className="dealTop">

        <div className="dealIdentity">

          <a
            className="dealInternalNumberLink"
            href={
              '#deal/' +
              encodeURIComponent(
                deal.id
              )
            }
            onClick={
              stopCardOpen
            }
          >
            ЗК-
            {deal.internalNumber}
          </a>


          {invoice && (

            <span className="dealInvoiceNumber">
              {
                sellerLabels[
                  deal.sellerType
                ]
              }
              -
              {invoice.number}
            </span>

          )}


          <span className="dealClientName">
            {deal.clientName}
          </span>

        </div>


        {urgent && (

          <b className="urgent">
            СРОЧНО
          </b>

        )}

      </div>


      <div className="dealMeta">

        <span>
          Отгрузка:{' '}
          {
            deal.plannedShipmentAt
              ? new Date(
                  deal.plannedShipmentAt
                )
                  .toLocaleDateString(
                    'ru-RU'
                  )
              : 'не указана'
          }
        </span>


        {needsManagerAction ? (

          <b className="dealCardActionStatus">
            Нужны данные
          </b>

        ) : (

          <span>
            {
              invoice
                ? statusLabel(
                    invoice.status
                  )
                : 'Ожидаем счёт'
            }
          </span>

        )}

      </div>


      <div className="paymentMini">
        {
          paymentStatusLabel(
            deal.paymentStatus
          )
        }
      </div>


      {activeTasks.length > 0 && (

        <div
          className="dealTaskLinks"
          onClick={
            stopCardOpen
          }
        >

          <span className="dealTaskLinksLabel">
            {
              activeTasks.length === 1
                ? 'Задача'
                : 'Задачи'
            }
          </span>


          <div className="dealTaskLinksList">

            {activeTasks.map(
              (task) => (

                <a
                  key={task.id}
                  className={
                    'dealTaskLink' +
                    (
                      task.status ===
                        'NEED_DATA'
                        ? ' dealTaskLinkNeedData'
                        : ''
                    )
                  }
                  href={
                    '#tasks/' +
                    encodeURIComponent(
                      task.id
                    )
                  }
                  onClick={
                    stopCardOpen
                  }
                >
                  <strong>
                    {task.title}
                  </strong>

                  <span>
                    {
                      task.status ===
                        'NEED_DATA'
                        ? 'Нужно исправить'
                        : taskStatus(
                            task.status
                          )
                    }
                  </span>
                </a>

              )
            )}

          </div>

        </div>

      )}


      {uploadJob && (

        <div
          className={
            'dealUploadState dealUpload-' +
            uploadJob.status
              .toLowerCase()
          }
        >

          <div className="dealUploadStateTop">

            <strong>
              {
                uploadJob.status ===
                  'SUCCESS'
                  ? '✓ ' +
                    (
                      uploadJob
                        .successTitle ||
                      uploadJob.title
                    )
                  : uploadJob.status ===
                      'ERROR'
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
                  uploadJob.progress +
                  '%',
              }}
            />

          </div>


          {uploadJob.status ===
            'RUNNING' && (

            <span>
              {
                uploadJob.currentFile
                  ? 'Загружаем: ' +
                    uploadJob.currentFile
                  : 'Подготавливаем отправку…'
              }
            </span>

          )}


          {uploadJob.status ===
            'ERROR' &&
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


          {returnedInvoiceTask ? (

            <a
              className="dealCardActionCta dealCardActionLink"
              href={
                '#tasks/' +
                encodeURIComponent(
                  returnedInvoiceTask.id
                )
              }
              onClick={
                stopCardOpen
              }
            >
              Открыть задачу и исправить →
            </a>

          ) : (

            <span className="dealCardActionCta">
              Исправить и повторно отправить →
            </span>

          )}

        </div>

      ) : (

        <>

          {deal.managerComment && (

            <div className="note">
              📝 {deal.managerComment}
            </div>

          )}

        </>

      )}

    </div>
  );
}


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



function ScreenMessage({ children }: { children: React.ReactNode }) { return <div className="screenMessage">{children}</div>; }
export default App;
