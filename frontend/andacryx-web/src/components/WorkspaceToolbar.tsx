import { Code2, Columns2, FilePlus2, Workflow } from "lucide-react";
import "./WorkspaceToolbar.css";

export type WorkspaceView = "flow" | "code" | "split";

type Props = {
  methodName: string;
  view: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  onOpenFile: () => void;
};

export default function WorkspaceToolbar({
  methodName,
  view,
  onViewChange,
  onOpenFile,
}: Props) {
  return (
    <div className="workspace-toolbar">
      <div className="workspace-toolbar-title">
        <Workflow size={19} />
        <div>
          <strong>{methodName}()</strong>
          <span>Code Flow Workspace</span>
        </div>
      </div>

      <div className="workspace-toolbar-actions">
        <div
          className="workspace-view-switch"
          role="group"
          aria-label="Görünüm seçimi"
        >
          <button
            type="button"
            className={view === "flow" ? "active" : ""}
            onClick={() => onViewChange("flow")}
            aria-pressed={view === "flow"}
          >
            <Workflow size={15} /> Flow
          </button>

          <button
            type="button"
            className={view === "code" ? "active" : ""}
            onClick={() => onViewChange("code")}
            aria-pressed={view === "code"}
          >
            <Code2 size={15} /> Code
          </button>

          <button
            type="button"
            className={view === "split" ? "active" : ""}
            onClick={() => onViewChange("split")}
            aria-pressed={view === "split"}
          >
            <Columns2 size={15} /> Split
          </button>
        </div>

        <button
          className="workspace-new-file"
          type="button"
          onClick={onOpenFile}
        >
          <FilePlus2 size={16} />
          Yeni Dosya
        </button>
      </div>
    </div>
  );
}
