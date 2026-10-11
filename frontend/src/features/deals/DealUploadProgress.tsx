import type { BackgroundUploadJob } from '../../backgroundUploads';

export function DealUploadProgress({
  dealUploadJob,
  invoiceRequestUploadJob,
}: {
  dealUploadJob?: BackgroundUploadJob;
  invoiceRequestUploadJob?: BackgroundUploadJob;
}) {
  return (
    <>
      {/* PART_V064_O22_EXISTING_DEAL_UPLOAD_PROGRESS */}
      {dealUploadJob && (
        <div className={'dealGeneralUploadProgress dealUpload-' + dealUploadJob.status.toLowerCase()}>
          <div className="dealGeneralUploadTop">
            <strong>
              {dealUploadJob.status === 'SUCCESS'
                ? '✓ ' + (dealUploadJob.successTitle || dealUploadJob.title)
                : dealUploadJob.status === 'ERROR'
                  ? 'Ошибка отправки документов'
                  : '↑ ' + dealUploadJob.title}
            </strong>
            <b>{dealUploadJob.progress}%</b>
          </div>

          <div className="dealGeneralUploadBar">
            <span style={{
              width: Math.max(0, Math.min(100, dealUploadJob.progress)) + '%',
            }} />
          </div>

          <div className="dealGeneralUploadMeta">
            {dealUploadJob.status === 'RUNNING'
              ? (dealUploadJob.totalFiles > 0
                  ? dealUploadJob.completedFiles + ' из ' + dealUploadJob.totalFiles + ' файлов'
                  : 'Выполняем запрос…')
              : dealUploadJob.status === 'SUCCESS'
                ? 'Готово'
                : (dealUploadJob.error || 'Не удалось завершить отправку')}
            {dealUploadJob.currentFile ? ' · ' + dealUploadJob.currentFile : ''}
          </div>
        </div>
      )}


      {/* PART_V064_O19_V3_UNIFIED_UPLOAD_UX */}
      {invoiceRequestUploadJob && (
        <div
          className={
            'dealPageUploadProgress taskUpload-' +
            invoiceRequestUploadJob.status.toLowerCase()
          }
        >
          <div className="taskUploadTop">
            <strong>
              {
                invoiceRequestUploadJob.status === 'SUCCESS'
                  ? '✓ ' +
                    (
                      invoiceRequestUploadJob.successTitle ||
                      invoiceRequestUploadJob.title
                    )
                  : invoiceRequestUploadJob.status === 'ERROR'
                    ? 'Ошибка загрузки'
                    : '↑ ' +
                      invoiceRequestUploadJob.title
              }
            </strong>

            <b>
              {invoiceRequestUploadJob.progress}%
            </b>
          </div>

          <div className="taskUploadBar">
            <div
              style={{
                width:
                  Math.max(
                    0,
                    Math.min(
                      100,
                      invoiceRequestUploadJob.progress
                    )
                  ) + '%',
              }}
            />
          </div>

          <div className="taskUploadMeta">
            {
              invoiceRequestUploadJob.status === 'RUNNING'
                ? (
                    invoiceRequestUploadJob.totalFiles > 0
                      ? (
                          invoiceRequestUploadJob.completedFiles +
                          ' из ' +
                          invoiceRequestUploadJob.totalFiles +
                          ' файлов'
                        )
                      : 'Сохраняем данные…'
                  )
                : invoiceRequestUploadJob.status === 'SUCCESS'
                  ? 'Готово'
                  : (
                      invoiceRequestUploadJob.error ||
                      'Не удалось загрузить файлы'
                    )
            }

            {
              invoiceRequestUploadJob.currentFile
                ? ' · ' +
                  invoiceRequestUploadJob.currentFile
                : ''
            }
          </div>
        </div>
      )}
    </>
  );
}
