/* MSM_DOCUMENT_FLOW_V9: one document surface per form. */
import { MultiFilePicker, SingleFilePicker } from './MultiFilePicker';

/** Manager: any number of files, no document-type selector. Historic primary stays primary. */
export function ManagerDocumentPicker({
  files, onChange, primaryFile, onPrimaryChange, accept,
}: {
  files: File[];
  onChange: (next: File[]) => void;
  primaryFile?: File | null;
  onPrimaryChange?: (file: File | null) => void;
  accept?: string;
}) {
  const combined = primaryFile ? [primaryFile, ...files.filter(item => item !== primaryFile)] : files;
  return <div className="msmV9Documents msmV9Manager">
    <MultiFilePicker
      files={combined}
      onChange={next => {
        // Never auto-classify a new manager attachment. Accountant reviews the documents.
        const retainedPrimary = primaryFile && next.includes(primaryFile) ? primaryFile : null;
        onPrimaryChange?.(retainedPrimary);
        onChange(retainedPrimary ? next.filter(item => item !== retainedPrimary) : next);
      }}
      title="Прикрепить файл"
      accept={accept ?? 'application/pdf,image/*,.doc,.docx,.xls,.xlsx,.xml,.txt,.csv'}
    />
  </div>;
}

/** Accountant: a task supplies the document's purpose; one selected file, no type field. */
export function AccountantDocumentPicker({
  files, onChange, accept,
}: {
  files: File[];
  onChange: (next: File[]) => void;
  accept?: string;
}) {
  const current = files.length ? files[files.length - 1] : null;
  return <div className="msmV9Documents msmV9Accountant">
    <SingleFilePicker
      file={current}
      onChange={file => onChange(file ? [file] : [])}
      title="Прикрепить файл"
      accept={accept ?? 'application/pdf,image/*,.xml'}
    />
    {files.length > 1 && <small className="msmV9LegacyNotice">
      В старом черновике несколько файлов. При выборе нового документа он заменит их.
    </small>}
  </div>;
}
