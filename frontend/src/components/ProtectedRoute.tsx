import { Outlet } from "react-router-dom";

// TODO: включить защиту после подключения бэкенда
export default function ProtectedRoute() {
  return <Outlet />;
}
