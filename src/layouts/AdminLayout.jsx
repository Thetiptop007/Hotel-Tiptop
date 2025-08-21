import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Sidebar from "../components/Sidebar";

export default function AdminLayout() {
  const location = useLocation();

  useEffect(() => {
    // Force scroll to top on route change
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Fixed Sidebar */}
      <div className="fixed left-0 top-0 h-screen w-64 z-10">
        <Sidebar />
      </div>

      {/* Main Content with margin to avoid overlap */}
      <main className="flex-1 ml-72 overflow-y-auto">
        {/* Force re-render with location key */}
        <div key={location.pathname}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
