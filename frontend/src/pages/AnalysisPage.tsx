import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Navbar from "../components/Navbar";
import api from "../api/client";
import type { AnalysisResult } from "../types";

const MOCK_ANALYSIS: AnalysisResult = {
  id: 1,
  repository_id: 1,
  start_date: "2025-03-01",
  end_date: "2025-03-20",
  status: "completed",
  created_at: "2025-03-20T14:32:00Z",
  contributors: [
    { id: 1, github_login: "gaearon", avatar_url: "https://avatars.githubusercontent.com/u/810438", commits_count: 42, additions: 1840, deletions: 620, prs_opened: 8, prs_merged: 7, reviews_given: 15, score: 87 },
    { id: 2, github_login: "sebmarkbage", avatar_url: "https://avatars.githubusercontent.com/u/63648", commits_count: 35, additions: 2100, deletions: 980, prs_opened: 6, prs_merged: 6, reviews_given: 12, score: 82 },
    { id: 3, github_login: "acdlite", avatar_url: "https://avatars.githubusercontent.com/u/3624098", commits_count: 28, additions: 950, deletions: 310, prs_opened: 5, prs_merged: 4, reviews_given: 18, score: 79 },
    { id: 4, github_login: "rickhanlonii", avatar_url: "https://avatars.githubusercontent.com/u/2440089", commits_count: 19, additions: 430, deletions: 120, prs_opened: 4, prs_merged: 3, reviews_given: 22, score: 71 },
    { id: 5, github_login: "gnoff", avatar_url: "https://avatars.githubusercontent.com/u/6885957", commits_count: 12, additions: 280, deletions: 90, prs_opened: 2, prs_merged: 1, reviews_given: 8, score: 45 },
  ],
  ai_report: `Общая оценка команды: 8/10

Команда демонстрирует высокую активность в период с 1 по 20 марта. Лидером по вкладу является gaearon (score 87): 42 коммита, 7 из 8 PR смёрджено, активное участие в code review.

sebmarkbage внёс наибольший объём изменений (+2100 строк). Рекомендуется убедиться, что изменения покрыты тестами.

gnoff показывает низкий score (45): мало коммитов, только 1 из 2 PR принят. Рекомендуется провести 1-on-1 и выяснить причины низкой активности.

В целом команда хорошо справляется с code review — среднее время рассмотрения PR составляет 1.5 дня. Рекомендуется поддерживать этот показатель.`,
};

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

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
        // Бэкенд недоступен — используем мок
        setAnalysis(MOCK_ANALYSIS);
        clearInterval(interval);
      }
    }

    fetchAnalysis();
    interval = setInterval(fetchAnalysis, 3000);
    return () => clearInterval(interval);
  }, [id]);

  if (!analysis || analysis.status === "pending" || analysis.status === "running") {
    return (
      <div>
        <Navbar />
        <div style={{ padding: "60px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>⟳</div>
          <h3>Анализ выполняется...</h3>
          <p style={{ color: "#888" }}>Собираем данные из GitHub API и генерируем AI-отчёт</p>
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
        </div>
      </div>
    );
  }

  const contributors = analysis.contributors ?? [];

  const commitsData = contributors.map((c) => ({ name: c.github_login, commits: c.commits_count }));
  const prData = contributors.map((c) => ({ name: c.github_login, opened: c.prs_opened, merged: c.prs_merged }));
  const reviewData = contributors.map((c) => ({ name: c.github_login, reviews: c.reviews_given }));
  const scoreData = contributors.map((c) => ({ name: c.github_login, score: Math.round(c.score) }));

  const totalCommits = contributors.reduce((s, c) => s + c.commits_count, 0);
  const totalPRs = contributors.reduce((s, c) => s + c.prs_opened, 0);
  const totalReviews = contributors.reduce((s, c) => s + c.reviews_given, 0);

  return (
    <div>
      <Navbar />
      <div style={{ padding: "24px 32px" }}>

        {/* Хлебные крошки */}
        <div style={{ fontSize: "13px", color: "#888", marginBottom: "16px" }}>
          <Link to="/dashboard" style={{ color: "#888" }}>Дашборд</Link>
          {" / "}
          <Link to={`/repositories/${analysis.repository_id}`} style={{ color: "#888" }}>Репозиторий</Link>
          {" / "}Анализ #{analysis.id}
        </div>

        {/* Заголовок */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ margin: 0 }}>Анализ #{analysis.id}</h2>
          <p style={{ color: "#888", fontSize: "13px", margin: "4px 0 0" }}>
            Период: {analysis.start_date} – {analysis.end_date} · {contributors.length} участников
          </p>
        </div>

        {/* Сводные метрики */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
          {[
            { label: "Всего коммитов", value: totalCommits },
            { label: "Pull Requests", value: totalPRs },
            { label: "Code Reviews", value: totalReviews },
            { label: "Участников", value: contributors.length },
          ].map((stat) => (
            <div key={stat.label} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px", textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: "bold" }}>{stat.value}</div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Таблица участников */}
        <h3 style={{ marginBottom: "12px" }}>Метрики по участникам</h3>
        <div style={{ overflowX: "auto", marginBottom: "24px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                {["#", "Участник", "Коммиты", "+Строк", "-Строк", "PR открыто", "PR смёрджено", "Reviews", "Score"].map((h) => (
                  <th key={h} style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contributors
                .sort((a, b) => b.score - a.score)
                .map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>{i + 1}</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {c.avatar_url && <img src={c.avatar_url} alt="" style={{ width: "24px", height: "24px", borderRadius: "50%" }} />}
                        {c.github_login}
                      </div>
                    </td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>{c.commits_count}</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0", color: "#16a34a" }}>+{c.additions}</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0", color: "#dc2626" }}>-{c.deletions}</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>{c.prs_opened}</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>{c.prs_merged}</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>{c.reviews_given}</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>
                      <strong style={{ color: c.score >= 70 ? "#16a34a" : c.score >= 40 ? "#ca8a04" : "#dc2626" }}>
                        {Math.round(c.score)}
                      </strong>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Графики */}
        <h3 style={{ marginBottom: "16px" }}>Графики</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>

          <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px" }}>
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

          <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px" }}>
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

          <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px" }}>
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

          <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px" }}>
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
