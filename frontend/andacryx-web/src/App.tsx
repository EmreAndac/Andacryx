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
import CodeInspector from "./components/CodeInspector";
import ResizablePanels from "./components/ResizablePanels";
import TopBar from "./components/TopBar";
import { APP_CONFIG } from "./config/app.config";
import Sidebar, {
  type AnalysisResult,
  type MethodInfo,
} from "./components/Sidebar";
import WorkspaceToolbar, {
  type WorkspaceView,
} from "./components/WorkspaceToolbar";

type FlowAnalysisResult = { fileName: string; methods: MethodFlowDto[] };

export default function App() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [flowResult, setFlowResult] = useState<FlowAnalysisResult | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<MethodFlowDto | null>(
    null,
  );
  const [selectedNode, setSelectedNode] = useState<FlowNodeDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sourceCode, setSourceCode] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("split");

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setResult(null);
    setFlowResult(null);
    setSelectedMethod(null);
    setSelectedNode(null);
    setLoading(true);
    setSourceCode("");
    setWorkspaceView("split");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const code = await file.text();
      setSourceCode(code);

      const [analysisResponse, flowResponse] = await Promise.all([
        fetch("http://localhost:5050/api/analysis/upload", {
          method: "POST",
          body: formData,
        }),
        fetch("http://localhost:5050/api/analysis/flow", {
          method: "POST",
          body: formData,
        }),
      ]);

      if (!analysisResponse.ok || !flowResponse.ok)
        throw new Error("Dosya analiz edilemedi.");

      const analysis: AnalysisResult = await analysisResponse.json();
      const flow: FlowAnalysisResult = await flowResponse.json();

      setResult(analysis);
      setFlowResult(flow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  function selectMethod(method: MethodInfo) {
    const flow = flowResult?.methods.find(
      (item) =>
        item.name === method.name && item.startLine === method.startLine,
    );
    setSelectedMethod(flow ?? null);
    setSelectedNode(null);
  }

  return (
    <div className="app-shell">
      <TopBar fileName={result?.fileName} />

      <div className="app">
        <Sidebar
          result={result}
          selectedMethodStartLine={selectedMethod?.startLine}
          onMethodSelect={selectMethod}
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
              onChange={handleUpload}
              hidden
            />

            {!result && !loading && (
              <div className="workspace-empty">
                <div className="workspace-empty-icon">
                  <Upload size={28} />
                </div>

                <h2>İlk kod analizini başlat</h2>
                <p>
                  C# dosyanı yükle, metotlarını incele ve kontrol akışını
                  görselleştir.
                </p>

                <button
                  type="button"
                  className="workspace-upload-button"
                  onClick={openFilePicker}
                >
                  <FilePlus2 size={17} />
                  C# Dosyası Seç
                </button>

                <span>Desteklenen dosya biçimi: .cs</span>
              </div>
            )}

            {loading && <p>Dosya analiz ediliyor...</p>}
            {error && <p className="error">{error}</p>}

            {result && (
              <div className="analysis-summary">
                <span className="analysis-summary-dot" />
                <strong>{result.fileName}</strong>
                <span>{result.classes.length} sınıf</span>
                <span>
                  {result.classes.reduce(
                    (sum, cls) => sum + cls.methods.length,
                    0,
                  )}{" "}
                  metot
                </span>
                <span className="analysis-summary-status">
                  Analiz tamamlandı
                </span>
              </div>
            )}

            {selectedMethod && (
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
                            code={sourceCode}
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
                        code={sourceCode}
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
