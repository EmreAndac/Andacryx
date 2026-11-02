
import type { WorkspaceSnapshot } from "../services/workspaceStorage";

export type ProjectStorageType = "local" | "cloud";

export type LocalProject = {
  id: string;
  name: string;
  storageType: "local";
  createdAt: string;
  updatedAt: string;
  snapshot: WorkspaceSnapshot;
};

export type CloudProject = {
  id: string;
  name: string;
  storageType: "cloud";
  createdAt: string;
  updatedAt: string;
};

export type AndacryxProject = LocalProject | CloudProject;

export type WorkspaceMode = "quick-analysis" | "saved-project";

export type ActiveWorkspace = {
  mode: WorkspaceMode;
  projectId: string | null;
};
