import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FilePlus2, Upload, FolderOpen, Save, RotateCcw, CircleCheck, CircleDot, Zap, FolderGit2 } from "lucide-react";
import FlowDiagram, {
  type FlowNodeDto,
  type MethodFlowDto,
} from "./components/FlowDiagram";
import "./App.css";
import "./components/WorkspaceIdentity.css";
import "./components/TopBar.css";
import "./components/Sidebar.css";
import "./components/CodeInspector.css";
import "./components/FlowDiagram.css";
import FileTabs from "./components/FileTabs";
import CodeInspector from "./components/CodeInspector";
import ResizablePanels from "./components/ResizablePanels";
import TopBar from "./components/TopBar";
import { APP_CONFIG } from "./config/app.config";
import Sidebar, { type MethodInfo } from "./components/Sidebar";
import WorkspaceToolbar, {
  type WorkspaceView,
} from "./components/WorkspaceToolbar";
import type { WorkspaceFile, FlowAnalysisResult } from "./types/workspace";
import { loadWorkspace, saveWorkspace, type WorkspaceSnapshot } from "./services/workspaceStorage";
import MyProjects from "./components/MyProjects";
import { createLocalProject, getLocalProject, saveLocalProject } from "./services/projectStorage";
import { createEmptyWorkspace } from "./utils/workspaceFactory";

const API_BASE_URL = "http://localhost:5050";

