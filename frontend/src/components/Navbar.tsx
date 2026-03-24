import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav style={{ background: "#1a1a2e", color: "#fff", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Link to="/dashboard" style={{ color: "#fff", textDecoration: "none", fontWeight: "bold", fontSize: "16px" }}>
        📊 GitMetrics
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span style={{ fontSize: "14px", color: "#ccc" }}>{user?.email}</span>
        <button onClick={handleLogout} style={{ background: "transparent", border: "1px solid #ccc", color: "#ccc", padding: "6px 12px", cursor: "pointer", borderRadius: "4px" }}>
          Выйти
        </button>
      </div>
    </nav>
  );
}
