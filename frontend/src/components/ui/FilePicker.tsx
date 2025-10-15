import React from "react";

type Props = {
  label?: string;
  accept?: string;
  onPick: (file: File, objectUrl: string) => void;
};

const FilePicker: React.FC<Props> = ({ label = "音声ファイルを開く", accept = "audio/*", onPick }) => {
  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    onPick(f, url);
  };

  return (
    <>
      <label
        htmlFor="file"
        className="px-3 py-2 rounded-xl bg-blue-600 text-white cursor-pointer hover:opacity-90 select-none"
      >
        {label}
      </label>
      <input id="file" type="file" accept={accept} className="hidden" onChange={onChange} />
    </>
  );
};

export default FilePicker;
