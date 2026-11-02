import { useEffect, useState } from "react";
import { FolderGit2, ArrowLeft, HardDrive, RefreshCw } from "lucide-react";
import { getLocalProjects } from "../services/projectStorage";
import type { LocalProject } from "../types/project";
import "./MyProjects.css";

type Props = { onBack: () => void };

export default function MyProjects({ onBack }: Props) {
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await getLocalProjects();
        if (!cancelled) setProjects(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Projeler yüklenemedi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [reloadKey]);

  return (
    <section className="my-projects">
      <div className="my-projects-top">
        <div><h2>Your Projects</h2><p>Tarayıcında kaydettiğin yerel projeler.</p></div>
        <button type="button" className="my-projects-action" onClick={() => setReloadKey(value => value + 1)}><RefreshCw size={15} /> Yenile</button>
      </div>
      {loading ? <p role="status">Projeler yükleniyor...</p> : error ? (
        <div className="my-projects-empty" role="alert"><p>{error}</p><button type="button" className="my-projects-action" onClick={() => setReloadKey(value => value + 1)}>Tekrar dene</button></div>
      ) : projects.length === 0 ? (
        <div className="my-projects-empty">
          <FolderGit2 size={38} />
          <h3>Henüz kayıtlı projen yok</h3>
          <p>Quick Analysis ile kodlarını inceleyebilirsin. Projeyi isteğe bağlı kaydetme özelliğini sonraki aşamada ekleyeceğiz.</p>
          <button type="button" className="my-projects-action" onClick={onBack}><ArrowLeft size={16} /> Quick Analysis'e dön</button>
        </div>
      ) : (
        <div className="my-projects-grid">
          {projects.map(project => (
            <article key={project.id} className="my-projects-card">
              <div className="my-projects-card-title"><FolderGit2 size={22} /><h3>{project.name}</h3></div>
              <p>{project.snapshot.files.length} C# dosyası</p>
              <p>Son düzenleme: {new Date(project.updatedAt).toLocaleString("tr-TR")}</p>
              <span className="my-projects-local"><HardDrive size={14} /> Local Project</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
