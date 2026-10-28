import type { InvoiceReviewDraft } from '../../../InvoiceManagerReviewV10';
import { InvoiceManagerReviewV10 } from '../../../InvoiceManagerReviewV10';
import { AutoTextarea } from '../../../AutoTextarea';
/* MSM_FIXES_V10 */
/* MSM_DOCUMENT_FLOW_V9 */
import { ManagerDocumentPicker } from '../../../DocumentPickerV9';
import type { Dispatch, SetStateAction } from 'react';
import type { AuditEvent, Deal, DealTask, Invoice, SellerType, StoredFile } from '../../../types';
import type { BackgroundUploadJob } from '../../../backgroundUploads';
import { Field } from '../../../shared/Field';
import { sellerLabels } from '../../../shared/formatters';
import { dealFileUrl } from '../../../api';
import { InvoiceBlock } from './InvoiceViews';

type Setter<T> = Dispatch<SetStateAction<T>>;
type InvoiceRequestPanelProps = {
  invoiceReviewDraft: InvoiceReviewDraft | null;
  setInvoiceReviewDraft: (value: InvoiceReviewDraft) => void;
  deal: Deal;
  current: Invoice | undefined;
  canManageDeal: boolean;
  reviewerId: string;
  onInvoiceReviewed: () => Promise<void>;
  invoiceRequestEditOpen: boolean;
  setInvoiceRequestEditOpen: Setter<boolean>;
  invoiceRequestTask: DealTask | undefined;
  requestSellerType: SellerType;
  setRequestSellerType: Setter<SellerType>;
  saving: boolean;
  saveInvoiceRequestSeller: () => Promise<void>;
  invoiceRequestUploadJob: BackgroundUploadJob | undefined;
  invoiceRequestNeedsData: boolean;
  latestInvoiceReturn: AuditEvent | undefined;
  requestClientName: string;
  setRequestClientName: Setter<string>;
  requestRequestText: string;
  setRequestRequestText: Setter<string>;
  requestAccountingComment: string;
  setRequestAccountingComment: Setter<string>;
  currentCustomerInvoice: StoredFile | undefined;
  requestIncomingInvoice: File | null;
  setRequestIncomingInvoice: Setter<File | null>;
  requestExistingExtraFiles: StoredFile[];
  requestExtraFiles: File[];
  setRequestExtraFiles: Setter<File[]>;
  requestUrgent: boolean;
  setRequestUrgent: Setter<boolean>;
  sendInvoiceRequestAgain: () => Promise<void>;
  withdrawConfirmOpen: boolean;
  setWithdrawConfirmOpen: Setter<boolean>;
  withdrawRequest: () => Promise<void>;
};

export function InvoiceRequestPanel({
  invoiceReviewDraft, setInvoiceReviewDraft,
  deal,
  current,
  canManageDeal,
  reviewerId,
  onInvoiceReviewed,
  invoiceRequestEditOpen,
  setInvoiceRequestEditOpen,
  invoiceRequestTask,
  requestSellerType,
  setRequestSellerType,
  saving,
  saveInvoiceRequestSeller,
  invoiceRequestUploadJob,
  invoiceRequestNeedsData,
  latestInvoiceReturn,
  requestClientName,
  setRequestClientName,
  requestRequestText,
  setRequestRequestText,
  requestAccountingComment,
  setRequestAccountingComment,
  currentCustomerInvoice,
  requestIncomingInvoice,
  setRequestIncomingInvoice,
  requestExistingExtraFiles,
  requestExtraFiles,
  setRequestExtraFiles,
  requestUrgent,
  setRequestUrgent,
  sendInvoiceRequestAgain,
  withdrawConfirmOpen,
  setWithdrawConfirmOpen,
  withdrawRequest,
}: InvoiceRequestPanelProps) {
  return (
    <>
      <div
        id="dealCInvoice"
        className="dealCAnchor"
      >
      {current ? (

        <>
<InvoiceBlock
          showRecognition={canManageDeal}
          invoice={current}
          sellerType={
            current.sellerType ||
            deal.sellerType
          }
        />
        {canManageDeal && current.status === 'WAITING_MANAGER_REVIEW' && <InvoiceManagerReviewV10 invoice={current} draft={invoiceReviewDraft} onChange={setInvoiceReviewDraft} disabled={saving} />}
</>

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
      </div>


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





          {/* Upload progress is displayed in DealUploadProgress above. */}

          {(
            !invoiceRequestTask &&
            invoiceRequestEditOpen
          ) ? (

            <>

              {invoiceRequestNeedsData ? (

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

                <Field title="Позиции и стоимость">
                  <AutoTextarea
                    rows={5}
                    value={requestRequestText}
                    onChange={(e) =>
                      setRequestRequestText(
                        e.target.value
                      )
                    }
                    placeholder="Bonolit D500 — 32,4 м³ × 5 600 ₽…"
                  />
                </Field>


                <Field title="Комментарий бухгалтерии">
                  <AutoTextarea
                    rows={3}
                    value={requestAccountingComment}
                    onChange={(e) =>
                      setRequestAccountingComment(
                        e.target.value
                      )
                    }
                    placeholder="Условия, уточнения и всё, что нужно бухгалтеру для выставления счёта"
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


                <Field title="Документы">
                  <ManagerDocumentPicker primaryFile={requestIncomingInvoice} onPrimaryChange={setRequestIncomingInvoice} files={requestExtraFiles} onChange={setRequestExtraFiles} />
                </Field>


                {requestExistingExtraFiles.length > 0 && (
                  <div className="requestPreviousIncoming">
                    <span>
                      Документы / реквизиты, которые уже были отправлены бухгалтерии
                    </span>

                    <div className="versionList">
                      {requestExistingExtraFiles.map(
                        (file) => (
                          <div
                            className="versionRow"
                            key={file.id}
                          >
                            <div>
                              <b>{file.originalName}</b>
                              <span>Ранее отправленный документ</span>
                            </div>

                            <a
                              href={dealFileUrl(file.id)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Открыть
                            </a>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}


                


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

                <button
                  type="button"
                  className="primary wide"
                  disabled={saving}
                  onClick={sendInvoiceRequestAgain}
                >
                  {
                    saving
                      ? 'Отправляем…'
                      : invoiceRequestNeedsData
                        ? `Повторно запросить счёт от ${sellerLabels[requestSellerType]}`
                        : `Запросить счёт от ${sellerLabels[requestSellerType]}`
                  }
                </button>


                {invoiceRequestNeedsData ? (
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

            <>
              {/* PART_1N_I1_DEAL_REPAIR_MOVED */}

              {invoiceRequestNeedsData ? (

                <div className="invoiceRequestMovedToTask">
                  <div>
                    <strong>
                      Бухгалтерия вернула запрос
                    </strong>

                    <span>
                      Исправление теперь выполняется
                      непосредственно в задаче.
                    </span>
                  </div>

                  <a
                    className="primary"
                    href={
                      '#tasks/' +
                      encodeURIComponent(
                        invoiceRequestTask.id
                      )
                    }
                  >
                    Открыть задачу и исправить
                  </a>
                </div>

              ) : (

          

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

          

              )}

            </>

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
    </>
  );
}
