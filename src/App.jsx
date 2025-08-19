import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AddBooking from "./pages/AddBooking";
import BookingRecords from "./pages/BookingRecords";
import AdminRegister from "./pages/AdminRegister";
import NotFound from "./pages/NotFound";
import AdminLayout from "./layouts/AdminLayout";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Navigate to="/" replace />} />

          {/* TEMPORARY Admin Registration - REMOVE IN PRODUCTION */}
          <Route path="/admin-register" element={<AdminRegister />} />

          {/* Redirect common paths to admin paths */}
          <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/add-booking" element={<Navigate to="/admin/add-booking" replace />} />
          <Route path="/bookings" element={<Navigate to="/admin/bookings" replace />} />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard key="dashboard" />} />
            <Route path="add-booking" element={<AddBooking key="add-booking" />} />
            <Route path="bookings" element={<BookingRecords key="bookings" />} />
          </Route>

          {/* Default redirect and 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
