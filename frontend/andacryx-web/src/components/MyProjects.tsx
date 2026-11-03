import { useEffect, useState } from "react";
import { FolderGit2, ArrowLeft, HardDrive, RefreshCw, Save, Pencil, Trash2, FolderOpen } from "lucide-react";
import { deleteLocalProject, getLocalProjects, renameLocalProject } from "../services/projectStorage";
import type { LocalProject } from "../types/project";
import "./MyProjects.css";
import "./MyProjectsActions.css";

type Props = { onBack: () => void; onOpen: (id: string) => Promise<void>; onSaveCurrent: () => Promise<void> };

export default function MyProjects({ onBack, onOpen, onSaveCurrent }: Props) {
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      try { const result = await getLocalProjects(); if (!cancelled) setProjects(result); }
      catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : "Projeler yüklenemedi."); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [reloadKey]);

  async function rename(project: LocalProject) {
    const name = window.prompt("Yeni proje adı:", project.name);
    if (name === null) return;
    if (!name.trim()) { window.alert("Proje adı boş olamaz."); return; }
    setBusy(true);
    try { await renameLocalProject(project.id, name); setReloadKey(k => k + 1); }
    catch (err) { window.alert(err instanceof Error ? err.message : "Proje yeniden adlandırılamadı."); }
    finally { setBusy(false); }
  }

  async function remove(project: LocalProject) {
    if (!window.confirm(`“${project.name}” kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return;
    setBusy(true);
    try { await deleteLocalProject(project.id); setReloadKey(k => k + 1); }
    catch (err) { window.alert(err instanceof Error ? err.message : "Proje silinemedi."); }
    finally { setBusy(false); }
  }

  return <section className="my-projects">
    <div className="my-projects-top">
      <div><h2>Your Projects</h2><p>Tarayıcında kaydettiğin yerel projeler.</p></div>
      <div className="my-projects-actions">
        <button type="button" className="my-projects-action" disabled={busy} onClick={() => void onSaveCurrent()}><Save size={15}/> Save as Project</button>
        <button type="button" className="my-projects-action" disabled={busy} onClick={() => setReloadKey(k => k + 1)}><RefreshCw size={15}/> Yenile</button>
      </div>
    </div>
    {loading ? <p role="status">Projeler yükleniyor...</p> : error ?
      <div className="my-projects-empty" role="alert"><p>{error}</p><button type="button" className="my-projects-action" onClick={() => setReloadKey(k => k + 1)}>Tekrar dene</button></div> :
      projects.length === 0 ? <div className="my-projects-empty"><FolderGit2 size={38}/><h3>Henüz kayıtlı projen yok</h3><p>Quick Analysis'teki çalışmanı Save as Project ile kaydedebilirsin.</p><button type="button" className="my-projects-action" onClick={onBack}><ArrowLeft size={16}/> Quick Analysis'e dön</button></div> :
      <div className="my-projects-grid">{projects.map(project => <article key={project.id} className="my-projects-card">
        <div className="my-projects-card-title"><FolderGit2 size={22}/><h3>{project.name}</h3></div>
        <p>{project.snapshot.files.length} C# dosyası</p>
        <p>Son düzenleme: {new Date(project.updatedAt).toLocaleString("tr-TR")}</p>
        <span className="my-projects-local"><HardDrive size={14}/> Local Project</span>
        <div className="my-projects-card-actions">
          <button type="button" disabled={busy} onClick={() => void onOpen(project.id)}><FolderOpen size={15}/> Aç</button>
          <button type="button" disabled={busy} onClick={() => void rename(project)}><Pencil size={15}/> Yeniden adlandır</button>
          <button type="button" disabled={busy} onClick={() => void remove(project)}><Trash2 size={15}/> Sil</button>
        </div>
      </article>)}</div>}
  </section>;
}
