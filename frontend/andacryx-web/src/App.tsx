import { useRef, useState, type ChangeEvent } from "react";
import { FilePlus2, Upload } from "lucide-react";
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

const API_BASE_URL = "http://localhost:5050";

export default function App() {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [openFileIds, setOpenFileIds] = useState<string[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<MethodFlowDto | null>(
    null,
  );
  const [selectedNode, setSelectedNode] = useState<FlowNodeDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("split");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeFile = files.find((file) => file.id === activeFileId) ?? null;

  function openFilePicker() {
    fileInputRef.current?.click();
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
      path: file.name,
      sourceCode,
      analysis,
      flow,
    };
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) return;

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
        setSelectedMethod(null);
        setSelectedNode(null);
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
    setSelectedMethod(null);
    setSelectedNode(null);
  }

  function removeFile(fileId: string) {
    setFiles((previous) => previous.filter((file) => file.id !== fileId));

    const remainingTabs = openFileIds.filter((id) => id !== fileId);
    setOpenFileIds(remainingTabs);

    if (activeFileId === fileId) {
      setActiveFileId(remainingTabs[0] ?? null);
      setSelectedMethod(null);
      setSelectedNode(null);
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
    setSelectedMethod(flow ?? null);
    setSelectedNode(null);
  }

  function closeFileTab(fileId: string) {
    const remainingTabs = openFileIds.filter((id) => id !== fileId);
    setOpenFileIds(remainingTabs);

    if (activeFileId !== fileId) return;

    const closedIndex = openFileIds.indexOf(fileId);
    const nextFileId =
      remainingTabs[Math.min(closedIndex, remainingTabs.length - 1)] ?? null;

    setActiveFileId(nextFileId);
    setSelectedMethod(null);
    setSelectedNode(null);
  }

  return (
    <div className="app-shell">
      <TopBar />

      <div className="app">
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
                            onNodeSelect={setSelectedNode}
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
                        onNodeSelect={setSelectedNode}
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
      </div>
    </div>
  );
}
