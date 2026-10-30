import {
  ChevronDown,
  ChevronRight,
  FolderGit2,
  LayoutDashboard,
  LayoutTemplate,
  PanelLeftClose,
  Settings,
  Workflow,
  Search,
  FilePlus2,
  ChevronsDownUp,
  LocateFixed,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import FileTree from "./FileTree";
import { buildFileTree, type FileTreeNode } from "../utils/fileTree";
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
  const [collapseVersion, setCollapseVersion] = useState(0);
  const [revealVersion, setRevealVersion] = useState(0);

  const tree = useMemo(() => buildFileTree(files), [files]);

  const filteredTree = useMemo(() => {
    const query = search.toLocaleLowerCase("tr").trim();
    if (!query) return tree;

    function filterNodes(nodes: FileTreeNode[]): FileTreeNode[] {
      return nodes.flatMap((node) => {
        if (node.name.toLocaleLowerCase("tr").includes(query)) {
          return [node];
        }

        if (node.type === "file") return [];

        const children = filterNodes(node.children);

        return children.length > 0 ? [{ ...node, children }] : [];
      });
    }

    return filterNodes(tree);
  }, [tree, search]);

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
          onClick={() => setCollapseVersion((previous) => previous + 1)}
          title="Tümünü daralt"
          aria-label="Tümünü daralt"
        >
          <ChevronsDownUp size={16} />
        </button>

        <button
          type="button"
          className="sidebar-explorer-add"
          onClick={() => {
            setSearch("");
            setRevealVersion((previous) => previous + 1);
          }}
          title="Aktif dosyayı göster"
          aria-label="Aktif dosyayı göster"
          disabled={!activeFileId}
        >
          <LocateFixed size={16} />
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
                placeholder="Dosya veya klasör ara..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Dosya veya klasör ara"
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

          {files.length > 0 && filteredTree.length === 0 && (
            <p className="sidebar-empty">
              Eşleşen dosya veya klasör bulunamadı.
            </p>
          )}

          {filteredTree.length > 0 && (
            <FileTree
              nodes={filteredTree}
              activeFileId={activeFileId}
              selectedMethodStartLine={selectedMethodStartLine}
              search={search}
              collapseVersion={collapseVersion}
              revealVersion={revealVersion}
              onFileSelect={onFileSelect}
              onMethodSelect={onMethodSelect}
              onFileRemove={onFileRemove}
            />
          )}
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
