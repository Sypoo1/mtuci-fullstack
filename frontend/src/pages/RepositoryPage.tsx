import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/client";
import type { Repository, Analysis } from "../types";
import {
  pageWrapper,
  cardHighlighted,
  table,
  tableHeadRow,
  th,
  td,
  btnPrimary,
  btnDanger,
  btnDangerSmall,
  sectionTitle,
  label,
  hint,
  breadcrumbs,
  breadcrumbLink,
  statusBadgeStyle,
  statusLabel,
  errorText,
} from "../styles/common";

export default function RepositoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [repo, setRepo] = useState<Repository | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    api.get(`/api/v1/repositories/${id}`)
      .then((r) => setRepo(r.data))
      .catch(() => setNotFound(true));

    api.get(`/api/v1/repositories/${id}/analyses`)
      .then((r) => setAnalyses(r.data))
      .catch(() => {});

    // Дефолтный период — последние 30 дней
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setEndDate(end.toISOString().split("T")[0]);
    setStartDate(start.toISOString().split("T")[0]);
  }, [id]);

  async function runAnalysis(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post(`/api/v1/repositories/${id}/analyses`, {
        start_date: startDate,
        end_date: endDate,
      });
      navigate(`/analyses/${res.data.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Не удалось запустить анализ. Проверьте GitHub токен.");
      setLoading(false);
    }
  }

  async function deleteRepo() {
    if (!confirm("Удалить репозиторий и все его анализы?")) return;
    await api.delete(`/api/v1/repositories/${id}`).catch(() => {});
    navigate("/dashboard");
  }

  async function deleteAnalysis(analysisId: number) {
    if (!confirm("Удалить этот анализ?")) return;
    setDeletingId(analysisId);
    try {
      await api.delete(`/api/v1/analyses/${analysisId}`);
      setAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
    } catch {
      alert("Не удалось удалить анализ");
    } finally {
      setDeletingId(null);
    }
  }

  if (notFound) {
    return (
      <div>
        <Navbar />
        <div style={{ padding: "60px", textAlign: "center" }}>
          <h3>Репозиторий не найден</h3>
          <Link to="/dashboard">← Вернуться на дашборд</Link>
        </div>
      </div>
    );
  }

  if (!repo) {
    return (
      <div>
        <Navbar />
        <div style={{ padding: "24px", color: "#888" }}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div style={pageWrapper}>

        {/* Хлебные крошки */}
        <div style={breadcrumbs}>
          <Link to="/dashboard" style={breadcrumbLink}>Дашборд</Link>
          {" / "}
          {repo.owner}/{repo.name}
        </div>

        {/* Заголовок */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div>
            <h2 style={{ margin: 0 }}>{repo.owner} / {repo.name}</h2>
            <p style={{ color: "#888", fontSize: "13px", margin: "4px 0 0" }}>GitHub-репозиторий</p>
          </div>
          <button onClick={deleteRepo} style={btnDanger}>Удалить</button>
        </div>

        {/* Форма запуска анализа */}
        <div style={cardHighlighted}>
          <h3 style={{ margin: "0 0 16px" }}>Запустить новый анализ</h3>
          <form onSubmit={runAnalysis} style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={label}>Дата начала</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" }}
              />
            </div>
            <div>
              <label style={label}>Дата окончания</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" }}
              />
            </div>
            <button type="submit" disabled={loading} style={btnPrimary}>
              {loading ? "Запуск..." : "▶ Запустить анализ"}
            </button>
          </form>
          {error && <p style={{ ...errorText, marginTop: "8px" }}>{error}</p>}
          <p style={hint}>
            Система соберёт коммиты, PR и code review за указанный период через GitHub API
          </p>
        </div>

        {/* История анализов */}
        <h3 style={sectionTitle}>История анализов</h3>
        {analyses.length === 0 ? (
          <p style={{ color: "#888", fontSize: "14px" }}>Анализов пока нет. Запустите первый анализ выше.</p>
        ) : (
          <table style={table}>
            <thead>
              <tr style={tableHeadRow}>
                <th style={th}>#</th>
                <th style={th}>Период</th>
                <th style={th}>Статус</th>
                <th style={th}>Запущен</th>
                <th style={th}></th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((a) => (
                <tr key={a.id}>
                  <td style={td}>{a.id}</td>
                  <td style={td}>{a.start_date} – {a.end_date}</td>
                  <td style={td}>
                    <span style={statusBadgeStyle(a.status)}>{statusLabel(a.status)}</span>
                  </td>
                  <td style={td}>{new Date(a.created_at).toLocaleString("ru")}</td>
                  <td style={td}>
                    {a.status === "completed" && (
                      <Link to={`/analyses/${a.id}`} style={{ fontSize: "13px", color: "#1a1a2e" }}>
                        Открыть результат →
                      </Link>
                    )}
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => deleteAnalysis(a.id)}
                      disabled={deletingId === a.id}
                      style={btnDangerSmall}
                      title="Удалить анализ"
                    >
                      {deletingId === a.id ? "..." : "🗑"}
                    </button>
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
