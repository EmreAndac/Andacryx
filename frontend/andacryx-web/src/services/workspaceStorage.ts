
import type { WorkspaceFile } from "../types/workspace";

const DB_NAME = "andacryx-workspace";
const DB_VERSION = 1;
const STORE_NAME = "workspace";

export type WorkspaceSnapshot = {
  version: 1;
  files: WorkspaceFile[];
  openFileIds: string[];
  activeFileId: string | null;
  selectedMethodLines: Record<string, number>;
  workspaceView: "flow" | "code" | "split";
  diagramPositions: Record<string, Record<string, { x: number; y: number }>>;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveWorkspace(snapshot: WorkspaceSnapshot): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");

      transaction.objectStore(STORE_NAME).put(snapshot, "current");

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function loadWorkspace(): Promise<WorkspaceSnapshot | null> {
  const database = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get("current");

      request.onsuccess = () => {
        const snapshot = request.result as WorkspaceSnapshot | undefined;
        resolve(snapshot?.version === 1 ? snapshot : null);
      };

      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function clearWorkspace(): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");

      transaction.objectStore(STORE_NAME).delete("current");

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}
