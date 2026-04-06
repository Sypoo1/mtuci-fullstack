import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/client";
import type { Repository, Analysis } from "../types";
import {
  pageWrapper,
  card,
  cardDashed,
  table,
  tableHeadRow,
  th,
  td,
  btnPrimary,
  btnDangerSmall,
  sectionTitle,
  statusBadgeStyle,
  statusLabel,
} from "../styles/common";

export default function DashboardPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [reposError, setReposError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/api/v1/repositories")
      .then((r) => setRepos(r.data))
      .catch(() => setReposError("Не удалось загрузить репозитории"));

    api.get("/api/v1/analyses")
      .then((r) => setAnalyses(r.data))
      .catch(() => {});
  }, []);

  async function deleteRepo(id: number) {
    if (!confirm("Удалить репозиторий?")) return;
    await api.delete(`/api/v1/repositories/${id}`).catch(() => {});
    setRepos((prev) => prev.filter((r) => r.id !== id));
    setAnalyses((prev) => prev.filter((a) => a.repository_id !== id));
  }

  async function deleteAnalysis(id: number) {
    if (!confirm("Удалить этот анализ?")) return;
    await api.delete(`/api/v1/analyses/${id}`).catch(() => {});
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div>
      <Navbar />
      <div style={pageWrapper}>

        {/* Заголовок */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h2 style={{ margin: 0 }}>Мои репозитории</h2>
            <p style={{ color: "#888", margin: "4px 0 0", fontSize: "14px" }}>
              Список подключённых GitHub-репозиториев
            </p>
          </div>
          <button onClick={() => navigate("/repositories/new")} style={btnPrimary}>
            + Добавить репозиторий
          </button>
        </div>

        {reposError && (
          <p style={{ color: "#dc2626", fontSize: "14px", marginBottom: "16px" }}>{reposError}</p>
        )}

        {/* Карточки репозиториев */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          {repos.map((repo) => (
            <div key={repo.id} style={card}>
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                {repo.owner} / {repo.name}
              </div>
              <div style={{ fontSize: "13px", color: "#888", marginBottom: "12px" }}>
                Добавлен: {new Date(repo.created_at).toLocaleDateString("ru")}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Link
                  to={`/repositories/${repo.id}`}
                  style={{ flex: 1, textAlign: "center", padding: "6px", border: "1px solid #ddd", borderRadius: "4px", textDecoration: "none", color: "#333", fontSize: "13px" }}
                >
                  Открыть
                </Link>
                <button onClick={() => deleteRepo(repo.id)} style={btnDangerSmall}>
                  🗑
                </button>
              </div>
            </div>
          ))}

          <div onClick={() => navigate("/repositories/new")} style={cardDashed}>
            <div style={{ fontSize: "24px" }}>+</div>
            <div style={{ fontSize: "13px" }}>Добавить репозиторий</div>
          </div>
        </div>

        {/* Последние анализы */}
        <h3 style={sectionTitle}>Последние анализы</h3>
        {analyses.length === 0 ? (
          <p style={{ color: "#888", fontSize: "14px" }}>Анализов пока нет.</p>
        ) : (
          <table style={table}>
            <thead>
              <tr style={tableHeadRow}>
                <th style={th}>Репозиторий</th>
                <th style={th}>Период</th>
                <th style={th}>Статус</th>
                <th style={th}>Дата</th>
                <th style={th}></th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((a) => (
                <tr key={a.id}>
                  <td style={td}>
                    {repos.find((r) => r.id === a.repository_id)?.name ?? `#${a.repository_id}`}
                  </td>
                  <td style={td}>{a.start_date} – {a.end_date}</td>
                  <td style={td}>
                    <span style={statusBadgeStyle(a.status)}>{statusLabel(a.status)}</span>
                  </td>
                  <td style={td}>{new Date(a.created_at).toLocaleDateString("ru")}</td>
                  <td style={td}>
                    <Link to={`/analyses/${a.id}`} style={{ fontSize: "13px", color: "#1a1a2e" }}>
                      Открыть →
                    </Link>
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => deleteAnalysis(a.id)}
                      style={btnDangerSmall}
                      title="Удалить анализ"
                    >
                      🗑
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
