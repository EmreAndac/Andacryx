import { FileCode2, Plus, X } from "lucide-react";
import type { WorkspaceFile } from "../types/workspace";
import "./FileTabs.css";

type Props = {
  files: WorkspaceFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileRemove: (fileId: string) => void;
  onFileAdd: () => void;
};

export default function FileTabs({
  files,
  activeFileId,
  onFileSelect,
  onFileRemove,
  onFileAdd,
}: Props) {
  if (files.length === 0) return null;

  return (
    <div className="file-tabs">
      <div
        className="file-tabs-list"
        role="tablist"
        aria-label="Açık C# dosyaları"
      >
        {files.map((file) => {
          const active = file.id === activeFileId;

          return (
            <div
              className={`file-tab ${active ? "file-tab-active" : ""}`}
              key={file.id}
            >
              <button
                type="button"
                role="tab"
                aria-selected={active}
                className="file-tab-select"
                onClick={() => onFileSelect(file.id)}
                title={file.path}
              >
                <FileCode2 size={15} />
                <span>{file.name}</span>
              </button>

              <button
                type="button"
                className="file-tab-close"
                onClick={() => onFileRemove(file.id)}
                title={`${file.name} dosyasını kapat`}
                aria-label={`${file.name} dosyasını kapat`}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="file-tabs-add"
        onClick={onFileAdd}
        title="Dosya ekle"
        aria-label="Dosya ekle"
      >
        <Plus size={17} />
      </button>
    </div>
  );
}
