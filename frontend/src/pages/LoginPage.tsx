import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { labelLight, input, errorText, btnPrimary } from "../styles/common";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
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
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Неверный email или пароль");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
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

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px" }}>
        <h2 style={{ marginBottom: "8px" }}>Войти в аккаунт</h2>
        <p style={{ color: "#888", marginBottom: "24px" }}>
          Нет аккаунта? <Link to="/register">Зарегистрироваться →</Link>
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "360px" }}>
          <div>
            <label style={labelLight}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={input}
            />
          </div>
          <div>
            <label style={labelLight}>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={input}
            />
          </div>
          {error && <p style={errorText}>{error}</p>}
          <button type="submit" disabled={loading} style={{ ...btnPrimary, padding: "10px", fontSize: "15px", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
