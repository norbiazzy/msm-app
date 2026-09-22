import {
  useRef,
} from 'react';


export function MultiFilePicker({
  files,
  onChange,
  title = '+ Прикрепить файлы',
}: {
  files: File[];
  onChange: (files: File[]) => void;
  title?: string;
}) {

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  function add(
    fileList:
      FileList | null,
  ) {

    if (!fileList) return;


    const combined = [
      ...files,
      ...Array.from(
        fileList
      ),
    ];


    const unique =
      combined.filter(
        (
          file,
          index,
          all,
        ) =>

          all.findIndex(
            (candidate) =>

              candidate.name ===
                file.name &&

              candidate.size ===
                file.size &&

              candidate.lastModified ===
                file.lastModified

          ) === index
      );


    onChange(unique);
  }


  return (

    <div className="multiFilePicker">

      <button
        type="button"
        className="fileButton"

        onClick={() =>
          inputRef.current
            ?.click()
        }
      >

        {
          files.length
            ? '+ Прикрепить ещё'
            : title
        }

      </button>


      <input
        ref={inputRef}
        type="file"
        multiple
        hidden

        onChange={(event) => {

          add(
            event.target.files
          );

          event.currentTarget.value =
            '';
        }}
      />


      {files.length > 0 && (

        <div className="versionList">

          {files.map(
            (
              file,
              index,
            ) => (

            <div
              className="versionRow"

              key={
                file.name +
                file.size +
                file.lastModified
              }
            >

              <div>

                <b>
                  {file.name}
                </b>

                <span>
                  {
                    (
                      file.size /
                      1024 /
                      1024
                    ).toFixed(2)
                  } МБ
                </span>

              </div>


              <button
                type="button"
                className="secondary compactButton"

                onClick={() =>
                  onChange(
                    files.filter(
                      (_, fileIndex) =>
                        fileIndex !==
                        index
                    )
                  )
                }
              >
                Удалить
              </button>

            </div>

          ))}

        </div>

      )}

    </div>
  );
}

export function SingleFilePicker({
  file,
  onChange,
  title = '+ Прикрепить файл',
  accept,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  title?: string;
  accept?: string;
}) {

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  return (

    <div className="multiFilePicker">

      <button
        type="button"
        className="fileButton"

        onClick={() =>
          inputRef.current
            ?.click()
        }
      >
        {
          file
            ? 'Заменить файл'
            : title
        }
      </button>


      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept}

        onChange={(event) => {

          onChange(
            event.target.files?.[0] ||
            null
          );

          event.currentTarget.value =
            '';
        }}
      />


      {file && (

        <div className="versionList">

          <div className="versionRow">

            <div>

              <b>
                {file.name}
              </b>

              <span>
                {
                  (
                    file.size /
                    1024 /
                    1024
                  ).toFixed(2)
                } МБ
              </span>

            </div>


            <button
              type="button"
              className="secondary compactButton"

              onClick={() =>
                onChange(null)
              }
            >
              Удалить
            </button>

          </div>

        </div>

      )}

    </div>
  );
}
