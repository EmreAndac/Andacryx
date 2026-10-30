
import type { WorkspaceFile } from "../types/workspace";

export type FileTreeNode = {
  id: string;
  name: string;
  path: string;
  type: "folder" | "file";
  children: FileTreeNode[];
  file?: WorkspaceFile;
};

export function buildFileTree(files: WorkspaceFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const file of files) {
    const parts = file.path.replaceAll("\\", "/").split("/").filter(Boolean);
    let current = root;
    let currentPath = "";

    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (index === parts.length - 1) {
        current.push({
          id: file.id,
          name: part,
          path: currentPath,
          type: "file",
          children: [],
          file
        });
        continue;
      }

      let folder = current.find(node => node.type === "folder" && node.path === currentPath);

      if (!folder) {
        folder = {
          id: `folder:${currentPath}`,
          name: part,
          path: currentPath,
          type: "folder",
          children: []
        };
        current.push(folder);
      }

      current = folder.children;
    }
  }

  function sortNodes(nodes: FileTreeNode[]) {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name, "tr");
    });

    nodes.forEach(node => sortNodes(node.children));
  }

  sortNodes(root);
  return root;
}
