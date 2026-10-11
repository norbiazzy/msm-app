import {
  useState,
} from 'react';

import {
  resubmitTaskToAccounting,
} from './api';

import {
  startBackgroundUploadJob,
} from './backgroundUploads';

import {
  MultiFilePicker,
} from './MultiFilePicker';

import {
  TaskStructuredFields,
  type TaskDetails,
} from './TaskStructuredFields';


export function ManagerResubmitPanel({
  taskId,
  dealId,
  taskType,
  actorId,
  initialDescription,
  initialUrgent,
  initialDetails,
  onResubmitted,
}: {
  taskId: string;
  dealId: string;
  taskType: string;
  actorId: string;
  initialDescription?: string;
  initialUrgent: boolean;
  initialDetails?: TaskDetails;
  onResubmitted:
    () =>
      void |
      Promise<void>;
}) {

  const [
    description,
    setDescription,
  ] = useState(
    initialDescription || ''
  );

  const [
    urgent,
    setUrgent,
  ] = useState(
    initialUrgent
  );

  const [
    details,
    setDetails,
  ] = useState<TaskDetails>(
    initialDetails || {}
  );

  const [
    files,
    setFiles,
  ] = useState<File[]>([]);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');


  function payload() {
    /* PART_V062_POA_RESUBMIT_DETAILS */
    const taskDetails =
      taskType ===
      'POWER_OF_ATTORNEY'
        ? {
            supplierOrFactory:
              details
                .supplierOrFactory,
            attorneyPerson:
              details
                .attorneyPerson,
            items:
              details.items,
          }
        : details;

    return {
      actorId,
      description:
        description.trim() ||
        undefined,
      urgent,
      details:
        taskDetails,
    };
  }


  async function submit() {
    const data =
      payload();

    if (
      files.length === 0
    ) {
      setSaving(true);
      setError('');

      try {
        await resubmitTaskToAccounting(
          taskId,
          data,
        );

        await onResubmitted();
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : String(e)
        );
      } finally {
        setSaving(false);
      }

      return;
    }


    setError('');

    const filesToUpload =
      [...files];


    startBackgroundUploadJob({
      taskId,
      dealId,

      title:
        taskType ===
          'POWER_OF_ATTORNEY'
          ? 'Повторно отправляем доверенность'
          : taskType ===
              'ETRN'
            ? 'Повторно отправляем ЭТРН'
            : 'Повторно отправляем задачу',

      successTitle:
        'Задача повторно отправлена',

      files:
        filesToUpload,

      run:
        async ({
          upload,
          setProgress,
        }) => {

          for (
            let index = 0;
            index <
              filesToUpload.length;
            index++
          ) {
            await upload(
              dealId,
              filesToUpload[index],
              'TASK_ATTACHMENT_' +
                taskId,
              index,
              filesToUpload.length,
            );
          }

          setProgress(94);

          await resubmitTaskToAccounting(
            taskId,
            data,
          );

          setProgress(99);
        },
    });


    setFiles([]);

    await onResubmitted();
  }


  return (
    <div className="managerResubmitPanel">

      <div className="managerResubmitHead">
        <strong>
          Исправьте заявку и отправьте повторно
        </strong>

        <span>
          Измените только то, что нужно исправить.
          Повторно уйдёт эта же задача —
          старые данные и документы сохраняются.
        </span>
      </div>


      <TaskStructuredFields
        taskType={taskType}
        value={details}
        onChange={setDetails}
      />


      <label className="field">
        {/* PART_V062_POA_RESUBMIT_COMMENT */}
        <span>
          {taskType ===
          'POWER_OF_ATTORNEY'
            ? 'Комментарий для бухгалтерии'
            : 'Общий комментарий'}
        </span>

        <textarea
          rows={4}
          value={description}
          disabled={saving}
          onChange={(event) =>
            setDescription(
              event.target.value
            )
          }
          placeholder="Дополнительный комментарий"
        />
      </label>


      <div className="field">
        <span>
          Новые документы
        </span>

        <MultiFilePicker
          files={files}
          onChange={setFiles}
          title="+ Прикрепить документы"
        />
      </div>


      <label className="urgentToggle">
        <input
          type="checkbox"
          checked={urgent}
          disabled={saving}
          onChange={(event) =>
            setUrgent(
              event.target.checked
            )
          }
        />

        <span>
          Срочно
        </span>
      </label>


      {error && (
        <div className="error">
          {error}
        </div>
      )}


      <button
        type="button"
        className="primary wide"
        disabled={saving}
        onClick={() =>
          void submit()
        }
      >
        {
          saving
            ? 'Отправляем…'
            : 'Сохранить и повторно отправить бухгалтерии'
        }
      </button>

    </div>
  );
}
