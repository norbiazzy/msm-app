/* MSM_UNIFIED_ATTACHMENTS_V8: the same two-button control for every document field. */
import { useEffect, useRef, useState, type RefObject } from 'react';
import { dealFileUrl } from './api';
import { LibraryFileChooser, type LibrarySelection } from './LibraryFileChooser';

const REFERENCE_TYPE = 'application/x-msm-library-reference';

/** A tiny File reference; the original binary is never downloaded or re-uploaded. */
function asLibraryReference(selected: LibrarySelection): File {
  return new File([JSON.stringify({ fileId: selected.id })], selected.originalName, {
    type: REFERENCE_TYPE,
    lastModified: Date.now(),
  });
}

function isLibraryReference(file: File): boolean { return file.type === REFERENCE_TYPE; }

function useExternalLibrary() {
  const node = useRef<HTMLDivElement>(null);
  const [external, setExternal] = useState(false);
  useEffect(() => {
    const container = node.current?.closest('.msmDocumentPair, .msmPaymentEvidenceActions, .msmInvoiceSplitPicker');
    if (!container) return;
    // Previous v2/v3/v7 screens already have their own linked chooser.
    setExternal(Boolean(container.querySelector('.msmInvoiceLibraryControl')));
  }, []);
  return { node, external };
}

function DocumentActions({
  input, label, selected, onSelected, external,
}: {
  input: RefObject<HTMLInputElement | null>;
  label: string;
  selected: LibrarySelection | null;
  onSelected: (item: LibrarySelection | null) => void;
  external: boolean;
}) {
  // MSM_V14_NATIVE_PICKER: one tap opens the operating system file chooser.
  function openUpload() {
    input.current?.click();
  }
  return <div className="msmUnifiedFileActions">
    <div className="msmUnifiedUploadArea">
      <button type="button" className="fileButton msmUnifiedUploadButton"
        aria-label={label} onClick={event => {event.preventDefault();event.stopPropagation();openUpload();}}>Прикрепить файл</button>
    </div>
    {!external && <div className="msmUnifiedLibraryArea">
      <LibraryFileChooser
        value={selected} onSelect={onSelected} showSelection={false}
        allowedExtensions={['pdf','jpg','jpeg','png','webp','xls','xlsx','doc','docx','xml','csv','txt']}
      />
    </div>}
  </div>;
}

function FileRow({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    setUrl(''); setError('');
    if (isLibraryReference(file)) {
      void file.text().then(text => {
        const id = JSON.parse(text).fileId;
        if (typeof id !== 'string' || !id) throw new Error('Invalid reference');
        if (live) setUrl(dealFileUrl(id));
      }).catch(() => { if (live) setError('Не удалось открыть ссылку на файл.'); });
      return () => { live = false; };
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => {live = false; URL.revokeObjectURL(next);};
  }, [file]);
  // Browsers choose their viewer or download handler; a web app cannot force an OS application.
  const link = {
    href: url || undefined,
    target: '_blank', rel: 'noopener noreferrer',
    download: isLibraryReference(file) ? undefined : file.name,
    'aria-disabled': !url,
  };
  return <div className="versionRow msmUnifiedFileRow">
    <div><b><a {...link}>{file.name}</a></b><span>{isLibraryReference(file) ? 'Из библиотеки · без повторной загрузки' : (file.size / 1024 / 1024).toFixed(2) + ' МБ'}</span></div>
    <div className="msmFileRowActions">
      <a {...link} className="fileButton">Открыть</a>
      <button type="button" className="secondary compactButton" onClick={event => {event.preventDefault();event.stopPropagation();onRemove();}}>Удалить</button>
    </div>
    {error && <p role="alert">{error}</p>}
  </div>;
}

