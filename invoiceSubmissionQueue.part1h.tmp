import {
  createInvoice,
} from './api';

import {
  startBackgroundUploadJob,
} from './backgroundUploads';

import {
  clearInvoiceTaskDraft,
  loadInvoiceTaskDraftFiles,
  saveInvoiceTaskDraftFiles,
} from './invoiceTaskDraft';


const PENDING_KEY =
  'msm.invoice-submission-queue.v1';


type PendingInvoiceSubmission = {
  taskId: string;
  dealId: string;
  clientName: string;
  number: string;
  amount?: number;
  invoiceDate: string;
  fileCount: number;
  uploadedFileIds:
    Array<string | null>;
};


type StartInvoiceSubmissionInput = {
  taskId: string;
  dealId: string;
  clientName: string;
  number: string;
  amount?: number;
  invoiceDate: string;
  actorId: string;
  files: File[];
};


const activeTaskIds =
  new Set<string>();


function readPendingSubmissions() {

  try {

    const raw =
      window.localStorage.getItem(
        PENDING_KEY
      );


    if (!raw) {
      return [] as
        PendingInvoiceSubmission[];
    }


    const parsed =
      JSON.parse(raw) as unknown;


    return Array.isArray(parsed)
      ? parsed as
          PendingInvoiceSubmission[]
      : [];

  } catch {

    return [];
  }
}


function writePendingSubmissions(
  items: PendingInvoiceSubmission[],
) {

  if (items.length === 0) {

    window.localStorage.removeItem(
      PENDING_KEY
    );

    return;
  }


  window.localStorage.setItem(
    PENDING_KEY,
    JSON.stringify(items),
  );
}


function savePendingSubmission(
  pending: PendingInvoiceSubmission,
) {

  const current =
    readPendingSubmissions();


  writePendingSubmissions([
    pending,

    ...current.filter(
      (item) =>
        item.taskId !==
        pending.taskId
    ),
  ]);
}


function markFileUploaded(
  taskId: string,
  index: number,
  fileId: string,
) {

  const next =
    readPendingSubmissions()
      .map((item) => {

        if (
          item.taskId !==
          taskId
        ) {
          return item;
        }


        const uploadedFileIds =
          [...item.uploadedFileIds];


        while (
          uploadedFileIds.length <
          item.fileCount
        ) {
          uploadedFileIds.push(
            null
          );
        }


        uploadedFileIds[index] =
          fileId;


        return {
          ...item,
          uploadedFileIds,
        };
      });


  writePendingSubmissions(
    next
  );
}


function clearPendingSubmission(
  taskId: string,
) {

  writePendingSubmissions(
    readPendingSubmissions()
      .filter(
        (item) =>
          item.taskId !== taskId
      )
  );
}


function startPendingJob(
  pending: PendingInvoiceSubmission,
  actorId: string,
  files: File[],
) {

  if (
    activeTaskIds.has(
      pending.taskId
    )
  ) {
    return;
  }


  activeTaskIds.add(
    pending.taskId
  );


  const uploadedFileIds = [
    ...pending.uploadedFileIds,
  ];


  while (
    uploadedFileIds.length <
    pending.fileCount
  ) {
    uploadedFileIds.push(
      null
    );
  }


  startBackgroundUploadJob({

    taskId:
      pending.taskId,

    dealId:
      pending.dealId,

    title:
      'Загружаем готовый счёт',

    successTitle:
      'Счёт отправлен',

    subtitle:
      pending.clientName,

    files,


    run:
      async ({
        upload,
        setProgress,
      }) => {

        for (
          let index = 0;
          index <
            pending.fileCount;
          index++
        ) {

          if (
            uploadedFileIds[index]
          ) {
            continue;
          }


          const file =
            files[index];


          if (!file) {

            activeTaskIds.delete(
              pending.taskId
            );

            throw new Error(
              'Не удалось восстановить файл счёта. Откройте задачу и прикрепите файл повторно.'
            );
          }


          const uploaded =
            await upload(

              pending.dealId,

              file,

              'CLIENT_INVOICE_ATTACHMENT',

              index,

              pending.fileCount,
            );


          uploadedFileIds[index] =
            uploaded.id;


          markFileUploaded(
            pending.taskId,
            index,
            uploaded.id,
          );
        }


        setProgress(94);


        await createInvoice(
          pending.dealId,
          {

            number:
              pending.number,

            amount:
              pending.amount,

            invoiceDate:
              pending.invoiceDate,

            fileId:
              uploadedFileIds[0] ||
              undefined,

            actorId,
          },
        );


        clearPendingSubmission(
          pending.taskId
        );


        await clearInvoiceTaskDraft(
          pending.taskId
        ).catch(
          () => undefined
        );


        activeTaskIds.delete(
          pending.taskId
        );


        setProgress(99);
      },
  });
}


export async function startInvoiceSubmission(
  input: StartInvoiceSubmissionInput,
) {

  await saveInvoiceTaskDraftFiles(
    input.taskId,
    input.files,
  );


  const pending:
    PendingInvoiceSubmission = {

      taskId:
        input.taskId,

      dealId:
        input.dealId,

      clientName:
        input.clientName,

      number:
        input.number,

      amount:
        input.amount,

      invoiceDate:
        input.invoiceDate,

      fileCount:
        input.files.length,

      uploadedFileIds:
        Array(
          input.files.length
        ).fill(null),
    };


  savePendingSubmission(
    pending
  );


  startPendingJob(
    pending,
    input.actorId,
    input.files,
  );
}


export async function resumePendingInvoiceSubmissions(
  actorId: string,
) {

  const pending =
    readPendingSubmissions();


  for (
    const item
    of pending
  ) {

    if (
      activeTaskIds.has(
        item.taskId
      )
    ) {
      continue;
    }


    try {

      const files =
        await loadInvoiceTaskDraftFiles(
          item.taskId
        );


      startPendingJob(
        item,
        actorId,
        files,
      );

    } catch (error) {

      console.warn(
        'Не удалось восстановить отправку счёта',
        error,
      );
    }
  }
}
