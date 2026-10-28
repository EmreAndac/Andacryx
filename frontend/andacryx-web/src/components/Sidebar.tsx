import {
  Box,
  ChevronDown,
  ChevronRight,
  FileCode2,
  FolderGit2,
  LayoutDashboard,
  LayoutTemplate,
  PanelLeftClose,
  Settings,
  Workflow,
  Search,
  FilePlus2,
  X,
} from "lucide-react";
import { useState } from "react";
import "./Sidebar.css";
import { APP_CONFIG } from "../config/app.config";
import type { WorkspaceFile } from "../types/workspace";

export type MethodInfo = { name: string; startLine: number; endLine: number };
export type ClassInfo = { name: string; methods: MethodInfo[] };
export type AnalysisResult = { fileName: string; classes: ClassInfo[] };

type Props = {
  files: WorkspaceFile[];
  activeFileId: string | null;
  selectedMethodStartLine?: number;
  onFileSelect: (fileId: string) => void;
  onMethodSelect: (fileId: string, method: MethodInfo) => void;
  onFileAdd: () => void;
  onFileRemove: (fileId: string) => void;
};

export default function Sidebar({
  files,
  activeFileId,
  selectedMethodStartLine,
  onFileSelect,
  onMethodSelect,
  onFileAdd,
  onFileRemove,
}: Props) {
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>(
    {},
  );
  const [expandedClasses, setExpandedClasses] = useState<
    Record<string, boolean>
  >({});

  const sortedFiles = [...files]
    .filter((file) =>
      file.name
        .toLocaleLowerCase("tr")
        .includes(search.toLocaleLowerCase("tr")),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));

  function isFileExpanded(fileId: string) {
    return expandedFiles[fileId] ?? fileId === activeFileId;
  }

  function toggleFile(fileId: string) {
    setExpandedFiles((previous) => ({
      ...previous,
      [fileId]: !isFileExpanded(fileId),
    }));
  }

  function isClassExpanded(classKey: string) {
    return expandedClasses[classKey] ?? true;
  }

  function toggleClass(classKey: string) {
    setExpandedClasses((previous) => ({
      ...previous,
      [classKey]: !isClassExpanded(classKey),
    }));
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-section-heading">
        <span>WORKSPACE</span>
        <PanelLeftClose size={16} aria-hidden="true" />
      </div>

      <nav className="sidebar-navigation" aria-label="Workspace navigation">
        <div className="sidebar-nav-item sidebar-nav-active">
          <LayoutDashboard size={17} />
          <span>Overview</span>
        </div>

        <div
          className="sidebar-nav-item sidebar-nav-disabled"
          title="Coming soon"
        >
          <FolderGit2 size={17} />
          <span>My Projects</span>
          <small>Soon</small>
        </div>

        <div
          className="sidebar-nav-item sidebar-nav-disabled"
          title="Coming soon"
        >
          <Workflow size={17} />
          <span>Diagram Designer</span>
          <small>Soon</small>
        </div>

        <div
          className="sidebar-nav-item sidebar-nav-disabled"
          title="Coming soon"
        >
          <LayoutTemplate size={17} />
          <span>Templates</span>
          <small>Soon</small>
        </div>
      </nav>

      <div className="sidebar-divider" />

      <div className="sidebar-explorer-heading">
        <button
          className="sidebar-section-heading sidebar-section-toggle"
          type="button"
          onClick={() => setExplorerOpen(!explorerOpen)}
          aria-expanded={explorerOpen}
        >
          <span>PROJECT EXPLORER</span>
          {explorerOpen ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </button>

        <button
          type="button"
          className="sidebar-explorer-add"
          onClick={onFileAdd}
          title="C# dosyası ekle"
          aria-label="C# dosyası ekle"
        >
          <FilePlus2 size={16} />
        </button>
      </div>

      {explorerOpen && (
        <div className="sidebar-explorer">
          {files.length > 0 && (
            <div className="sidebar-search">
              <Search size={15} />
              <input
                type="text"
                placeholder="Dosya ara..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Dosya ara"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Aramayı temizle"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {files.length === 0 && (
            <p className="sidebar-empty">Henüz dosya yüklenmedi.</p>
          )}

          {files.length > 0 && sortedFiles.length === 0 && (
            <p className="sidebar-empty">Eşleşen dosya bulunamadı.</p>
          )}

          {sortedFiles.map((file) => {
            const fileExpanded = isFileExpanded(file.id);
            const active = file.id === activeFileId;

            return (
              <div className="sidebar-file-group" key={file.id}>
                <div
                  className={`sidebar-file sidebar-file-selectable ${active ? "sidebar-file-active" : ""}`}
                >
                  <button
                    type="button"
                    className="sidebar-file-expand"
                    onClick={() => toggleFile(file.id)}
                    aria-label={`${file.name} ${fileExpanded ? "daralt" : "genişlet"}`}
                    aria-expanded={fileExpanded}
                  >
                    {fileExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>

                  <button
                    type="button"
                    className="sidebar-file-name"
                    onClick={() => {
                      onFileSelect(file.id);
                      setExpandedFiles((previous) => ({
                        ...previous,
                        [file.id]: true,
                      }));
                    }}
                  >
                    <FileCode2 size={17} />
                    <span title={file.path}>{file.name}</span>
                  </button>

                  <button
                    type="button"
                    className="sidebar-file-remove"
                    onClick={() => onFileRemove(file.id)}
                    title={`${file.name} dosyasını kaldır`}
                    aria-label={`${file.name} dosyasını kaldır`}
                  >
                    <X size={14} />
                  </button>
                </div>

                {fileExpanded &&
                  file.analysis.classes.map((cls, classIndex) => {
                    const classKey = `${file.id}-${cls.name}-${classIndex}`;
                    const expanded = isClassExpanded(classKey);

                    return (
                      <div className="sidebar-class" key={classKey}>
                        <button
                          className="sidebar-class-toggle"
                          type="button"
                          onClick={() => toggleClass(classKey)}
                          aria-expanded={expanded}
                        >
                          {expanded ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                          <Box size={15} />
                          <span title={cls.name}>{cls.name}</span>
                        </button>

                        {expanded && (
                          <div className="sidebar-methods">
                            {cls.methods.map((method, methodIndex) => (
                              <button
                                key={`${method.name}-${method.startLine}-${methodIndex}`}
                                type="button"
                                className={`sidebar-method ${
                                  active &&
                                  selectedMethodStartLine === method.startLine
                                    ? "sidebar-method-active"
                                    : ""
                                }`}
                                onClick={() => onMethodSelect(file.id, method)}
                              >
                                <span>{method.name}()</span>
                                <small>Satır {method.startLine}</small>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      )}

      <div className="sidebar-footer">
        <div
          className="sidebar-nav-item sidebar-nav-disabled"
          title="Coming soon"
        >
          <Settings size={17} />
          <span>Settings</span>
          <small>Soon</small>
        </div>
        <span>
          {APP_CONFIG.name} · {APP_CONFIG.release} v{APP_CONFIG.version}
        </span>
      </div>
    </aside>
  );
}
