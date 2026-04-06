import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { labelLight, input, errorText, btnPrimary } from "../styles/common";

export default function RegisterPage() {
  const [name, setName] = useState("");
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
      await api.post("/api/v1/auth/register", { name, email, password });
      // После регистрации сразу логинимся
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
      setError(msg ?? "Ошибка регистрации. Проверьте данные и попробуйте снова.");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Левая панель — брендинг */}
      <div style={{ flex: 1, background: "#1a1a2e", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px" }}>
        <div style={{ fontSize: "32px", marginBottom: "16px" }}>📊</div>
        <h1 style={{ fontSize: "28px", marginBottom: "12px" }}>GitMetrics Analyser</h1>
        <p style={{ color: "#aaa", lineHeight: 1.7 }}>
          Создайте аккаунт и начните анализировать эффективность вашей команды.
        </p>
      </div>

      {/* Правая панель — форма */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px" }}>
        <h2 style={{ marginBottom: "8px" }}>Создать аккаунт</h2>
        <p style={{ color: "#888", marginBottom: "24px" }}>
          Уже есть аккаунт? <Link to="/login">Войти →</Link>
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "360px" }}>
          <div>
            <label style={labelLight}>Имя</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван Иванов"
              required
              style={input}
            />
          </div>
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
              placeholder="Минимум 8 символов"
              required
              minLength={8}
              style={input}
            />
          </div>
          {error && <p style={errorText}>{error}</p>}
          <button type="submit" disabled={loading} style={{ ...btnPrimary, padding: "10px", fontSize: "15px", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>
      </div>
    </div>
  );
}
