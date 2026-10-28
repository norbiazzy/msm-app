/* MSM_UNIFIED_ATTACHMENTS_V8: the same two-button control for every document field. */
import { useEffect, useRef, useState, type RefObject } from 'react';
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
  input, camera, label, selected, onSelected, external,
}: {
  input: RefObject<HTMLInputElement | null>;
  camera: RefObject<HTMLInputElement | null>;
  label: string;
  selected: LibrarySelection | null;
  onSelected: (item: LibrarySelection | null) => void;
  external: boolean;
}) {
  const [mobileChoice, setMobileChoice] = useState(false);
  function openUpload() {
    if (window.matchMedia?.('(pointer: coarse)').matches) setMobileChoice(value => !value);
    else input.current?.click();
  }
  return <div className="msmUnifiedFileActions">
    <div className="msmUnifiedUploadArea">
      <button type="button" className="fileButton msmUnifiedUploadButton"
        aria-label={label} onClick={openUpload} aria-expanded={mobileChoice}>Прикрепить файл</button>
      {mobileChoice && <div className="msmUnifiedMobileMenu" aria-label="Способ прикрепления">
        <button type="button" onClick={() => { setMobileChoice(false);input.current?.click(); }}>Выбрать файл</button>
        <button type="button" onClick={() => { setMobileChoice(false);camera.current?.click(); }}>Сделать фото</button>
      </div>}
    </div>
    {!external && <div className="msmUnifiedLibraryArea">
      <LibraryFileChooser
        value={selected} onSelect={onSelected}
        allowedExtensions={['pdf','jpg','jpeg','png','webp','xls','xlsx','doc','docx','xml','csv','txt']}
      />
    </div>}
  </div>;
}

function FileRow({ file, onRemove }: { file: File; onRemove: () => void }) {
  return <div className="versionRow msmUnifiedFileRow">
    <div><b>{file.name}</b><span>
      {isLibraryReference(file) ? 'Из библиотеки · без повторной загрузки' : (file.size / 1024 / 1024).toFixed(2) + ' МБ'}
    </span></div>
    <button type="button" className="secondary compactButton" onClick={onRemove}>Удалить</button>
  </div>;
}

const sameFile = (a: File, b: File) =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified && a.type === b.type;

export function MultiFilePicker({
  files, onChange, title = 'Прикрепить файл', accept,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  title?: string;
  accept?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const { node, external } = useExternalLibrary();
  const [selected, setSelected] = useState<LibrarySelection | null>(null);
  function add(chosen: FileList | null) {
    if (!chosen?.length) return;
    const all = [...files, ...Array.from(chosen)];
    onChange(all.filter((file, index) => all.findIndex(other => sameFile(file, other)) === index));
    setSelected(null);
  }
  return <div ref={node} className="multiFilePicker msmUnifiedPicker">
    <DocumentActions input={input} camera={camera} label={title} selected={selected} external={external}
      onSelected={item => {
        setSelected(item);
        if (!item) return;
        const reference = asLibraryReference(item);
        if (!files.some(file => isLibraryReference(file) && file.name === reference.name))
          onChange([...files, reference]);
      }} />
    <input ref={input} type="file" multiple accept={accept} hidden onChange={event => {
      add(event.target.files);event.currentTarget.value = '';
    }} />
    <input ref={camera} type="file" accept="image/*" capture="environment" multiple hidden onChange={event => {
      add(event.target.files);event.currentTarget.value = '';
    }} />
    {files.length > 0 && <div className="versionList msmUnifiedSelectedList">
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
  const camera = useRef<HTMLInputElement>(null);
  const { node, external } = useExternalLibrary();
  const [selected, setSelected] = useState<LibrarySelection | null>(null);
  return <div ref={node} className="multiFilePicker msmUnifiedPicker">
    <DocumentActions input={input} camera={camera} label={title} selected={selected} external={external}
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
    <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={event => {
      const next = event.target.files?.[0] || null;
      if (next) { onChange(next);setSelected(null); }
      event.currentTarget.value = '';
    }} />
    {file && <div className="versionList msmUnifiedSelectedList">
      <FileRow file={file} onRemove={() => { onChange(null);setSelected(null); }} />
    </div>}
  </div>;
}
