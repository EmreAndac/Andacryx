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
} from "lucide-react";
import { useState } from "react";
import "./Sidebar.css";
import { APP_CONFIG } from "../config/app.config";

export type MethodInfo = { name: string; startLine: number; endLine: number };
export type ClassInfo = { name: string; methods: MethodInfo[] };
export type AnalysisResult = { fileName: string; classes: ClassInfo[] };

type Props = {
  result: AnalysisResult | null;
  selectedMethodStartLine?: number;
  onMethodSelect: (method: MethodInfo) => void;
};

export default function Sidebar({
  result,
  selectedMethodStartLine,
  onMethodSelect,
}: Props) {
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [expandedClasses, setExpandedClasses] = useState<
    Record<string, boolean>
  >({});

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

      <button
        className="sidebar-section-heading sidebar-section-toggle"
        type="button"
        onClick={() => setExplorerOpen(!explorerOpen)}
        aria-expanded={explorerOpen}
      >
        <span>PROJECT EXPLORER</span>
        {explorerOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {explorerOpen && (
        <div className="sidebar-explorer">
          {!result && <p className="sidebar-empty">Henüz dosya yüklenmedi.</p>}

          {result && (
            <>
              <div className="sidebar-file">
                <FileCode2 size={17} />
                <span title={result.fileName}>{result.fileName}</span>
              </div>

              {result.classes.map((cls, classIndex) => {
                const classKey = `${cls.name}-${classIndex}`;
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
                            className={`sidebar-method ${selectedMethodStartLine === method.startLine ? "sidebar-method-active" : ""}`}
                            onClick={() => onMethodSelect(method)}
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
            </>
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
