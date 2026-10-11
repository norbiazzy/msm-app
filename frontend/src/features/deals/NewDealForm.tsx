import { type FormEvent, useState } from 'react';
import { Field } from '../../shared/Field';
import { sellerLabels } from '../../shared/formatters';
import { SingleFilePicker } from '../../MultiFilePicker';
import { startBackgroundUploadJob } from '../../backgroundUploads';
import { createDeal, submitInvoiceRequest } from '../../api';
import type { CurrentUser, SellerType } from '../../types';

export function NewDealForm({ user, onCancel, onCreated }: { user: CurrentUser; onCancel: () => void; onCreated: () => void }) {

  /* PART_V061_SELLER_REQUIRED */
  const [sellerType, setSellerType] =
    useState<SellerType | ''>('');

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

      /* PART_V061_VALIDATE_SELLER */
      if (!sellerType) {
        setError(
          'Выберите, от какой организации выставлять счёт: СТ, МСМ или ИП.'
        );
        return;
      }


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


      // PART_V064_O20_DEAL_ON_MANAGER_SUBMIT
      // Сделка уже создана выше.
      // Сразу запускаем фоновую отправку и возвращаем
      // менеджера в список сделок. Создание задачи
      // бухгалтеру больше не блокирует появление сделки.
      startBackgroundUploadJob({

        dealId:
          deal.id,

        title:
          filesToUpload.length > 0
            ? 'Отправляем бухгалтерии'
            : 'Создаём запрос на счёт',

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


            setProgress(
              filesToUpload.length > 0
                ? 96
                : 70
            );

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


      // С этого момента ЗК уже должна быть видна
      // менеджеру в списке сделок независимо от
      // скорости загрузки файлов / создания задачи.
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


      <Field title="Документы / реквизиты">

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




      <Field title="Комментарий для бухгалтерии">

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
