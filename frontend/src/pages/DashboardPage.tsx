import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/client";
import type { Repository, Analysis } from "../types";

const MOCK_REPOS: Repository[] = [
  { id: 1, owner: "facebook", name: "react", created_at: "2025-03-01T10:00:00Z" },
  { id: 2, owner: "tiangolo", name: "fastapi", created_at: "2025-03-10T10:00:00Z" },
];

const MOCK_ANALYSES: Analysis[] = [
  { id: 1, repository_id: 1, start_date: "2025-03-01", end_date: "2025-03-20", status: "completed", created_at: "2025-03-20T14:32:00Z" },
  { id: 2, repository_id: 2, start_date: "2025-03-01", end_date: "2025-03-15", status: "completed", created_at: "2025-03-15T10:15:00Z" },
];

export default function DashboardPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/api/v1/repositories")
      .then((r) => setRepos(r.data))
      .catch(() => setRepos(MOCK_REPOS));
    api.get("/api/v1/analyses")
      .then((r) => setAnalyses(r.data))
      .catch(() => setAnalyses(MOCK_ANALYSES));
  }, []);

  async function deleteRepo(id: number) {
    if (!confirm("Удалить репозиторий?")) return;
    await api.delete(`/api/v1/repositories/${id}`).catch(() => {});
    setRepos((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div>
      <Navbar />
      <div style={{ padding: "24px 32px" }}>

        {/* Заголовок */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h2 style={{ margin: 0 }}>Мои репозитории</h2>
            <p style={{ color: "#888", margin: "4px 0 0", fontSize: "14px" }}>Список подключённых GitHub-репозиториев</p>
          </div>
          <button onClick={() => navigate("/repositories/new")} style={{ padding: "8px 16px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            + Добавить репозиторий
          </button>
        </div>

        {/* Карточки репозиториев */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          {repos.map((repo) => (
            <div key={repo.id} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px" }}>
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{repo.owner} / {repo.name}</div>
              <div style={{ fontSize: "13px", color: "#888", marginBottom: "12px" }}>
                Добавлен: {new Date(repo.created_at).toLocaleDateString("ru")}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Link to={`/repositories/${repo.id}`} style={{ flex: 1, textAlign: "center", padding: "6px", border: "1px solid #ddd", borderRadius: "4px", textDecoration: "none", color: "#333", fontSize: "13px" }}>
                  Открыть
                </Link>
                <button onClick={() => deleteRepo(repo.id)} style={{ padding: "6px 10px", border: "1px solid #fca5a5", background: "#fee2e2", color: "#dc2626", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}>
                  🗑
                </button>
              </div>
            </div>
          ))}

          <div
            onClick={() => navigate("/repositories/new")}
            style={{ border: "2px dashed #ccc", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#999", minHeight: "120px" }}
          >
            <div style={{ fontSize: "24px" }}>+</div>
            <div style={{ fontSize: "13px" }}>Добавить репозиторий</div>
          </div>
        </div>

        {/* Последние анализы */}
        <h3 style={{ marginBottom: "12px" }}>Последние анализы</h3>
        {analyses.length === 0 ? (
          <p style={{ color: "#888", fontSize: "14px" }}>Анализов пока нет.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Репозиторий</th>
                <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Период</th>
                <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Статус</th>
                <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Дата</th>
                <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}></th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((a) => (
                <tr key={a.id}>
                  <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>
                    {repos.find((r) => r.id === a.repository_id)?.name ?? `#${a.repository_id}`}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>{a.start_date} – {a.end_date}</td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "12px", background: a.status === "completed" ? "#dcfce7" : "#fef9c3", color: a.status === "completed" ? "#16a34a" : "#92400e" }}>
                      {a.status === "completed" ? "✓ Завершён" : a.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>{new Date(a.created_at).toLocaleDateString("ru")}</td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>
                    <Link to={`/analyses/${a.id}`} style={{ fontSize: "13px", color: "#1a1a2e" }}>Открыть →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
