export type TaskDetails =
  Record<string, unknown>;


function stringValue(
  value: unknown,
) {
  return typeof value === 'string'
    ? value
    : '';
}


function Field({
  title,
  value,
  onChange,
  readOnly,
  multiline = false,
  type = 'text',
}: {
  title: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly: boolean;
  multiline?: boolean;
  type?: string;
}) {

  if (readOnly) {
    return (
      <div className="taskStructuredReadRow">
        <span>{title}</span>
        <b>{value || '—'}</b>
      </div>
    );
  }

  return (
    <label className="field">
      <span>{title}</span>

      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={(event) =>
            onChange?.(
              event.target.value
            )
          }
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) =>
            onChange?.(
              event.target.value
            )
          }
        />
      )}
    </label>
  );
}


export function TaskStructuredFields({
  taskType,
  value,
  onChange,
  readOnly = false,
}: {
  taskType: string;
  value?: TaskDetails;
  onChange?: (
    value: TaskDetails
  ) => void;
  readOnly?: boolean;
}) {

  const details =
    value || {};


  function set(
    key: string,
    nextValue: string,
  ) {
    onChange?.({
      ...details,
      [key]:
        nextValue,
    });
  }


  /* PART_V062_POA_FIELDS */
  if (
    taskType ===
    'POWER_OF_ATTORNEY'
  ) {
    return (
      <div className={
        readOnly
          ? 'taskStructuredRead'
          : 'taskStructuredEdit'
      }>
        <div className="taskStructuredTitle">
          Данные доверенности
        </div>

        <Field
          title="Поставщик / завод"
          value={stringValue(
            details.supplierOrFactory
          )}
          readOnly={readOnly}
          onChange={(next) =>
            set(
              'supplierOrFactory',
              next
            )
          }
        />

        <Field
          title="На кого доверенность"
          value={stringValue(
            details.attorneyPerson
          )}
          readOnly={readOnly}
          multiline
          onChange={(next) =>
            set(
              'attorneyPerson',
              next
            )
          }
        />

        <Field
          title="Что получаем"
          value={stringValue(
            details.items
          )}
          readOnly={readOnly}
          multiline
          onChange={(next) =>
            set(
              'items',
              next
            )
          }
        />
      </div>
    );
  }


  // PART_V064_N2_ETRN_STRUCTURED_FIELDS
  if (
    taskType ===
    'ETRN'
  ) {
    const invoiceNumber = stringValue(details.invoiceNumber);
    const invoiceSellerType = stringValue(details.invoiceSellerType);
    const invoiceSellerLabel = ({
      MSM: 'МСМ',
      ST: 'СТ',
      IP: 'ИП',
    } as Record<string, string>)[invoiceSellerType] || invoiceSellerType;
    const invoiceDisplay = invoiceNumber
      ? invoiceSellerLabel + ' - ' + invoiceNumber
      : '';

    return (
      <div className={readOnly ? 'taskStructuredRead' : 'taskStructuredEdit'}>
        <div className="taskStructuredTitle">Данные ЭТРН</div>

        <Field
          title="№ доверенности"
          value={stringValue(details.poaNumber)}
          readOnly
          onChange={() => {}}
        />

        <Field
          title="Актуальный счёт"
          value={invoiceDisplay}
          readOnly
          onChange={() => {}}
        />

        <Field
          title="Адрес погрузки"
          value={stringValue(details.loadingAddress)}
          readOnly={readOnly}
          multiline
          onChange={(next) => set('loadingAddress', next)}
        />

        <Field
          title="Адрес выгрузки"
          value={stringValue(details.unloadingAddress)}
          readOnly={readOnly}
          multiline
          onChange={(next) => set('unloadingAddress', next)}
        />

        <Field
          title="Контакт на объекте — имя"
          value={stringValue(details.objectContactName)}
          readOnly={readOnly}
          onChange={(next) => set('objectContactName', next)}
        />

        <Field
          title="Контакт на объекте — телефон"
          value={stringValue(details.objectContactPhone)}
          readOnly={readOnly}
          onChange={(next) => set('objectContactPhone', next)}
        />

        <Field
          title="Перевозчик / ООО"
          value={stringValue(details.carrierCompany)}
          readOnly={readOnly}
          onChange={(next) => set('carrierCompany', next)}
        />

        <Field
          title="Перевозчик — контактное лицо"
          value={stringValue(details.carrierContactName)}
          readOnly={readOnly}
          onChange={(next) => set('carrierContactName', next)}
        />

        <Field
          title="Перевозчик — телефон"
          value={stringValue(details.carrierPhone)}
          readOnly={readOnly}
          onChange={(next) => set('carrierPhone', next)}
        />
      </div>
    );
  }


  return null;
}
