const FIELD_KEY_PREFIX =
  'msm.invoice-task-draft.v1:';

const DB_NAME =
  'msm-local-drafts';

const DB_VERSION = 1;

const FILE_STORE =
  'invoice-task-files';

export type InvoiceTaskDraftFields = {
  number: string;
  amount: string;
};

type InvoiceTaskFileRecord = {
  taskId: string;
  files: File[];
};

function fieldKey(taskId: string) {
  return FIELD_KEY_PREFIX + taskId;
}

export function readInvoiceTaskDraftFields(
  taskId: string,
): InvoiceTaskDraftFields {
  try {
    const raw =
      window.localStorage.getItem(
        fieldKey(taskId),
      );

    if (!raw) {
      return {
        number: '',
        amount: '',
      };
    }

    const parsed =
      JSON.parse(raw) as Partial<
        InvoiceTaskDraftFields
      >;

    return {
      number:
        typeof parsed.number === 'string'
          ? parsed.number
          : '',
      amount:
        typeof parsed.amount === 'string'
          ? parsed.amount
          : '',
    };
  } catch {
    return {
      number: '',
      amount: '',
    };
  }
}

export function saveInvoiceTaskDraftFields(
  taskId: string,
  fields: InvoiceTaskDraftFields,
) {
  window.localStorage.setItem(
    fieldKey(taskId),
    JSON.stringify(fields),
  );
}

function openDraftDb() {
  return new Promise<IDBDatabase>(
    (resolve, reject) => {
      const request =
        window.indexedDB.open(
          DB_NAME,
          DB_VERSION,
        );

      request.onupgradeneeded = () => {
        const db = request.result;

        if (
          !db.objectStoreNames.contains(
            FILE_STORE,
          )
        ) {
          db.createObjectStore(
            FILE_STORE,
            {
              keyPath: 'taskId',
            },
          );
        }
      };

      request.onsuccess = () =>
        resolve(request.result);

      request.onerror = () =>
        reject(
          request.error ||
            new Error(
              'Не удалось открыть локальное хранилище',
            ),
        );
    },
  );
}

export async function loadInvoiceTaskDraftFiles(
  taskId: string,
) {
  const db = await openDraftDb();

  try {
    return await new Promise<File[]>(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            FILE_STORE,
            'readonly',
          );

        const request =
          transaction
            .objectStore(FILE_STORE)
            .get(taskId);

        request.onsuccess = () => {
          const record =
            request.result as
              | InvoiceTaskFileRecord
              | undefined;

          resolve(
            Array.isArray(record?.files)
              ? record.files
              : [],
          );
        };

        request.onerror = () =>
          reject(
            request.error ||
              new Error(
                'Не удалось восстановить файлы черновика',
              ),
          );
      },
    );
  } finally {
    db.close();
  }
}

export async function saveInvoiceTaskDraftFiles(
  taskId: string,
  files: File[],
) {
  const db = await openDraftDb();

  try {
    await new Promise<void>(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            FILE_STORE,
            'readwrite',
          );

        const store =
          transaction.objectStore(
            FILE_STORE,
          );

        if (files.length > 0) {
          store.put({
            taskId,
            files,
          } satisfies InvoiceTaskFileRecord);
        } else {
          store.delete(taskId);
        }

        transaction.oncomplete = () =>
          resolve();

        transaction.onerror = () =>
          reject(
            transaction.error ||
              new Error(
                'Не удалось сохранить файлы черновика',
              ),
          );

        transaction.onabort = () =>
          reject(
            transaction.error ||
              new Error(
                'Сохранение файлов черновика отменено',
              ),
          );
      },
    );
  } finally {
    db.close();
  }
}

export async function clearInvoiceTaskDraft(
  taskId: string,
) {
  window.localStorage.removeItem(
    fieldKey(taskId),
  );

  const db = await openDraftDb();

  try {
    await new Promise<void>(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            FILE_STORE,
            'readwrite',
          );

        transaction
          .objectStore(FILE_STORE)
          .delete(taskId);

        transaction.oncomplete = () =>
          resolve();

        transaction.onerror = () =>
          reject(
            transaction.error ||
              new Error(
                'Не удалось удалить локальный черновик',
              ),
          );

        transaction.onabort = () =>
          reject(
            transaction.error ||
              new Error(
                'Удаление локального черновика отменено',
              ),
          );
      },
    );
  } finally {
    db.close();
  }
}
