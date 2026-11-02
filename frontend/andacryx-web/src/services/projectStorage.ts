import type { LocalProject } from "../types/project";
import type { WorkspaceSnapshot } from "./workspaceStorage";
import { openDatabase } from "./workspaceStorage";

const PROJECTS_STORE = "projects";

export async function getLocalProjects(): Promise<LocalProject[]> {
  const database = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(PROJECTS_STORE, "readonly");
      const request = transaction.objectStore(PROJECTS_STORE).getAll();

      request.onsuccess = () => {
        const projects = request.result as LocalProject[];

        projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        resolve(projects);
      };

      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function getLocalProject(
  projectId: string,
): Promise<LocalProject | null> {
  const database = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(PROJECTS_STORE, "readonly");
      const request = transaction.objectStore(PROJECTS_STORE).get(projectId);

      request.onsuccess = () =>
        resolve((request.result as LocalProject) ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function createLocalProject(
  name: string,
  snapshot: WorkspaceSnapshot,
): Promise<LocalProject> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Proje adı boş olamaz.");
  }

  const now = new Date().toISOString();

  const project: LocalProject = {
    id: crypto.randomUUID(),
    name: trimmedName,
    storageType: "local",
    createdAt: now,
    updatedAt: now,
    snapshot,
  };

  await putLocalProject(project);
  return project;
}

export async function putLocalProject(project: LocalProject): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(PROJECTS_STORE, "readwrite");

      transaction.objectStore(PROJECTS_STORE).put(project);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function saveLocalProject(
  projectId: string,
  snapshot: WorkspaceSnapshot,
): Promise<void> {
  const project = await getLocalProject(projectId);

  if (!project) {
    throw new Error("Proje bulunamadı.");
  }

  await putLocalProject({
    ...project,
    snapshot,
    updatedAt: new Date().toISOString(),
  });
}

export async function renameLocalProject(
  projectId: string,
  name: string,
): Promise<void> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Proje adı boş olamaz.");
  }

  const project = await getLocalProject(projectId);

  if (!project) {
    throw new Error("Proje bulunamadı.");
  }

  await putLocalProject({
    ...project,
    name: trimmedName,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteLocalProject(projectId: string): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(PROJECTS_STORE, "readwrite");

      transaction.objectStore(PROJECTS_STORE).delete(projectId);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}
