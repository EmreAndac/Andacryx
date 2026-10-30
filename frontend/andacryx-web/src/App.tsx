import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FilePlus2, Upload, FolderOpen } from "lucide-react";
import FlowDiagram, {
  type FlowNodeDto,
  type MethodFlowDto,
} from "./components/FlowDiagram";
import "./App.css";
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

const API_BASE_URL = "http://localhost:5050";

export default function App() {
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

  useEffect(() => {
    if (!workspaceReady) return;

    const selectedMethodLines: Record<string, number> = {};
    for (const [fileId, method] of Object.entries(selectedMethods)) {
      if (method) selectedMethodLines[fileId] = method.startLine;
    }

    const snapshot: WorkspaceSnapshot = {
      version: 1,
      files,
      openFileIds,
      activeFileId,
      selectedMethodLines,
      workspaceView,
      diagramPositions,
    };

    const timeout = window.setTimeout(() => {
      // Kaydetme işlemlerini sıraya alarak eski verinin yenisini ezmesini önle.
      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(() => saveWorkspace(snapshot))
        .catch(err => console.error("Workspace save failed:", err));
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [workspaceReady, files, openFileIds, activeFileId, selectedMethods, workspaceView, diagramPositions]);

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
          files={files}
          activeFileId={activeFileId}
          selectedMethodStartLine={selectedMethod?.startLine}
          onFileSelect={selectFile}
          onMethodSelect={selectMethod}
          onFileAdd={openFilePicker}
          onFileRemove={removeFile}
        />

        <main className="main">
          <header>
            <h1>Code Flow Explorer</h1>
            <span>v{APP_CONFIG.version}</span>
          </header>

          <section className="workspace">
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
        </main>
      </div>}
    </div>
  );
}
