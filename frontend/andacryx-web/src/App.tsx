
import { useState, type ChangeEvent } from "react";
import { Upload, FileCode2, Workflow } from "lucide-react";
import FlowDiagram, { type FlowNodeDto, type MethodFlowDto } from "./components/FlowDiagram";
import "./App.css";

type MethodInfo = { name: string; startLine: number; endLine: number };
type ClassInfo = { name: string; methods: MethodInfo[] };
type AnalysisResult = { fileName: string; classes: ClassInfo[] };
type FlowAnalysisResult = { fileName: string; methods: MethodFlowDto[] };

export default function App() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [flowResult, setFlowResult] = useState<FlowAnalysisResult | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<MethodFlowDto | null>(null);
  const [selectedNode, setSelectedNode] = useState<FlowNodeDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setResult(null);
    setFlowResult(null);
    setSelectedMethod(null);
    setSelectedNode(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const [analysisResponse, flowResponse] = await Promise.all([
        fetch("http://localhost:5050/api/analysis/upload", { method: "POST", body: formData }),
        fetch("http://localhost:5050/api/analysis/flow", { method: "POST", body: formData })
      ]);

      if (!analysisResponse.ok || !flowResponse.ok) throw new Error("Dosya analiz edilemedi.");

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
    const flow = flowResult?.methods.find(item => item.name === method.name && item.startLine === method.startLine);
    setSelectedMethod(flow ?? null);
    setSelectedNode(null);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2><Workflow size={24} /> Andacryx</h2>
        <p className="section-title">PROJECT EXPLORER</p>

        {!result && <p className="muted">Henüz dosya yüklenmedi.</p>}

        {result && (
          <div>
            <p className="file-name"><FileCode2 size={16} /> {result.fileName}</p>

            {result.classes.map((cls, index) => (
              <div className="class-item" key={index}>
                <strong>{cls.name}</strong>

                {cls.methods.map((method, i) => (
                  <button className="method" key={i} onClick={() => selectMethod(method)}>
                    {method.name}()
                    <small>Satır {method.startLine}</small>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </aside>

      <main className="main">
        <header>
          <h1>Code Flow Explorer</h1>
          <span>v0.3</span>
        </header>

        <section className="workspace">
          <label className="upload-area">
            <Upload size={36} />
            <h2>C# dosyanı yükle</h2>
            <p>Analiz etmek için bir .cs dosyası seç.</p>
            <input type="file" accept=".cs" onChange={handleUpload} hidden />
            <span className="upload-button">Dosya Seç</span>
          </label>

          {loading && <p>Dosya analiz ediliyor...</p>}
          {error && <p className="error">{error}</p>}

          {result && (
            <div className="results">
              <h2>Analiz tamamlandı</h2>
              <p>{result.classes.length} sınıf ve {result.classes.reduce((sum, cls) => sum + cls.methods.length, 0)} metot bulundu.</p>
            </div>
          )}

          {selectedMethod && (
            <div className="results">
              <h2>{selectedMethod.name}() Flow</h2>
              <FlowDiagram method={selectedMethod} onNodeSelect={setSelectedNode} />
            </div>
          )}

          {selectedNode && (
            <div className="results">
              <h3>Code Inspector</h3>
              <p>Satır {selectedNode.startLine}–{selectedNode.endLine}</p>
              <pre className="code-preview"><code>{selectedNode.code}</code></pre>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
