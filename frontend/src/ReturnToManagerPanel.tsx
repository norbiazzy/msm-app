import {
  useState,
} from 'react';

import { TASK_RETURN_REASONS, returnTaskForCorrection, validateTaskReturnReason, type TaskReturnReasonCode } from './taskWorkflow';

export function ReturnToManagerPanel({
  taskId,
  actorId,
  disabled = false,
  mode = 'generic',
  taskType,
  onReturned,
}: {
  taskId: string;
  actorId: string;
  disabled?: boolean;
  mode?: 'generic' | 'invoice';
  taskType?: string;
  onReturned:
    () =>
      void |
      Promise<void>;
}) {

  const [
    open,
    setOpen,
  ] = useState(false);


  const [
    reasonCode,
    setReasonCode,
  ] = useState<
    TaskReturnReasonCode
  >(
    'MISSING_DATA'
  );


  const [
    comment,
    setComment,
  ] = useState('');


  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState('');


  async function submit() {

    const normalizedComment =
      comment.trim();


    const validationError = validateTaskReturnReason(reasonCode,normalizedComment);
    if (validationError) {
      setError(validationError);
      return;
    }


    setSaving(true);
    setError('');


    try {

      await returnTaskForCorrection({
        taskId,
        taskType: taskType || (mode === 'invoice' ? 'ISSUE_CLIENT_INVOICE' : 'OTHER'),
        actorId,
        reasonCode,
        comment: normalizedComment || undefined,
      });

      setOpen(false);

      setReasonCode(
        'MISSING_DATA'
      );

      setComment('');


      await onReturned();


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
    <>

      <button
        type="button"
        className="secondary wide"
        disabled={
          disabled ||
          saving
        }
        onClick={() => {
          setError('');
          setOpen(true);
        }}
      >
        Вернуть менеджеру
      </button>


      {open && (

        <div
          className="appModalBackdrop"
          onClick={() => {

            if (!saving) {
              setOpen(false);
            }
          }}
        >

          <div
            className="appModal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <strong>
              Вернуть менеджеру
            </strong>


            <p>
              Задача вернётся менеджеру
              со всеми текущими данными
              и вложениями.
            </p>


            <label className="field">

              <span>
                Причина возврата
              </span>

              <select
                value={
                  reasonCode
                }
                disabled={saving}
                onChange={(event) => {

                  setReasonCode(
                    event.target
                      .value as
                      TaskReturnReasonCode
                  );

                  setError('');
                }}
              >

                {TASK_RETURN_REASONS.map(
                  (reason) => (

                  <option
                    key={
                      reason.value
                    }
                    value={
                      reason.value
                    }
                  >
                    {reason.label}
                  </option>

                ))}

              </select>

            </label>


            <label className="field">

              <span>
                Комментарий
                {
                  reasonCode !==
                    'OTHER' &&
                  ' · необязательно'
                }
              </span>

              <textarea
                rows={3}
                value={comment}
                disabled={saving}
                onChange={(event) =>
                  setComment(
                    event.target.value
                  )
                }
                placeholder="Что нужно исправить или уточнить"
              />

            </label>


            {error && (

              <div className="error">
                {error}
              </div>

            )}


            <div className="appModalActions">

              <button
                type="button"
                className="secondary"
                disabled={saving}
                onClick={() =>
                  setOpen(false)
                }
              >
                Отмена
              </button>


              <button
                type="button"
                className="dangerButton"
                disabled={saving}
                onClick={() =>
                  void submit()
                }
              >
                {
                  saving
                    ? 'Возвращаем…'
                    : 'Вернуть'
                }
              </button>

            </div>

          </div>

        </div>

      )}

    </>
  );
}
