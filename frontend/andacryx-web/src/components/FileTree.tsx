import { useState } from "react";
import {
  Box,
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
  X,
} from "lucide-react";
import type { MethodInfo } from "./Sidebar";
import type { FileTreeNode } from "../utils/fileTree";
import "./FileTree.css";

type Props = {
  nodes: FileTreeNode[];
  activeFileId: string | null;
  selectedMethodStartLine?: number;
  onFileSelect: (fileId: string) => void;
  onMethodSelect: (fileId: string, method: MethodInfo) => void;
  onFileRemove: (fileId: string) => void;
};

export default function FileTree({
  nodes,
  activeFileId,
  selectedMethodStartLine,
  onFileSelect,
  onMethodSelect,
  onFileRemove,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function isExpanded(id: string, defaultValue = false) {
    return expanded[id] ?? defaultValue;
  }

  function toggle(id: string, defaultValue = false) {
    setExpanded((previous) => ({
      ...previous,
      [id]: !isExpanded(id, defaultValue),
    }));
  }

  function renderNode(node: FileTreeNode, depth: number): React.ReactNode {
    if (node.type === "folder") {
      const open = isExpanded(node.id, true);

      return (
        <div key={node.id} className="tree-group">
          <button
            type="button"
            className="tree-row tree-folder"
            style={{ paddingLeft: 10 + depth * 15 }}
            onClick={() => toggle(node.id, true)}
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {open ? <FolderOpen size={16} /> : <Folder size={16} />}
            <span title={node.path}>{node.name}</span>
          </button>

          {open && node.children.map((child) => renderNode(child, depth + 1))}
        </div>
      );
    }

    const file = node.file;
    if (!file) return null;

    const active = file.id === activeFileId;
    const open = isExpanded(file.id, active);

    return (
      <div key={file.id} className="tree-group">
        <div
          className={`tree-row tree-file ${active ? "tree-active" : ""}`}
          style={{ paddingLeft: 10 + depth * 15 }}
        >
          <button
            type="button"
            className="tree-chevron"
            onClick={() => toggle(file.id, active)}
            aria-label="Dosyayı genişlet veya daralt"
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          <button
            type="button"
            className="tree-file-name"
            onClick={() => onFileSelect(file.id)}
            title={file.path}
          >
            <FileCode2 size={16} />
            <span>{file.name}</span>
          </button>

          <button
            type="button"
            className="tree-remove"
            onClick={() => onFileRemove(file.id)}
            title="Çalışma alanından kaldır"
            aria-label={`${file.name} dosyasını kaldır`}
          >
            <X size={14} />
          </button>
        </div>

        {open &&
          file.analysis.classes.map((cls, classIndex) => {
            const classKey = `${file.id}:${cls.name}:${classIndex}`;
            const classOpen = isExpanded(classKey, true);

            return (
              <div className="tree-group" key={classKey}>
                <button
                  type="button"
                  className="tree-row tree-class"
                  style={{ paddingLeft: 25 + depth * 15 }}
                  onClick={() => toggle(classKey, true)}
                >
                  {classOpen ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  <Box size={15} />
                  <span>{cls.name}</span>
                </button>

                {classOpen &&
                  cls.methods.map((method, index) => (
                    <button
                      key={`${method.name}:${method.startLine}:${index}`}
                      type="button"
                      className={`tree-row tree-method ${active && selectedMethodStartLine === method.startLine ? "tree-method-active" : ""}`}
                      style={{ paddingLeft: 43 + depth * 15 }}
                      onClick={() => onMethodSelect(file.id, method)}
                    >
                      <span>{method.name}()</span>
                      <small>Satır {method.startLine}</small>
                    </button>
                  ))}
              </div>
            );
          })}
      </div>
    );
  }

  return (
    <div className="file-tree">{nodes.map((node) => renderNode(node, 0))}</div>
  );
}
