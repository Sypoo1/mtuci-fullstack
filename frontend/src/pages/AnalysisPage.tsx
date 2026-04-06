import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Navbar from "../components/Navbar";
import api from "../api/client";
import type { AnalysisResult } from "../types";
import {
  pageWrapper,
  card,
  table,
  tableHeadRow,
  th,
  td,
  sectionTitle,
  breadcrumbs,
  breadcrumbLink,
  scoreColor,
  btnDanger,
} from "../styles/common";

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    async function fetchAnalysis() {
      try {
        const res = await api.get(`/api/v1/analyses/${id}`);
        setAnalysis(res.data);
        if (res.data.status === "completed" || res.data.status === "failed") {
          clearInterval(interval);
        }
      } catch {
        setFetchError("Не удалось загрузить результат анализа");
        clearInterval(interval);
      }
    }

    fetchAnalysis();
    interval = setInterval(fetchAnalysis, 5000);
    return () => clearInterval(interval);
  }, [id]);

  async function deleteAnalysis() {
    if (!analysis) return;
    if (!confirm("Удалить этот анализ?")) return;
    setDeleting(true);
    try {
      await api.delete(`/api/v1/analyses/${id}`);
      navigate(`/repositories/${analysis.repository_id}`);
    } catch {
      alert("Не удалось удалить анализ");
      setDeleting(false);
    }
  }

  if (fetchError) {
    return (
      <div>
        <Navbar />
        <div style={{ padding: "60px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>✗</div>
          <h3>{fetchError}</h3>
          <Link to="/dashboard">← Вернуться на дашборд</Link>
        </div>
      </div>
    );
  }

  if (!analysis || analysis.status === "pending" || analysis.status === "running") {
    return (
      <div>
        <Navbar />
        <div style={{ padding: "60px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>⟳</div>
          <h3>Анализ выполняется...</h3>
          <p style={{ color: "#888" }}>Собираем данные из GitHub API и генерируем AI-отчёт</p>
          <div style={{ marginTop: "24px", display: "flex", gap: "16px", justifyContent: "center" }}>
            {analysis && (
              <Link to={`/repositories/${analysis.repository_id}`} style={{ fontSize: "14px", color: "#1a1a2e" }}>
                ← Вернуться к репозиторию
              </Link>
            )}
            <Link to="/dashboard" style={{ fontSize: "14px", color: "#888" }}>
              На дашборд
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (analysis.status === "failed") {
    return (
      <div>
        <Navbar />
        <div style={{ padding: "60px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>✗</div>
          <h3>Анализ завершился с ошибкой</h3>
          <p style={{ color: "#888" }}>Проверьте GitHub токен и доступность репозитория</p>
          <div style={{ marginTop: "24px", display: "flex", gap: "16px", justifyContent: "center" }}>
            <Link to={`/repositories/${analysis.repository_id}`} style={{ fontSize: "14px", color: "#1a1a2e" }}>
              ← Вернуться к репозиторию
            </Link>
            <Link to="/dashboard" style={{ fontSize: "14px", color: "#888" }}>
              На дашборд
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const contributors = [...(analysis.contributors ?? [])].sort((a, b) => b.score - a.score);

  const totalCommits = contributors.reduce((s, c) => s + c.commits_count, 0);
  const totalPRs = contributors.reduce((s, c) => s + c.prs_opened, 0);
  const totalReviews = contributors.reduce((s, c) => s + c.reviews_given, 0);

  const commitsData = contributors.map((c) => ({ name: c.github_login, commits: c.commits_count }));
  const prData = contributors.map((c) => ({ name: c.github_login, opened: c.prs_opened, merged: c.prs_merged }));
  const reviewData = contributors.map((c) => ({ name: c.github_login, reviews: c.reviews_given }));
  const scoreData = contributors.map((c) => ({ name: c.github_login, score: Math.round(c.score) }));

  const summaryStats = [
    { label: "Всего коммитов", value: totalCommits },
    { label: "Pull Requests", value: totalPRs },
    { label: "Code Reviews", value: totalReviews },
    { label: "Участников", value: contributors.length },
  ];

  return (
    <div>
      <Navbar />
      <div style={pageWrapper}>

        {/* Хлебные крошки */}
        <div style={breadcrumbs}>
          <Link to="/dashboard" style={breadcrumbLink}>Дашборд</Link>
          {" / "}
          <Link to={`/repositories/${analysis.repository_id}`} style={breadcrumbLink}>Репозиторий</Link>
          {" / "}Анализ #{analysis.id}
        </div>

        {/* Заголовок */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div>
            <h2 style={{ margin: 0 }}>Анализ #{analysis.id}</h2>
            <p style={{ color: "#888", fontSize: "13px", margin: "4px 0 0" }}>
              Период: {analysis.start_date} – {analysis.end_date} · {contributors.length} участников
            </p>
          </div>
          <button onClick={deleteAnalysis} disabled={deleting} style={btnDanger}>
            {deleting ? "Удаление..." : "🗑 Удалить анализ"}
          </button>
        </div>

        {/* Сводные метрики */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
          {summaryStats.map((stat) => (
            <div key={stat.label} style={{ ...card, textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: "bold" }}>{stat.value}</div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Таблица участников */}
        <h3 style={sectionTitle}>Метрики по участникам</h3>
        <div style={{ overflowX: "auto", marginBottom: "24px" }}>
          <table style={table}>
            <thead>
              <tr style={tableHeadRow}>
                {["#", "Участник", "Коммиты", "+Строк", "-Строк", "PR открыто", "PR смёрджено", "Reviews", "Score"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contributors.map((c, i) => (
                <tr key={c.id}>
                  <td style={td}>{i + 1}</td>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {c.avatar_url && (
                        <img src={c.avatar_url} alt="" style={{ width: "24px", height: "24px", borderRadius: "50%" }} />
                      )}
                      {c.github_login}
                    </div>
                  </td>
                  <td style={td}>{c.commits_count}</td>
                  <td style={{ ...td, color: "#16a34a" }}>+{c.additions}</td>
                  <td style={{ ...td, color: "#dc2626" }}>-{c.deletions}</td>
                  <td style={td}>{c.prs_opened}</td>
                  <td style={td}>{c.prs_merged}</td>
                  <td style={td}>{c.reviews_given}</td>
                  <td style={td}>
                    <strong style={{ color: scoreColor(c.score) }}>{Math.round(c.score)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Графики */}
        <h3 style={{ ...sectionTitle, marginBottom: "16px" }}>Графики</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>

          <div style={card}>
            <h4 style={{ margin: "0 0 12px", fontSize: "14px" }}>Коммиты по участникам</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={commitsData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="commits" fill="#1a1a2e" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={card}>
            <h4 style={{ margin: "0 0 12px", fontSize: "14px" }}>PR открыто vs смёрджено</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={prData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="opened" name="Открыто" fill="#4a90d9" />
                <Bar dataKey="merged" name="Смёрджено" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={card}>
            <h4 style={{ margin: "0 0 12px", fontSize: "14px" }}>Code Reviews по участникам</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={reviewData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="reviews" fill="#7c3aed" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={card}>
            <h4 style={{ margin: "0 0 12px", fontSize: "14px" }}>Score по участникам (0–100)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scoreData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="score" fill="#ca8a04" />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* AI-отчёт */}
        {analysis.ai_report && (
          <div style={{ border: "1px solid #bfdbfe", borderRadius: "8px", padding: "20px", background: "#eff6ff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ width: "32px", height: "32px", background: "linear-gradient(135deg, #4a90d9, #7c3aed)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "16px" }}>
                🤖
              </div>
              <div>
                <div style={{ fontWeight: "bold", fontSize: "14px" }}>AI-отчёт (сгенерирован GPT-4o-mini)</div>
                <div style={{ fontSize: "12px", color: "#888" }}>Автоматический анализ на основе собранных метрик</div>
              </div>
            </div>
            <div style={{ fontSize: "14px", lineHeight: 1.7, color: "#333", whiteSpace: "pre-wrap" }}>
              {analysis.ai_report}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
