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

  function isExpanded(id: string) {
    return expanded[id] ?? false;
  }

  function toggleFolder(node: FileTreeNode) {
    setExpanded((previous) => {
      const updated = { ...previous };
      const willOpen = !isExpanded(node.id);

      if (willOpen) {
        // Aynı seviyedeki klasörleri kapat.
        function closeSiblings(nodes: FileTreeNode[]): boolean {
          if (nodes.some((item) => item.id === node.id)) {
            for (const sibling of nodes) {
              if (sibling.type === "folder" && sibling.id !== node.id) {
                updated[sibling.id] = false;
              }
            }
            return true;
          }

          for (const item of nodes) {
            if (item.type === "folder" && closeSiblings(item.children))
              return true;
          }

          return false;
        }

        closeSiblings(nodes);
      }

      updated[node.id] = willOpen;
      return updated;
    });
  }

  function toggleItem(id: string) {
    setExpanded((previous) => ({
      ...previous,
      [id]: !(previous[id] ?? false),
    }));
  }

  function renderNode(node: FileTreeNode, depth: number): React.ReactNode {
    if (node.type === "folder") {
      const open = isExpanded(node.id);

      return (
        <div key={node.id} className="tree-group">
          <button
            type="button"
            className="tree-row tree-folder"
            style={{ paddingLeft: 10 + depth * 15 }}
            onClick={() => toggleFolder(node)}
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
    const open = isExpanded(file.id);

    return (
      <div key={file.id} className="tree-group">
        <div
          className={`tree-row tree-file ${active ? "tree-active" : ""}`}
          style={{ paddingLeft: 10 + depth * 15 }}
        >
          <button
            type="button"
            className="tree-chevron"
            onClick={() => toggleItem(file.id)}
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
            const classOpen = isExpanded(classKey);

            return (
              <div className="tree-group" key={classKey}>
                <button
                  type="button"
                  className="tree-row tree-class"
                  style={{ paddingLeft: 25 + depth * 15 }}
                  onClick={() => toggleItem(classKey)}
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