export default function App() {
  const [activePage, setActivePage] = useState<"overview" | "projects">("overview");
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [openFileIds, setOpenFileIds] = useState<string[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [selectedMethods, setSelectedMethods] = useState<
    Record<string, MethodFlowDto | null>
  >({});
  const [selectedNodes, setSelectedNodes] = useState<
    Record<string, FlowNodeDto | null>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("split");
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [diagramPositions, setDiagramPositions] = useState<WorkspaceSnapshot["diagramPositions"]>({});
  const [openedProject, setOpenedProject] = useState<{ id: string; name: string } | null>(null);
  const [projectBusy, setProjectBusy] = useState(false);
  const [projectMessage, setProjectMessage] = useState("");
  const quickSnapshotRef = useRef<WorkspaceSnapshot | null>(null);
  const savedProjectSnapshotRef = useRef<WorkspaceSnapshot | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const activeFile = files.find((file) => file.id === activeFileId) ?? null;

  const selectedMethod = activeFileId
    ? (selectedMethods[activeFileId] ?? null)
    : null;
  const selectedNode = activeFileId
    ? (selectedNodes[activeFileId] ?? null)
    : null;

  useEffect(() => {
    let cancelled = false;

    async function restoreWorkspace() {
      try {
        const snapshot = await loadWorkspace();
        if (cancelled || !snapshot) return;

        const restoredFiles = snapshot.files ?? [];
        const validIds = new Set(restoredFiles.map(file => file.id));
        const restoredTabs = (snapshot.openFileIds ?? []).filter(id => validIds.has(id));
        const restoredActiveId = snapshot.activeFileId && restoredTabs.includes(snapshot.activeFileId)
          ? snapshot.activeFileId : restoredTabs[0] ?? null;
        const restoredMethods: Record<string, MethodFlowDto | null> = {};

        for (const file of restoredFiles) {
          const line = snapshot.selectedMethodLines?.[file.id];
          if (line !== undefined) {
            restoredMethods[file.id] = file.flow.methods.find(method => method.startLine === line) ?? null;
          }
        }

        quickSnapshotRef.current = snapshot;
        setFiles(restoredFiles);
        setOpenFileIds(restoredTabs);
        setActiveFileId(restoredActiveId);
        setSelectedMethods(restoredMethods);
        setWorkspaceView(snapshot.workspaceView ?? "split");
        setDiagramPositions(snapshot.diagramPositions ?? {});
      } catch (err) {
        if (!cancelled) setError(`Çalışma alanı geri yüklenemedi: ${err instanceof Error ? err.message : "Bilinmeyen hata"}`);
      } finally {
        if (!cancelled) setWorkspaceReady(true);
      }
    }

    void restoreWorkspace();
    return () => { cancelled = true; };
  }, []);

  function captureSnapshot(): WorkspaceSnapshot {
    const selectedMethodLines: Record<string, number> = {};
    for (const [fileId, method] of Object.entries(selectedMethods)) {
      if (method) selectedMethodLines[fileId] = method.startLine;
    }
    return { version: 1, files, openFileIds, activeFileId, selectedMethodLines, workspaceView, diagramPositions };
  }

  const projectDirty = openedProject !== null && savedProjectSnapshotRef.current !== null &&
    JSON.stringify(captureSnapshot()) !== JSON.stringify(savedProjectSnapshotRef.current);

  function applySnapshot(snapshot: WorkspaceSnapshot) {
    const restoredFiles = snapshot.files ?? [];
    const ids = new Set(restoredFiles.map(file => file.id));
    const tabs = (snapshot.openFileIds ?? []).filter(id => ids.has(id));
    const active = snapshot.activeFileId && tabs.includes(snapshot.activeFileId) ? snapshot.activeFileId : tabs[0] ?? null;
    const methods: Record<string, MethodFlowDto | null> = {};
    for (const file of restoredFiles) {
      const line = snapshot.selectedMethodLines?.[file.id];
      if (line !== undefined) methods[file.id] = file.flow.methods.find(method => method.startLine === line) ?? null;
    }
    setFiles(restoredFiles);
    setOpenFileIds(tabs);
    setActiveFileId(active);
    setSelectedMethods(methods);
    setSelectedNodes({});
    setWorkspaceView(snapshot.workspaceView ?? "split");
    setDiagramPositions(snapshot.diagramPositions ?? {});
  }

  useEffect(() => {
    if (!workspaceReady || openedProject) return;
    const snapshot = captureSnapshot();
    quickSnapshotRef.current = snapshot;
    const timeout = window.setTimeout(() => {
      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(() => saveWorkspace(snapshot))
        .catch(err => console.error("Workspace save failed:", err));
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [workspaceReady, openedProject, files, openFileIds, activeFileId, selectedMethods, workspaceView, diagramPositions]);

  async function saveAsProject() {
    if (projectBusy || loading) return;
    const name = window.prompt("Yeni projenin adı:", openedProject?.name ?? "My Project");
    if (name === null) return;
    if (!name.trim()) { window.alert("Proje adı boş olamaz."); return; }
    setProjectBusy(true);
    try {
      const project = await createLocalProject(name, captureSnapshot());
      setProjectMessage(`“${project.name}” yerel projelere kaydedildi.`);
      setActivePage("projects");
    } catch (err) { window.alert(err instanceof Error ? err.message : "Proje kaydedilemedi."); }
    finally { setProjectBusy(false); }
  }

  async function openProject(projectId: string) {
    if (projectBusy || loading) return;
    if (projectDirty && !window.confirm("Açık projedeki kaydedilmemiş değişiklikler kaybolacak. Devam edilsin mi?")) return;
    setProjectBusy(true);
    try {
      const project = await getLocalProject(projectId);
      if (!project) throw new Error("Proje bulunamadı.");
      if (!openedProject) {
        const quick = captureSnapshot();
        quickSnapshotRef.current = quick;
        await saveQueueRef.current.catch(() => undefined);
        await saveWorkspace(quick);
      }
      savedProjectSnapshotRef.current = project.snapshot;
      applySnapshot(project.snapshot);
      setOpenedProject({ id: project.id, name: project.name });
      setProjectMessage("");
      setActivePage("overview");
    } catch (err) { window.alert(err instanceof Error ? err.message : "Proje açılamadı."); }
    finally { setProjectBusy(false); }
  }

  async function saveOpenedProject() {
    if (!openedProject || projectBusy || loading) return;
    setProjectBusy(true);
    try {
      const snapshot = captureSnapshot();
      await saveLocalProject(openedProject.id, snapshot);
      savedProjectSnapshotRef.current = snapshot;
      setProjectMessage("Proje değişiklikleri kaydedildi.");
    } catch (err) { window.alert(err instanceof Error ? err.message : "Değişiklikler kaydedilemedi."); }
    finally { setProjectBusy(false); }
  }

  function returnToQuickAnalysis() {
    if (loading || projectBusy) return;
    if (projectDirty && !window.confirm("Kaydedilmemiş proje değişiklikleri kaybolacak. Quick Analysis'e dönülsün mü?")) return;
    if (openedProject) {
      applySnapshot(quickSnapshotRef.current ?? createEmptyWorkspace());
      setOpenedProject(null);
      savedProjectSnapshotRef.current = null;
    }
    setProjectMessage("");
    setActivePage("overview");
  }

  async function newQuickAnalysis() {
    if (loading || projectBusy) return;
    if (!window.confirm("Yeni geçici analiz başlatılsın mı? Mevcut Quick Analysis içeriği temizlenecek. Kayıtlı projeler etkilenmez.")) return;
    if (openedProject) {
      await saveQueueRef.current.catch(() => undefined);
    }
    const empty = createEmptyWorkspace();
    try {
      await saveQueueRef.current.catch(() => undefined);
      await saveWorkspace(empty);
      quickSnapshotRef.current = empty;
      applySnapshot(empty);
      setOpenedProject(null);
      savedProjectSnapshotRef.current = null;
      setProjectMessage("");
      setActivePage("overview");
    } catch (err) { window.alert(err instanceof Error ? err.message : "Yeni çalışma alanı oluşturulamadı."); }
  }

  function handlePositionsChange(key: string, positions: Record<string, { x: number; y: number }>) {
    setDiagramPositions(previous => ({ ...previous, [key]: positions }));
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function openFolderPicker() {
    folderInputRef.current?.click();
  }

  async function analyzeFile(file: File): Promise<WorkspaceFile> {
    const sourceCode = await file.text();

    const uploadData = new FormData();
    uploadData.append("file", file);

    const flowData = new FormData();
    flowData.append("file", file);

    const [analysisResponse, flowResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/analysis/upload`, {
        method: "POST",
        body: uploadData,
      }),
      fetch(`${API_BASE_URL}/api/analysis/flow`, {
        method: "POST",
        body: flowData,
      }),
    ]);

    if (!analysisResponse.ok || !flowResponse.ok) {
      throw new Error(`${file.name} analiz edilemedi.`);
    }

    const analysis =
      (await analysisResponse.json()) as WorkspaceFile["analysis"];
    const flow = (await flowResponse.json()) as FlowAnalysisResult;

    return {
      id: crypto.randomUUID(),
      name: file.name,
      path: file.webkitRelativePath || file.name,
      sourceCode,
      analysis,
      flow,
    };
  }

  function isSupportedFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".cs")) return false;

    const ignoredFolders = new Set([
      "bin",
      "obj",
      ".git",
      ".vs",
      "node_modules",
      "dist",
      "build",
    ]);

    const pathParts = (file.webkitRelativePath || file.name)
      .replaceAll("\\", "/")
      .split("/");

    return !pathParts.some((part) => ignoredFolders.has(part.toLowerCase()));
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? [])
      .filter(isSupportedFile)
      .filter((file) => {
        const path = file.webkitRelativePath || file.name;
        return !files.some((existing) => existing.path === path);
      });

    if (selectedFiles.length === 0) {
      event.target.value = "";
      setError("Yeni veya desteklenen C# dosyası bulunamadı.");
      return;
    }

    event.target.value = "";
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled(selectedFiles.map(analyzeFile));

      const successfulFiles = results
        .filter(
          (result): result is PromiseFulfilledResult<WorkspaceFile> =>
            result.status === "fulfilled",
        )
        .map((result) => result.value);

      const failedFiles = results
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected",
        )
        .map((result) =>
          result.reason instanceof Error
            ? result.reason.message
            : "Dosya analiz edilemedi.",
        );

      if (successfulFiles.length > 0) {
        setFiles((previous) => [...previous, ...successfulFiles]);

        // Yeni yüklenen dosyalardan yalnızca ilkini sekmede aç.
        setOpenFileIds((previous) => [...previous, successfulFiles[0].id]);

        setActiveFileId(successfulFiles[0].id);
      }

      if (failedFiles.length > 0) setError(failedFiles.join(" "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  function selectFile(fileId: string) {
    setOpenFileIds((previous) =>
      previous.includes(fileId) ? previous : [...previous, fileId],
    );

    if (fileId === activeFileId) return;

    setActiveFileId(fileId);
  }
  function removeFile(fileId: string) {
    setFiles((previous) => previous.filter((file) => file.id !== fileId));

    const remainingTabs = openFileIds.filter((id) => id !== fileId);
    setOpenFileIds(remainingTabs);

    setSelectedMethods((previous) => {
      const updated = { ...previous };
      delete updated[fileId];
      return updated;
    });

    setSelectedNodes((previous) => {
      const updated = { ...previous };
      delete updated[fileId];
      return updated;
    });

    setDiagramPositions(previous => Object.fromEntries(
      Object.entries(previous).filter(([key]) => !key.startsWith(`${fileId}:`))
    ));

    if (activeFileId === fileId) {
      setActiveFileId(remainingTabs[0] ?? null);
    }
  }

  function removeFolder(folderPath: string) {
    if (loading || projectBusy) return;
    const normalized = folderPath.replaceAll("\\", "/");
    const matching = files.filter(file => {
      const path = file.path.replaceAll("\\", "/");
      return path.startsWith(`${normalized}/`);
    });
    if (!matching.length) return;
    if (!window.confirm(`“${normalized}” klasörü ve içindeki ${matching.length} C# dosyası çalışma alanından kaldırılacak. Devam edilsin mi?`)) return;

    const removedIds = new Set(matching.map(file => file.id));
    const remainingTabs = openFileIds.filter(id => !removedIds.has(id));
    setFiles(previous => previous.filter(file => !removedIds.has(file.id)));
    setOpenFileIds(remainingTabs);
    setActiveFileId(previous => previous && removedIds.has(previous) ? remainingTabs[0] ?? null : previous);
    setSelectedMethods(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => !removedIds.has(id))));
    setSelectedNodes(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => !removedIds.has(id))));
    setDiagramPositions(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => ![...removedIds].some(id => key.startsWith(`${id}:`)))));
    setProjectMessage("");
  }

  function selectMethod(fileId: string, method: MethodInfo) {
    const file = files.find((item) => item.id === fileId);

    const flow = file?.flow.methods.find(
      (item) =>
        item.name === method.name && item.startLine === method.startLine,
    );

    setOpenFileIds((previous) =>
      previous.includes(fileId) ? previous : [...previous, fileId],
    );

    setActiveFileId(fileId);
    setSelectedMethods((previous) => ({ ...previous, [fileId]: flow ?? null }));
    setSelectedNodes((previous) => ({ ...previous, [fileId]: null }));
  }

  function closeFileTab(fileId: string) {
    const remainingTabs = openFileIds.filter((id) => id !== fileId);
    setOpenFileIds(remainingTabs);

    if (activeFileId !== fileId) return;

    const closedIndex = openFileIds.indexOf(fileId);
    const nextFileId =
      remainingTabs[Math.min(closedIndex, remainingTabs.length - 1)] ?? null;

    setActiveFileId(nextFileId);
  }

  return (
    <div className="app-shell">
      <TopBar />

      {!workspaceReady ? (
        <div className="workspace-empty" role="status">Çalışma alanı yükleniyor...</div>
      ) : <div className="app">
        <Sidebar
          activePage={activePage}
          onPageChange={setActivePage}
          files={files}
          activeFileId={activeFileId}
          selectedMethodStartLine={selectedMethod?.startLine}
          onFileSelect={selectFile}
          onMethodSelect={selectMethod}
          onFileAdd={openFilePicker}
          onFileRemove={removeFile}
          onFolderRemove={removeFolder}
          workspaceName={openedProject?.name ?? "Quick Analysis"}
          workspaceType={openedProject ? "project" : "quick"}
          workspaceDirty={projectDirty}
        />

        <main className="main">
          <header>
            <h1>{activePage === "projects" ? "My Projects" : openedProject ? openedProject.name : "Code Flow Explorer"}</h1>
            <span>v{APP_CONFIG.version}</span>
          </header>

          {activePage === "projects" ? (
            <MyProjects onBack={returnToQuickAnalysis} onOpen={openProject} onSaveCurrent={saveAsProject} />
          ) : (
          <section className="workspace">
            <div className="project-workspace-actions">
              <div className="workspace-identity">
                {openedProject ? <FolderGit2 size={17} /> : <Zap size={17} />}
                <div className="workspace-identity-label">
                  <strong>{openedProject?.name ?? "Quick Analysis"}</strong>
                  <small>{openedProject ? "My Projects / Local Project" : "Temporary workspace / Quick Analysis"}</small>
                </div>
                {openedProject ? (
                  <span className={`workspace-save-status ${projectDirty ? "workspace-save-dirty" : "workspace-save-clean"}`}>
                    {projectDirty ? <CircleDot size={13} /> : <CircleCheck size={13} />}
                    {projectDirty ? "Unsaved Changes" : "Saved"}
                  </span>
                ) : <span className="workspace-save-status workspace-save-temporary">Temporary</span>}
              </div>
              {projectMessage && !projectDirty && <span role="status">{projectMessage}</span>}
              {openedProject && <button type="button" disabled={projectBusy || loading} onClick={() => void saveOpenedProject()}><Save size={15}/> Save Changes</button>}
              <button type="button" disabled={projectBusy || loading} onClick={() => void saveAsProject()}><Save size={15}/> Save as Project</button>
              <button type="button" disabled={projectBusy || loading} onClick={() => void newQuickAnalysis()}><RotateCcw size={15}/> New Quick Analysis</button>
              {openedProject && <button type="button" disabled={projectBusy || loading} onClick={returnToQuickAnalysis}>Quick Analysis'e dön</button>}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".cs"
              multiple
              onChange={handleUpload}
              hidden
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              accept=".cs"
              {...{ webkitdirectory: "", directory: "" }}
              onChange={handleUpload}
              hidden
            />
            <FileTabs
              files={files.filter((file) => openFileIds.includes(file.id))}
              activeFileId={activeFileId}
              onFileSelect={selectFile}
              onFileRemove={closeFileTab}
              onFileAdd={openFilePicker}
            />

            {files.length === 0 && !loading && (
              <div className="workspace-empty">
                <div className="workspace-empty-icon">
                  <Upload size={28} />
                </div>

                <h2>İlk kod analizini başlat</h2>
                <p>
                  C# dosyalarını yükle, metotlarını incele ve kontrol akışını
                  görselleştir.
                </p>

                <button
                  type="button"
                  className="workspace-upload-button"
                  onClick={openFilePicker}
                >
                  <FilePlus2 size={17} />
                  C# Dosyaları Seç
                </button>

                <button
                  type="button"
                  className="workspace-upload-button"
                  onClick={openFolderPicker}
                >
                  <FolderOpen size={17} />
                  C# Proje Klasörü Seç
                </button>

                <span>Birden fazla .cs dosyası seçebilirsin.</span>
              </div>
            )}

            {loading && <p>Dosyalar analiz ediliyor...</p>}
            {error && <p className="error">{error}</p>}

            {activeFile && (
              <div className="analysis-summary">
                <span className="analysis-summary-dot" />
                <strong>{activeFile.name}</strong>
                <span>{activeFile.analysis.classes.length} sınıf</span>
                <span>
                  {activeFile.analysis.classes.reduce(
                    (sum, cls) => sum + cls.methods.length,
                    0,
                  )}{" "}
                  metot
                </span>
                <span>{files.length} dosya yüklendi</span>
                <span className="analysis-summary-status">
                  Analiz tamamlandı
                </span>
              </div>
            )}

            {files.length > 0 && !selectedMethod && !loading && (
              <div className="workspace-empty">
                <div className="workspace-empty-icon">
                  <FilePlus2 size={28} />
                </div>
                <h2>{activeFile?.name ?? "Açık dosya yok"}</h2>
                <p>
                  {activeFile
                    ? "Akış diyagramını görüntülemek için sol panelden bir metot seç."
                    : "Project Explorer'dan bir dosya veya metot seçerek çalışmaya devam et."}
                </p>
                <button
                  type="button"
                  className="workspace-upload-button"
                  onClick={openFilePicker}
                >
                  <FilePlus2 size={17} />
                  Yeni Dosya Ekle
                </button>
              </div>
            )}

            {selectedMethod && activeFile && (
              <div className="workspace-editor">
                <WorkspaceToolbar
                  methodName={selectedMethod.name}
                  view={workspaceView}
                  onViewChange={setWorkspaceView}
                  onOpenFile={openFilePicker}
                  onOpenFolder={openFolderPicker}
                />

                <div
                  className={`workspace-panels workspace-panels-${workspaceView}`}
                >
                  {workspaceView === "split" ? (
                    <ResizablePanels
                      left={
                        <div className="workspace-diagram-panel">
                          <FlowDiagram
                            method={selectedMethod}
                            diagramKey={`${activeFile.id}:${selectedMethod.startLine}:${selectedMethod.name}`}
                            initialPositions={diagramPositions[`${activeFile.id}:${selectedMethod.startLine}:${selectedMethod.name}`]}
                            onPositionsChange={handlePositionsChange}
                            onNodeSelect={(node) => {
                              if (!activeFileId) return;
                              setSelectedNodes((previous) => ({
                                ...previous,
                                [activeFileId]: node,
                              }));
                            }}
                          />
                        </div>
                      }
                      right={
                        <div className="workspace-code-panel">
                          <CodeInspector
                            code={activeFile.sourceCode}
                            startLine={
                              selectedNode?.startLine ??
                              selectedMethod.startLine
                            }
                            endLine={
                              selectedNode?.endLine ?? selectedMethod.endLine
                            }
                          />
                        </div>
                      }
                    />
                  ) : workspaceView === "flow" ? (
                    <div className="workspace-diagram-panel">
                      <FlowDiagram
                        method={selectedMethod}
                        diagramKey={`${activeFile.id}:${selectedMethod.startLine}:${selectedMethod.name}`}
                        initialPositions={diagramPositions[`${activeFile.id}:${selectedMethod.startLine}:${selectedMethod.name}`]}
                        onPositionsChange={handlePositionsChange}
                        onNodeSelect={(node) => {
                          if (!activeFileId) return;
                          setSelectedNodes((previous) => ({
                            ...previous,
                            [activeFileId]: node,
                          }));
                        }}
                      />
                    </div>
                  ) : (
                    <div className="workspace-code-panel">
                      <CodeInspector
                        code={activeFile.sourceCode}
                        startLine={
                          selectedNode?.startLine ?? selectedMethod.startLine
                        }
                        endLine={
                          selectedNode?.endLine ?? selectedMethod.endLine
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
          )}
        </main>
      </div>}
    </div>
  );
}
