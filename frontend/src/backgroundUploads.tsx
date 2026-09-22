
import {
  useEffect,
  useState,
} from 'react';

import {
  uploadDealFileWithProgress,
} from './api';


export type BackgroundUploadJob = {

  id: string;

  taskId?: string;

  dealId?: string;

  successTitle?: string;

  title: string;

  subtitle?: string;

  status:
    | 'RUNNING'
    | 'SUCCESS'
    | 'ERROR';

  progress: number;

  currentFile?: string;

  completedFiles: number;

  totalFiles: number;

  error?: string;
};


let jobs:
  BackgroundUploadJob[] = [];


const listeners =
  new Set<
    (
      jobs:
        BackgroundUploadJob[]
    ) => void
  >();


function emit() {

  const snapshot =
    [...jobs];


  for (
    const listener
    of listeners
  ) {

    listener(
      snapshot
    );
  }
}


function updateJob(
  id: string,
  patch:
    Partial<
      BackgroundUploadJob
    >,
) {

  jobs =
    jobs.map(
      (job) =>
        job.id === id
          ? {
              ...job,
              ...patch,
            }
          : job
    );


  emit();
}


export function dismissBackgroundUpload(
  id: string,
) {

  jobs =
    jobs.filter(
      (job) =>
        job.id !== id
    );


  emit();
}


export function useBackgroundUploads() {

  const [
    value,
    setValue,
  ] = useState<
    BackgroundUploadJob[]
  >([...jobs]);


  useEffect(
    () => {

      listeners.add(
        setValue
      );


      setValue(
        [...jobs]
      );


      return () => {

        listeners.delete(
          setValue
        );
      };
    },

    [],
  );


  return value;
}


export function startBackgroundUploadJob(
  options: {

    taskId?: string;

    dealId?: string;

    successTitle?: string;

    title: string;

    subtitle?: string;

    files: File[];

    run: (
      helpers: {

        upload: (
          dealId: string,
          file: File,
          category: string,
          index: number,
          total: number,
        ) =>
          Promise<{
            id: string;
          }>;

        setProgress: (
          percent: number
        ) => void;
      },
    ) =>
      Promise<void>;
  },
) {

  const id =
    'upload-' +
    Date.now() +
    '-' +
    Math.random()
      .toString(36)
      .slice(2);


  const totalFiles =
    options.files.length;


  jobs = [
    {
      id,

      taskId:
        options.taskId,

      dealId:
        options.dealId,

      successTitle:
        options.successTitle,

      title:
        options.title,

      subtitle:
        options.subtitle,

      status:
        'RUNNING',

      progress:
        totalFiles
          ? 0
          : 15,

      completedFiles:
        0,

      totalFiles,
    },

    ...jobs,
  ];


  emit();


  void (
    async () => {

      try {

        await options.run({

          setProgress:
            (percent) => {

              updateJob(
                id,
                {
                  progress:
                    Math.max(
                      0,
                      Math.min(
                        99,
                        percent
                      )
                    ),
                }
              );
            },


          upload:
            async (
              dealId,
              file,
              category,
              index,
              total,
            ) => {

              updateJob(
                id,
                {
                  currentFile:
                    file.name,
                }
              );


              const uploaded =
                await uploadDealFileWithProgress(
                  dealId,
                  file,
                  category,

                  (
                    filePercent,
                  ) => {

                    const denominator =
                      Math.max(
                        total,
                        1
                      );


                    const overall =
                      (
                        (
                          index +
                          filePercent /
                            100
                        ) /
                        denominator
                      ) *
                      90;


                    updateJob(
                      id,
                      {
                        progress:
                          Math.round(
                            overall
                          ),
                      }
                    );
                  }
                );


              updateJob(
                id,
                {
                  completedFiles:
                    index + 1,

                  progress:
                    Math.round(
                      (
                        (
                          index + 1
                        ) /
                        Math.max(
                          total,
                          1
                        )
                      ) *
                      90
                    ),
                }
              );


              return uploaded;
            },
        });


        updateJob(
          id,
          {
            status:
              'SUCCESS',

            progress:
              100,

            currentFile:
              undefined,
          }
        );


        window.setTimeout(
          () => {

            dismissBackgroundUpload(
              id
            );
          },

          8000,
        );


      } catch (error) {

        updateJob(
          id,
          {
            status:
              'ERROR',

            error:
              error instanceof Error
                ? error.message
                : String(error),

            currentFile:
              undefined,
          }
        );
      }
    }
  )();


  return id;
}


export function BackgroundUploadList({
  jobs,
}: {
  jobs:
    BackgroundUploadJob[];
}) {

  if (
    jobs.length === 0
  ) {
    return null;
  }


  return (

    <div className="backgroundUploadList">

      {jobs.map(
        (job) => (

        <div
          key={job.id}

          className={
            'backgroundUploadCard ' +
            'backgroundUpload-' +
            job.status
              .toLowerCase()
          }
        >

          <div className="backgroundUploadTop">

            <div>

              <strong>
                {
                  job.status ===
                  'SUCCESS'

                    ? '✓ ' +
                      (job.successTitle ||
                        job.title)

                    : job.status ===
                        'ERROR'

                      ? 'Ошибка загрузки'

                      : job.title
                }
              </strong>


              {job.subtitle && (

                <span>
                  {job.subtitle}
                </span>

              )}

            </div>


            <b>
              {job.progress}%
            </b>

          </div>


          <div className="backgroundUploadBar">

            <div
              style={{
                width:
                  job.progress +
                  '%',
              }}
            />

          </div>


          {job.status ===
            'RUNNING' && (

            <div className="backgroundUploadMeta">

              {job.totalFiles > 0
                ? (
                    job.completedFiles +
                    ' из ' +
                    job.totalFiles +
                    ' файлов'
                  )
                : 'Сохраняем данные…'}

              {job.currentFile &&
                ' · ' +
                job.currentFile}

            </div>

          )}


          {job.status ===
            'ERROR' && (

            <>

              <div className="backgroundUploadError">
                {job.error}
              </div>

              <button
                type="button"
                className="secondary compactButton"

                onClick={() =>
                  dismissBackgroundUpload(
                    job.id
                  )
                }
              >
                Скрыть
              </button>

            </>

          )}

        </div>

      ))}

    </div>
  );
}