function useFileDrop(accept: string | undefined, multiple: boolean, receive: (files: File[]) => void) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const depth = useRef(0);
  const hasFiles = (event: React.DragEvent) => Array.from(event.dataTransfer.types).includes('Files');
  const handlers = {
    onDragEnter: (event: React.DragEvent) => { if (!hasFiles(event)) return; event.preventDefault(); depth.current++; setDragging(true); },
    onDragOver: (event: React.DragEvent) => { if (!hasFiles(event)) return; event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; },
    onDragLeave: (event: React.DragEvent) => { event.preventDefault(); if (--depth.current <= 0) {depth.current=0;setDragging(false);} },
    onDrop: (event: React.DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault(); event.stopPropagation(); depth.current=0;setDragging(false);setError('');
      const files = Array.from(event.dataTransfer.files);
      if (!multiple && files.length > 1) {setError('В это поле можно прикрепить только один файл.');return;}
      const rules = accept?.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
      if (rules?.length && files.some(file => !rules.some(rule => rule.startsWith('.') ? file.name.toLowerCase().endsWith(rule) : rule.endsWith('/*') ? file.type.toLowerCase().startsWith(rule.slice(0,-1)) : file.type.toLowerCase() === rule))) {
        setError('Неподходящий формат. Допустимые файлы: ' + accept);return;
      }
      if (files.length) receive(files);
    },
  };
  return { dragging, error, handlers };
}

const sameFile = (a: File, b: File) =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified && a.type === b.type;

export function MultiFilePicker({
  files, onChange, title = 'Прикрепить файл', accept, showSelectedFiles = true,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  title?: string;
  accept?: string;
  showSelectedFiles?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { node, external } = useExternalLibrary();
  const [selected, setSelected] = useState<LibrarySelection | null>(null);
  function add(chosen: FileList | File[] | null) {
    if (!chosen?.length) return;
    const all = [...files, ...Array.from(chosen)];
    onChange(all.filter((file, index) => all.findIndex(other => sameFile(file, other)) === index));
    setSelected(null);
  }
  const drop = useFileDrop(accept, true, add);
  return <div ref={node} {...drop.handlers} className={'multiFilePicker msmUnifiedPicker msmDropZone' + (drop.dragging ? ' msmDragging' : '')}>
    <small className="msmDropHint">Перетащите файлы сюда или нажмите для выбора</small>
    {drop.error && <p role="alert">{drop.error}</p>}
    <DocumentActions input={input} label={title} selected={selected} external={external}
      onSelected={item => {
        setSelected(item);
        if (!item) return;
        const reference = asLibraryReference(item);
        // Different library documents may have the same filename. Compare stable IDs.
        void Promise.all(files.filter(isLibraryReference).map(file=>file.text().then(contents=>JSON.parse(contents).fileId===item.id).catch(()=>false)))
          .then(matches=>{if(!matches.some(Boolean))onChange([...files,reference]);});
      }} />
    <input ref={input} type="file" multiple accept={accept} hidden onChange={event => {
      add(event.target.files);event.currentTarget.value = '';
    }} />
    {showSelectedFiles && files.length > 0 && <div className="versionList msmUnifiedSelectedList">
      {files.map((file, index) => <FileRow key={file.name + '-' + file.size + '-' + file.lastModified + '-' + index}
        file={file} onRemove={() => {
          if (isLibraryReference(file)) setSelected(null);
          onChange(files.filter((_, i) => i !== index));
        }} />)}
    </div>}
  </div>;
}

export function SingleFilePicker({
  file, onChange, title = 'Прикрепить файл', accept,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  title?: string;
  accept?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { node, external } = useExternalLibrary();
  const [selected, setSelected] = useState<LibrarySelection | null>(null);
  const drop = useFileDrop(accept, false, files => {onChange(files[0]);setSelected(null);});
  return <div ref={node} {...drop.handlers} className={'multiFilePicker msmUnifiedPicker msmDropZone' + (drop.dragging ? ' msmDragging' : '')}>
    <small className="msmDropHint">Перетащите файл сюда или нажмите для выбора</small>
    {drop.error && <p role="alert">{drop.error}</p>}
    <DocumentActions input={input} label={title} selected={selected} external={external}
      onSelected={item => {
        setSelected(item);
        if (item) onChange(asLibraryReference(item));
        else if (file && isLibraryReference(file)) onChange(null);
      }} />
    <input ref={input} type="file" accept={accept} hidden onChange={event => {
      const next = event.target.files?.[0] || null;
      if (next) { onChange(next); setSelected(null); }
      event.currentTarget.value = '';
    }} />
    {file && <div className="versionList msmUnifiedSelectedList">
      <FileRow file={file} onRemove={() => { onChange(null);setSelected(null); }} />
    </div>}
  </div>;
}

export { FileRow as SelectedFileRow };
