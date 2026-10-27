/* MSM_DOCUMENT_FLOW_V9 */
import { ManagerDocumentPicker } from '../../../DocumentPickerV9';
import type { Dispatch, SetStateAction } from 'react';
import type { Deal, Invoice, SellerType } from '../../../types';
import { Field } from '../../../shared/Field';
import { sellerLabels } from '../../../shared/formatters';
type Setter<T> = Dispatch<SetStateAction<T>>;
type InvoiceCorrectionPanelProps = {
  deal: Deal;
  current: Invoice | undefined;
  canManageInvoice: boolean;
  canConfirm: boolean;
  saving: boolean;
  openCorrectionEditor: () => void;
  confirm: () => Promise<void>;
  correctionUploadRunning: boolean;
  correctionWithdrawOpen: boolean;
  setCorrectionWithdrawOpen: Setter<boolean>;
  withdrawCorrectionRequest: () => Promise<void>;
  correctionOpen: boolean;
  setCorrectionOpen: Setter<boolean>;
  correctionSellerType: SellerType;
  setCorrectionSellerType: Setter<SellerType>;
  correction: string;
  setCorrection: Setter<string>;
  correctionPrimaryFile: File | null;
  setCorrectionPrimaryFile: Setter<File | null>;
  correctionFiles: File[];
  setCorrectionFiles: Setter<File[]>;
  urgent: boolean;
  setUrgent: Setter<boolean>;
  sendCorrection: () => Promise<void>;
};

export function InvoiceCorrectionPanel({
  deal,
  current,
  canManageInvoice,
  canConfirm,
  saving,
  openCorrectionEditor,
  confirm,
  correctionUploadRunning,
  correctionWithdrawOpen,
  setCorrectionWithdrawOpen,
  withdrawCorrectionRequest,
  correctionOpen,
  setCorrectionOpen,
  correctionSellerType,
  setCorrectionSellerType,
  correction,
  setCorrection,
  correctionPrimaryFile,
  setCorrectionPrimaryFile,
  correctionFiles,
  setCorrectionFiles,
  urgent,
  setUrgent,
  sendCorrection,
}: InvoiceCorrectionPanelProps) {
  return (
    <>
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
              {
                saving
                  ? 'Сохраняем…'
                  : 'Всё верно'
              }
            </button>
          )}

        </div>

      )}


      {current?.status ===
        'CORRECTION_REQUESTED' && (

        <div className="infoBox correctionPending">

          <div className="correctionPendingHead">
            <div>
              <strong>
                Счёт отправлен на корректировку
              </strong>

              <p>
                Текущая версия остаётся видна в истории. Пока бухгалтер не взял корректировку в работу, её можно отозвать.
              </p>
            </div>

            {canManageInvoice && (
              <button
                type="button"
                className="secondary compactButton"
                disabled={
                  saving ||
                  correctionUploadRunning
                }
                onClick={() =>
                  setCorrectionWithdrawOpen(true)
                }
              >
                {correctionUploadRunning
                  ? 'Загружаем документы…'
                  : 'Отозвать корректировку'}
              </button>
            )}
          </div>

        </div>

      )}


      {correctionWithdrawOpen &&
        current && (

        <div
          className="appModalBackdrop"
          onClick={() =>
            setCorrectionWithdrawOpen(false)
          }
        >
          <div
            className="appModal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <strong>
              Отозвать корректировку?
            </strong>

            <p>
              Если бухгалтер ещё не начал работу, задача на корректировку будет отменена, а текущая версия счёта вернётся в предыдущее состояние.
            </p>

            <div className="appModalActions">
              <button
                type="button"
                className="secondary"
                disabled={saving}
                onClick={() =>
                  setCorrectionWithdrawOpen(false)
                }
              >
                Не отзывать
              </button>

              <button
                type="button"
                className="dangerButton"
                disabled={saving}
                onClick={withdrawCorrectionRequest}
              >
                {saving
                  ? 'Отзываем…'
                  : 'Отозвать'}
              </button>
            </div>
          </div>
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


          <Field title="Документы для корректировки">
            <ManagerDocumentPicker primaryFile={correctionPrimaryFile} onPrimaryChange={setCorrectionPrimaryFile} files={correctionFiles} onChange={setCorrectionFiles} />
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
    </>
  );
}
