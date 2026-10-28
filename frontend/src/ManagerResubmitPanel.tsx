import { AutoTextarea } from './AutoTextarea';
import {
  useState,
} from 'react';

import { resubmitStructuredTask, taskAttachmentCategory, taskResubmitTitle } from './taskWorkflow';

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
    // Retain every existing field, including type-specific metadata not
    // represented by visible inputs. Never throw away task details.
    const taskDetails = { ...(initialDetails || {}), ...details };

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
        await resubmitStructuredTask({ taskId, taskType, ...data });

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
      scope: 'TASK',

      title: taskResubmitTitle(taskType),

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
              taskAttachmentCategory(taskId),
              index,
              filesToUpload.length,
            );
          }

          setProgress(94);

          await resubmitStructuredTask({ taskId, taskType, ...data });

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

        <AutoTextarea
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
