import { useRef } from 'react';
import { SingleFilePicker } from './MultiFilePicker';
import { LibraryFileChooser, type LibrarySelection } from './LibraryFileChooser';

/** A payment proof can be a new upload, a mobile photo, or an existing pool file. */
export function PaymentEvidencePicker({
  file,
  onFileChange,
  libraryFile,
  onLibraryChange,
}: {
  file: File | null;
  onFileChange: (value: File | null) => void;
  libraryFile: LibrarySelection | null;
  onLibraryChange: (value: LibrarySelection | null) => void;
}) {
  const cameraRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="msmPaymentEvidence">
      <div className="msmPaymentEvidenceActions">
        <SingleFilePicker
          file={file}
          onChange={(next) => {
            onFileChange(next);
            if (next) onLibraryChange(null);
          }}
          title="Прикрепить файл"
          accept="application/pdf,image/*"
        />
        <LibraryFileChooser
          value={libraryFile}
          onSelect={(next) => {
            onLibraryChange(next);
            if (next) onFileChange(null);
          }}
          allowedExtensions={['pdf', 'jpg', 'jpeg', 'png', 'webp']}
        />
        <button
          type="button"
          className="fileButton msmPaymentCamera"
          onClick={() => cameraRef.current?.click()}
        >
          Сделать фото
        </button>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          const next = event.target.files?.[0] || null;
          if (next) {
            onFileChange(next);
            onLibraryChange(null);
          }
          event.currentTarget.value = '';
        }}
      />
      <small>Можно загрузить PDF, фото или выбрать уже сохранённое подтверждение. Выбирается один документ.</small>
    </div>
  );
}
