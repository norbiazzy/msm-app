import {
  useMemo,
  useState,
} from 'react';

import {
  completePowerOfAttorneyTask,
  createPowerOfAttorneyTask,
  dealFileUrl,
  updateTaskStatus,
  type Task,
} from './api';

import {
  MultiFilePicker,
} from './MultiFilePicker';

import {
  startBackgroundUploadJob,
} from './backgroundUploads';

import type {
  CurrentUser,
  Deal,
  SellerType,
} from './types';


const sellerLabels:
  Record<SellerType, string> = {
    ST: 'СТ',
    MSM: 'МСМ',
    IP: 'ИП',
  };


function todayLocalDate() {
  const now = new Date();
  const local = new Date(
    now.getTime() -
    now.getTimezoneOffset() * 60000
  );

  return local
    .toISOString()
    .slice(0, 10);
}


function taskStatusLabel(
  status: string,
) {
  return ({
    NEW: 'Новая',
    IN_PROGRESS: 'В работе',
    NEED_DATA: 'Нужны данные',
    DONE: 'Готова',
    CANCELLED: 'Отменена',
  } as Record<string, string>)[status] || status;
}


export function PowerOfAttorneyBlock({
  deal,
  user,
  onChanged,
}: {
  deal: Deal;
  user: CurrentUser;
  onChanged:
    () => void | Promise<void>;
}) {

  const [open, setOpen] =
    useState(false);

  const [supplierName, setSupplierName] =
    useState('');

  const [organization, setOrganization] =
    useState<SellerType>(deal.sellerType);

  const [recipientName, setRecipientName] =
    useState('');

  const [invoiceNumber, setInvoiceNumber] =
    useState('');

  const [requestDate, setRequestDate] =
    useState(todayLocalDate());

  const [goodsDescription, setGoodsDescription] =
    useState('');

  const [comment, setComment] =
    useState('');

  const [files, setFiles] =
    useState<File[]>([]);

  const [urgent, setUrgent] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');


  const requests = useMemo(
    () =>
      (deal.tasks || [])
        .filter(
          (task) =>
            task.type ===
            'POWER_OF_ATTORNEY'
        ),
    [deal.tasks],
  );


  const supplierOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (deal.supplierPurchases || [])
            .map(
              (purchase) =>
                purchase.supplierName
            )
            .filter(Boolean)
        )
      ),
    [deal.supplierPurchases],
  );


  function resetForm() {
    setSupplierName('');
    setOrganization(deal.sellerType);
    setRecipientName('');
    setInvoiceNumber('');
    setRequestDate(todayLocalDate());
    setGoodsDescription('');
    setComment('');
    setFiles([]);
    setUrgent(false);
    setOpen(false);
  }


  async function createTask(
    requestKey: string,
  ) {
    await createPowerOfAttorneyTask({
      dealId: deal.id,
      actorId: user.id,
      urgent,
      requestKey,
      supplierName:
        supplierName.trim(),
      organization,
      recipientName:
        recipientName.trim(),
      invoiceNumber:
        invoiceNumber.trim() ||
        undefined,
      requestDate:
        requestDate || undefined,
      goodsDescription:
        goodsDescription.trim(),
      comment:
        comment.trim() ||
        undefined,
    });
  }


  async function submit() {
    setError('');

    if (!supplierName.trim()) {
      setError(
        'Укажите поставщика / завод.'
      );
      return;
    }

    if (!recipientName.trim()) {
      setError(
        'Укажите, на кого нужна доверенность.'
      );
      return;
    }

    if (!goodsDescription.trim()) {
      setError(
        'Укажите, что получаем.'
      );
      return;
    }


    const requestKey =
      'poa-' +
      Date.now() +
      '-' +
      Math.random()
        .toString(36)
        .slice(2, 8);

    const filesToUpload =
      [...files];


    if (filesToUpload.length > 0) {
      startBackgroundUploadJob({
        dealId: deal.id,
        title:
          'Отправляем запрос на доверенность',
        successTitle:
          'Запрос на доверенность отправлен',
        subtitle:
          supplierName.trim(),
        files: filesToUpload,

        run: async ({
          upload,
          setProgress,
        }) => {
          for (
            let index = 0;
            index < filesToUpload.length;
            index++
          ) {
            await upload(
              deal.id,
              filesToUpload[index],
              'POWER_OF_ATTORNEY_SOURCE_' +
              requestKey,
              index,
              filesToUpload.length,
            );
          }

          setProgress(95);
          await createTask(requestKey);
          setProgress(99);
          await onChanged();
        },
      });

      resetForm();
      return;
    }


    setSaving(true);

    try {
      await createTask(requestKey);
      resetForm();
      await onChanged();
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
    <div className="powerBox">

      <div className="powerHead">
        <div>
          <span>Документы</span>
          <strong>Доверенности</strong>
        </div>

        <b>{requests.length}</b>
      </div>


      {requests.length > 0 && (
        <div className="powerList">
          {requests.map(
            (task) => {
              const payload =
                task.payload || {};

              const requestKey =
                String(
                  payload.requestKey || ''
                );

              const resultFiles =
                (deal.files || []).filter(
                  (file) =>
                    file.category ===
                    'POWER_OF_ATTORNEY_RESULT_' +
                    task.id
                );

              const sourceFiles =
                requestKey
                  ? (deal.files || []).filter(
                      (file) =>
                        file.category ===
                        'POWER_OF_ATTORNEY_SOURCE_' +
                        requestKey
                    )
                  : [];

              return (
                <div
                  className="powerCard"
                  key={task.id}
                >
                  <div className="powerCardHead">
                    <div>
                      <strong>
                        {String(
                          payload.supplierName ||
                          'Доверенность'
                        )}
                      </strong>

                      <span>
                        На кого: {' '}
                        {String(
                          payload.recipientName ||
                          'не указано'
                        )}
                      </span>
                    </div>

                    <b className={
                      'powerStatus powerStatus-' +
                      task.status.toLowerCase()
                    }>
                      {taskStatusLabel(
                        task.status
                      )}
                    </b>
                  </div>


                  <div className="powerMeta">
                    <span>
                      От: {' '}
                      {sellerLabels[
                        String(
                          payload.organization ||
                          deal.sellerType
                        ) as SellerType
                      ] ||
                      String(
                        payload.organization ||
                        deal.sellerType
                      )}
                    </span>

                    {typeof payload.invoiceNumber === 'string' && payload.invoiceNumber && (
                      <span>
                        Счёт: {' '}
                        {String(
                          payload.invoiceNumber
                        )}
                      </span>
                    )}
                  </div>


                  {resultFiles.length > 0 && (
                    <div className="powerFiles">
                      <span>
                        Готовая доверенность
                      </span>

                      {resultFiles.map(
                        (file) => (
                        <a
                          key={file.id}
                          href={dealFileUrl(
                            file.id
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {file.originalName}
                        </a>
                      ))}
                    </div>
                  )}


                  {sourceFiles.length > 0 &&
                    resultFiles.length === 0 && (
                    <div className="powerFiles powerSourceFiles">
                      <span>
                        Приложено к запросу
                      </span>

                      {sourceFiles.map(
                        (file) => (
                        <a
                          key={file.id}
                          href={dealFileUrl(
                            file.id
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {file.originalName}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}


      {user.role !== 'ACCOUNTANT' && (
        <button
          type="button"
          className={
            open
              ? 'secondary wide'
              : 'primary wide'
          }
          onClick={() =>
            setOpen(
              (value) => !value
            )
          }
        >
          {open
            ? 'Закрыть'
            : '+ Запросить доверенность'}
        </button>
      )}


      {open && (
        <div className="powerForm">

          <label className="field">
            <span>Поставщик / завод</span>
            <input
              list="power-suppliers"
              value={supplierName}
              onChange={(e) =>
                setSupplierName(
                  e.target.value
                )
              }
              placeholder="Например: ДЗГИ"
            />
            <datalist id="power-suppliers">
              {supplierOptions.map(
                (name) => (
                <option
                  key={name}
                  value={name}
                />
              ))}
            </datalist>
          </label>


          <label className="field">
            <span>От какой организации</span>
            <div className="segmented">
              {(['ST', 'MSM', 'IP'] as SellerType[])
                .map(
                  (type) => (
                  <button
                    key={type}
                    type="button"
                    className={
                      organization === type
                        ? 'selected'
                        : ''
                    }
                    onClick={() =>
                      setOrganization(type)
                    }
                  >
                    {sellerLabels[type]}
                  </button>
                ))}
            </div>
          </label>


          <label className="field">
            <span>На кого</span>
            <input
              value={recipientName}
              onChange={(e) =>
                setRecipientName(
                  e.target.value
                )
              }
              placeholder="ФИО получателя"
            />
          </label>


          <div className="inline">
            <label className="field">
              <span>Входящий счёт</span>
              <input
                value={invoiceNumber}
                onChange={(e) =>
                  setInvoiceNumber(
                    e.target.value
                  )
                }
                placeholder="Номер, если есть"
              />
            </label>

            <label className="field">
              <span>Дата</span>
              <input
                type="date"
                value={requestDate}
                onChange={(e) =>
                  setRequestDate(
                    e.target.value
                  )
                }
              />
            </label>
          </div>


          <label className="field">
            <span>Что получаем</span>
            <textarea
              rows={3}
              value={goodsDescription}
              onChange={(e) =>
                setGoodsDescription(
                  e.target.value
                )
              }
              placeholder="Материал, объём, позиции"
            />
          </label>


          <label className="field">
            <span>Комментарий</span>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) =>
                setComment(
                  e.target.value
                )
              }
              placeholder="Необязательно"
            />
          </label>


          <label className="field">
            <span>Документы к доверенности</span>
            <MultiFilePicker
              files={files}
              onChange={setFiles}
              title="+ Прикрепить документы"
            />
          </label>


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
            <span>Срочно</span>
          </label>


          <button
            type="button"
            className="primary wide"
            disabled={saving}
            onClick={submit}
          >
            {saving
              ? 'Отправляем…'
              : 'Отправить бухгалтерии'}
          </button>
        </div>
      )}


      {error && (
        <div className="error">{error}</div>
      )}

    </div>
  );
}


export function PowerOfAttorneyTask({
  task,
  user,
  onBack,
}: {
  task: Task;
  user: CurrentUser;
  onBack: () => void;
}) {

  const [status, setStatus] =
    useState(task.status);

  const [files, setFiles] =
    useState<File[]>([]);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const payload =
    task.payload || {};

  const requestKey =
    String(
      payload.requestKey || ''
    );

  const sourceFiles =
    requestKey
      ? (task.deal.files || [])
          .filter(
            (file) =>
              file.category ===
              'POWER_OF_ATTORNEY_SOURCE_' +
              requestKey
          )
      : [];


  async function take() {
    setSaving(true);
    setError('');

    try {
      await updateTaskStatus(
        task.id,
        'IN_PROGRESS',
        user.id,
      );
      setStatus('IN_PROGRESS');
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


  function finish() {
    setError('');

    if (files.length === 0) {
      setError(
        'Прикрепите готовую доверенность.'
      );
      return;
    }

    const filesToUpload =
      [...files];

    setFiles([]);

    startBackgroundUploadJob({
      taskId: task.id,
      dealId: task.deal.id,
      title:
        'Загружаем доверенность',
      successTitle:
        'Доверенность готова',
      subtitle:
        String(
          payload.supplierName ||
          task.deal.clientName
        ),
      files: filesToUpload,

      run: async ({
        upload,
        setProgress,
      }) => {
        for (
          let index = 0;
          index < filesToUpload.length;
          index++
        ) {
          await upload(
            task.deal.id,
            filesToUpload[index],
            'POWER_OF_ATTORNEY_RESULT_' +
            task.id,
            index,
            filesToUpload.length,
          );
        }

        setProgress(95);
        await completePowerOfAttorneyTask(
          task.id,
          user.id,
        );
        setProgress(99);
      },
    });

    onBack();
  }


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
          ЗК-{task.deal.internalNumber}
        </div>

        <h2>Сделать доверенность</h2>

        <p>
          {String(
            payload.supplierName ||
            task.deal.clientName
          )}
        </p>

        <div className="statusPill">
          {taskStatusLabel(status)}
        </div>

        {task.urgent && (
          <b className="urgent">
            СРОЧНО
          </b>
        )}
      </div>


      <div className="powerTaskGrid">
        <div>
          <span>От организации</span>
          <b>
            {sellerLabels[
              String(
                payload.organization ||
                task.deal.sellerType
              ) as SellerType
            ] ||
            String(
              payload.organization ||
              task.deal.sellerType
            )}
          </b>
        </div>

        <div>
          <span>На кого</span>
          <b>
            {String(
              payload.recipientName || '—'
            )}
          </b>
        </div>

        <div>
          <span>Входящий счёт</span>
          <b>
            {String(
              payload.invoiceNumber || '—'
            )}
          </b>
        </div>

        <div>
          <span>Дата</span>
          <b>
            {payload.requestDate
              ? new Date(
                  String(
                    payload.requestDate
                  ) + 'T12:00:00'
                ).toLocaleDateString(
                  'ru-RU'
                )
              : '—'}
          </b>
        </div>
      </div>


      <div className="infoBox">
        <strong>Что получаем</strong>
        <p>
          {String(
            payload.goodsDescription || '—'
          )}
        </p>
      </div>


      {task.description && (
        <div className="infoBox">
          <strong>Комментарий менеджера</strong>
          <p>{task.description}</p>
        </div>
      )}


      {sourceFiles.length > 0 && (
        <div className="infoBox">
          <strong>Документы к запросу</strong>
          <div className="versionList">
            {sourceFiles.map(
              (file) => (
              <div
                key={file.id}
                className="versionRow"
              >
                <div>
                  <b>{file.originalName}</b>
                </div>
                <a
                  href={dealFileUrl(
                    file.id
                  )}
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
        <button
          type="button"
          className="primary wide"
          disabled={saving}
          onClick={take}
        >
          {saving ? 'Сохраняем…' : 'В работу'}
        </button>
      )}


      {status === 'IN_PROGRESS' && (
        <>
          <label className="field">
            <span>Готовая доверенность</span>
            <MultiFilePicker
              files={files}
              onChange={setFiles}
              title="+ Прикрепить доверенность"
            />
          </label>

          <button
            type="button"
            className="primary wide"
            disabled={saving}
            onClick={finish}
          >
            Доверенность готова
          </button>
        </>
      )}


      {error && (
        <div className="error">{error}</div>
      )}

    </section>
  );
}
