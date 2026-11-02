
import type { WorkspaceSnapshot } from "../services/workspaceStorage";

export function createEmptyWorkspace(): WorkspaceSnapshot {
  return {
    version: 1,
    files: [],
    openFileIds: [],
    activeFileId: null,
    selectedMethodLines: {},
    workspaceView: "split",
    diagramPositions: {},
  };
}
