import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/client";

export default function NewRepositoryPage() {
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/api/v1/repositories", {
        owner,
        name,
        github_token: token,
      });
      navigate(`/repositories/${res.data.id}`);
    } catch {
      setError("Ошибка при добавлении репозитория. Проверьте данные.");
    }
  }

  return (
    <div>
      <Navbar />
      <div style={{ padding: "24px 32px", maxWidth: "560px" }}>
        <h2 style={{ marginBottom: "4px" }}>Добавить репозиторий</h2>
        <p style={{ color: "#888", fontSize: "14px", marginBottom: "24px" }}>
          Подключите GitHub-репозиторий для анализа метрик команды
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>Владелец (owner)</label>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="например: facebook"
              required
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" }}
            />
            <p style={{ fontSize: "12px", color: "#888", margin: "4px 0 0" }}>Имя пользователя или организации на GitHub</p>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>Название репозитория</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="например: react"
              required
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" }}
            />
            <p style={{ fontSize: "12px", color: "#888", margin: "4px 0 0" }}>Итоговый путь: {owner || "owner"}/{name || "repo"}</p>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>GitHub Personal Access Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_••••••••••••••••••••"
              required
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" }}
            />
            <p style={{ fontSize: "12px", color: "#888", margin: "4px 0 0" }}>
              Получить: GitHub → Settings → Developer settings → Personal access tokens
            </p>
          </div>

          {error && <p style={{ color: "red", fontSize: "14px" }}>{error}</p>}

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button type="button" onClick={() => navigate("/dashboard")} style={{ padding: "8px 16px", border: "1px solid #ccc", background: "#fff", borderRadius: "4px", cursor: "pointer" }}>
              Отмена
            </button>
            <button type="submit" style={{ padding: "8px 16px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
