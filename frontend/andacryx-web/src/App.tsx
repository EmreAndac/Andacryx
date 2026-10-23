import { useState, type ChangeEvent } from "react";
import { Upload, FileCode2, Workflow } from "lucide-react";
import "./App.css";

type MethodInfo = {
  name: string;
  startLine: number;
  endLine: number;
};

type ClassInfo = {
  name: string;
  methods: MethodInfo[];
};

type AnalysisResult = {
  fileName: string;
  classes: ClassInfo[];
};

export default function App() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setResult(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "http://localhost:5050/api/analysis/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Dosya analiz edilemedi.");
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Bir hata oluştu."
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2><Workflow size={24} /> Andacryx</h2>

        <p className="section-title">PROJECT EXPLORER</p>

        {!result && (
          <p className="muted">Henüz dosya yüklenmedi.</p>
        )}

        {result && (
          <div>
            <p className="file-name">
              <FileCode2 size={16} /> {result.fileName}
            </p>

            {result.classes.map((cls, index) => (
              <div className="class-item" key={index}>
                <strong>{cls.name}</strong>

                {cls.methods.map((method, i) => (
                  <p className="method" key={i}>
                    {method.name}()
                    <small>Satır {method.startLine}</small>
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
      </aside>

      <main className="main">
        <header>
          <h1>Code Flow Explorer</h1>
          <span>v0.1</span>
        </header>

        <section className="workspace">
          <label className="upload-area">
            <Upload size={36} />
            <h2>C# dosyanı yükle</h2>
            <p>Analiz etmek için bir .cs dosyası seç.</p>

            <input
              type="file"
              accept=".cs"
              onChange={handleUpload}
              hidden
            />

            <span className="upload-button">
              Dosya Seç
            </span>
          </label>

          {loading && <p>Dosya analiz ediliyor...</p>}
          {error && <p className="error">{error}</p>}

          {result && (
            <div className="results">
              <h2>Analiz tamamlandı</h2>
              <p>
                {result.classes.length} sınıf ve{" "}
                {result.classes.reduce(
                  (sum, cls) => sum + cls.methods.length, 0
                )} metot bulundu.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}