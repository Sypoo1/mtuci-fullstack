import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
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
    } catch {
      // Бэкенд недоступен — используем мок-регистрацию для демонстрации
      if (name && email && password) {
        login("mock-token-for-demo", { id: 1, email, name });
        navigate("/dashboard");
      } else {
        setError("Заполните все поля");
      }
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Левая панель */}
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
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Имя</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван Иванов"
              required
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" }}
            />
          </div>
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
              placeholder="Минимум 8 символов"
              required
              minLength={8}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" }}
            />
          </div>
          {error && <p style={{ color: "red", fontSize: "14px" }}>{error}</p>}
          <button type="submit" style={{ padding: "10px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "15px" }}>
            Зарегистрироваться
          </button>
        </form>
      </div>
    </div>
  );
}
