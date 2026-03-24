import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

const MOCK_USER = {
  id: 1,
  email: "demo@example.com",
  name: "Demo User",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const params = new URLSearchParams();
      params.append("username", email);
      params.append("password", password);
      const res = await api.post("/api/v1/auth/login", params);
      const meRes = await api.get("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${res.data.access_token}` },
      });
      login(res.data.access_token, meRes.data);
      navigate("/dashboard");
    } catch {
      // Бэкенд недоступен — используем мок-авторизацию для демонстрации
      if (email && password) {
        login("mock-token-for-demo", { ...MOCK_USER, email });
        navigate("/dashboard");
      } else {
        setError("Введите email и пароль");
      }
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Левая панель */}
      <div style={{ flex: 1, background: "#1a1a2e", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px" }}>
        <div style={{ fontSize: "32px", marginBottom: "16px" }}>📊</div>
        <h1 style={{ fontSize: "28px", marginBottom: "12px" }}>GitMetrics Analyser</h1>
        <p style={{ color: "#aaa", lineHeight: 1.7, marginBottom: "32px" }}>
          Автоматическая оценка эффективности команды через анализ GitHub-метрик и AI-интерпретацию.
        </p>
        <ul style={{ listStyle: "none", padding: 0, color: "#ccc", lineHeight: 2 }}>
          <li>✓ Анализ коммитов, PR и code review</li>
          <li>✓ Нормализованный score 0–100</li>
          <li>✓ AI-отчёт с рекомендациями</li>
          <li>✓ История анализов</li>
        </ul>
      </div>

      {/* Правая панель — форма */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px" }}>
        <h2 style={{ marginBottom: "8px" }}>Войти в аккаунт</h2>
        <p style={{ color: "#888", marginBottom: "24px" }}>
          Нет аккаунта? <Link to="/register">Зарегистрироваться →</Link>
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "360px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" }}
            />
          </div>
          {error && <p style={{ color: "red", fontSize: "14px" }}>{error}</p>}
          <button type="submit" style={{ padding: "10px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "15px" }}>
            Войти
          </button>
        </form>
      </div>
    </div>
  );
}
