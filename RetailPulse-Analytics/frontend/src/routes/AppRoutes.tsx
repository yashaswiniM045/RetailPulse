import { Navigate, Route, Routes } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import DashboardHome from "../pages/dashboard/DashboardHome";
import ProfilePage from "../pages/profile/ProfilePage";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
	return (
		<Routes>
			<Route element={<AuthLayout />}>
				<Route path="/" element={<Navigate to="/login" replace />} />
				<Route path="/login" element={<Login />} />
				<Route path="/register" element={<Register />} />
				<Route path="/forgot-password" element={<ForgotPassword />} />
			</Route>

			<Route element={<ProtectedRoute />}>
				<Route element={<DashboardLayout />}>
					<Route path="/dashboard" element={<DashboardHome />} />
					<Route path="/profile" element={<ProfilePage />} />
				</Route>
			</Route>
		</Routes>
	);
}
