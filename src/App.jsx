import { Routes, Route, Navigate } from "react-router-dom";
import UserLayout from "./pages/u/Layout.jsx";
import Dashboard from "./pages/u/Dashboard/index.jsx";
import Scanner from "./pages/u/Scanner/index.jsx";
import AllScans from "./pages/u/AllScans/index.jsx";
import Swap from "./pages/u/Swap/index.jsx";
import Diary from "./pages/u/Diary/index.jsx";
import Calendar from "./pages/u/Calendar/index.jsx";
import Insights from "./pages/u/Insights/index.jsx";
import History from "./pages/u/History/index.jsx";
import Profile from "./pages/u/Profile/index.jsx";
import Status from "./pages/u/Status/index.jsx";
import Workout from "./pages/u/Workout/index.jsx";
import Budget from "./pages/u/Budget/index.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/u" element={<UserLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="scanner" element={<Scanner />} />
        <Route path="all" element={<AllScans />} />
        <Route path="swap" element={<Swap />} />
        <Route path="diary" element={<Diary />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="insights" element={<Insights />} />
        <Route path="history" element={<History />} />
        <Route path="profile" element={<Profile />} />
        <Route path="status" element={<Status />} />
        <Route path="workout" element={<Workout />} />
        <Route path="budget" element={<Budget />} />
      </Route>
    </Routes>
  );
}
