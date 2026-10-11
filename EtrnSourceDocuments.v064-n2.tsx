/* PART_V064_N2_ETRN_SOURCE_DOCUMENTS */
import {
  dealFileUrl,
  type Task,
} from './api';

function sellerLabel(
  value: unknown,
) {
  return ({
    MSM: 'МСМ',
    ST: 'СТ',
    IP: 'ИП',
  } as Record<string, string>)[
    String(value || '')
  ] || String(value || '');
}

export function EtrnSourceDocuments({
  task,
}: {
  task: Task;
}) {
  if (
    task.type !==
    'ETRN'
  ) {
    return null;
  }

  const payload =
    (
      task.payload &&
      typeof task.payload ===
        'object'
    )
      ? task.payload as
          Record<
            string,
            unknown
          >
      : {};

  const details =
    task.details || {};

  const files =
    task.deal.files || [];

  const poaFile =
    files.find(
      (file) =>
        file.id ===
        String(
          payload.poaFileId ||
          ''
        )
    );

  const invoiceFile =
    files.find(
      (file) =>
        file.id ===
        String(
          payload.invoiceFileId ||
          ''
        )
    );

  const poaNumber =
    String(
      details.poaNumber ||
      payload.poaNumber ||
      ''
    );

  const invoiceNumber =
    String(
      details.invoiceNumber ||
      payload.invoiceNumber ||
      ''
    );

  const invoiceSellerType =
    String(
      details.invoiceSellerType ||
      payload.invoiceSellerType ||
      ''
    );

  return (
    <div className="etrnTaskDocs">
      <div className="taskStructuredTitle">
        Документы для ЭТРН
      </div>

      <div className="etrnAutoDocRow">
        <div>
          <span>
            Доверенность
          </span>
          <strong>
            № {poaNumber || '—'}
          </strong>
        </div>

        {poaFile ? (
          <a
            href={
              dealFileUrl(
                poaFile.id
              )
            }
            target="_blank"
            rel="noreferrer"
          >
            Открыть
          </a>
        ) : (
          <b className="etrnDocMissing">
            Файл не найден
          </b>
        )}
      </div>

      <div className="etrnAutoDocRow">
        <div>
          <span>
            Актуальный счёт
          </span>
          <strong>
            {
              invoiceNumber
                ? (
                    sellerLabel(
                      invoiceSellerType
                    ) +
                    ' - ' +
                    invoiceNumber
                  )
                : '—'
            }
          </strong>
        </div>

        {invoiceFile ? (
          <a
            href={
              dealFileUrl(
                invoiceFile.id
              )
            }
            target="_blank"
            rel="noreferrer"
          >
            Открыть
          </a>
        ) : (
          <b className="etrnDocMissing">
            Файл не найден
          </b>
        )}
      </div>
    </div>
  );
}

/* END_PART_V064_N2_ETRN_SOURCE_DOCUMENTS */
