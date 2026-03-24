import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/client";
import type { Repository, Analysis } from "../types";

const MOCK_REPOS: Record<string, Repository> = {
  "1": { id: 1, owner: "facebook", name: "react", created_at: "2025-03-01T00:00:00Z" },
  "2": { id: 2, owner: "tiangolo", name: "fastapi", created_at: "2025-03-10T00:00:00Z" },
};

const MOCK_ANALYSES: Analysis[] = [
  { id: 1, repository_id: 1, start_date: "2025-03-01", end_date: "2025-03-20", status: "completed", created_at: "2025-03-20T14:32:00Z" },
  { id: 2, repository_id: 1, start_date: "2025-02-01", end_date: "2025-02-28", status: "completed", created_at: "2025-02-28T10:15:00Z" },
];

export default function RepositoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [repo, setRepo] = useState<Repository | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/api/v1/repositories/${id}`)
      .then((r) => setRepo(r.data))
      .catch(() => {
        // Бэкенд недоступен — используем мок-данные
        const mockRepo = MOCK_REPOS[id ?? "1"] ?? MOCK_REPOS["1"];
        setRepo(mockRepo);
      });
    api.get(`/api/v1/repositories/${id}/analyses`)
      .then((r) => setAnalyses(r.data))
      .catch(() => {
        setAnalyses(MOCK_ANALYSES.filter((a) => a.repository_id === Number(id)));
      });

    // Дефолтный период — последние 30 дней
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setEndDate(end.toISOString().split("T")[0]);
    setStartDate(start.toISOString().split("T")[0]);
  }, [id]);

  async function runAnalysis(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post(`/api/v1/repositories/${id}/analyses`, {
        start_date: startDate,
        end_date: endDate,
      });
      navigate(`/analyses/${res.data.id}`);
    } catch {
      // Бэкенд недоступен — переходим к мок-анализу
      navigate("/analyses/1");
      setLoading(false);
    }
  }

  async function deleteRepo() {
    if (!confirm("Удалить репозиторий и все его анализы?")) return;
    await api.delete(`/api/v1/repositories/${id}`);
    navigate("/dashboard");
  }

  if (!repo) return <div><Navbar /><div style={{ padding: "24px", color: "#888" }}>Загрузка...</div></div>;

  return (
    <div>
      <Navbar />
      <div style={{ padding: "24px 32px" }}>

        {/* Хлебные крошки */}
        <div style={{ fontSize: "13px", color: "#888", marginBottom: "16px" }}>
          <Link to="/dashboard" style={{ color: "#888" }}>Дашборд</Link> / {repo.owner}/{repo.name}
        </div>

        {/* Заголовок */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div>
            <h2 style={{ margin: 0 }}>{repo.owner} / {repo.name}</h2>
            <p style={{ color: "#888", fontSize: "13px", margin: "4px 0 0" }}>GitHub-репозиторий</p>
          </div>
          <button onClick={deleteRepo} style={{ padding: "6px 12px", border: "1px solid #fca5a5", background: "#fee2e2", color: "#dc2626", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}>
            Удалить
          </button>
        </div>

        {/* Форма запуска анализа */}
        <div style={{ border: "2px solid #1a1a2e", borderRadius: "8px", padding: "20px", marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 16px" }}>Запустить новый анализ</h3>
          <form onSubmit={runAnalysis} style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Дата начала</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Дата окончания</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" }}
              />
            </div>
            <button type="submit" disabled={loading} style={{ padding: "8px 20px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px" }}>
              {loading ? "Запуск..." : "▶ Запустить анализ"}
            </button>
          </form>
          <p style={{ fontSize: "12px", color: "#888", margin: "8px 0 0" }}>
            Система соберёт коммиты, PR и code review за указанный период через GitHub API
          </p>
        </div>

        {/* История анализов */}
        <h3 style={{ marginBottom: "12px" }}>История анализов</h3>
        {analyses.length === 0 ? (
          <p style={{ color: "#888", fontSize: "14px" }}>Анализов пока нет. Запустите первый анализ выше.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}>#</th>
                <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Период</th>
                <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Статус</th>
                <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Запущен</th>
                <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}></th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((a) => (
                <tr key={a.id}>
                  <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>{a.id}</td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>{a.start_date} – {a.end_date}</td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "12px", background: a.status === "completed" ? "#dcfce7" : a.status === "failed" ? "#fee2e2" : "#fef9c3", color: a.status === "completed" ? "#16a34a" : a.status === "failed" ? "#dc2626" : "#92400e" }}>
                      {a.status === "completed" ? "✓ Завершён" : a.status === "failed" ? "✗ Ошибка" : "⟳ Выполняется"}
                    </span>
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>
                    {new Date(a.created_at).toLocaleString("ru")}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>
                    {a.status === "completed" && (
                      <Link to={`/analyses/${a.id}`} style={{ fontSize: "13px", color: "#1a1a2e" }}>Открыть результат →</Link>
                    )}
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
