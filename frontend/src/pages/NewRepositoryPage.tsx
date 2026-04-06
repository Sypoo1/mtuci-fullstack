import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/client";
import {
  pageWrapperNarrow,
  label,
  input,
  hint,
  errorText,
  btnPrimary,
  btnSecondary,
} from "../styles/common";

export default function NewRepositoryPage() {
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/v1/repositories", {
        owner,
        name,
        github_token: token,
      });
      navigate(`/repositories/${res.data.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Не удалось добавить репозиторий. Проверьте данные.");
      setLoading(false);
    }
  }

  return (
    <div>
      <Navbar />
      <div style={pageWrapperNarrow}>
        <h2 style={{ marginBottom: "4px" }}>Добавить репозиторий</h2>
        <p style={{ color: "#888", fontSize: "14px", marginBottom: "24px" }}>
          Подключите GitHub-репозиторий для анализа метрик команды
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={label}>Владелец (owner)</label>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="например: facebook"
              required
              style={input}
            />
            <p style={hint}>Имя пользователя или организации на GitHub</p>
          </div>

          <div>
            <label style={label}>Название репозитория</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="например: react"
              required
              style={input}
            />
            <p style={hint}>Итоговый путь: {owner || "owner"}/{name || "repo"}</p>
          </div>

          <div>
            <label style={label}>GitHub Personal Access Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_••••••••••••••••••••"
              required
              style={input}
            />
            <p style={hint}>
              Получить: GitHub → Settings → Developer settings → Personal access tokens
            </p>
          </div>

          {error && <p style={errorText}>{error}</p>}

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button type="button" onClick={() => navigate("/dashboard")} style={btnSecondary}>
              Отмена
            </button>
            <button type="submit" disabled={loading} style={btnPrimary}>
              {loading ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
