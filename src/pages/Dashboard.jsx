import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { analyticsAPI } from "../services/analytics";

export default function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalBookings: 0,
    todayRevenue: 0, // Changed from todayCheckIns
    totalRevenue: 0,
    activeBookings: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await analyticsAPI.getDashboardStats();

      if (response.success) {
        setStats(response.data.stats);
        setRecentBookings(response.data.recentCustomers || []); // Backend sends as recentCustomers for compatibility
      }
    } catch (error) {
      setError(error.message || "Failed to load dashboard data");
      console.error("Dashboard data fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Memoized calculations for better performance
  const formattedStats = useMemo(() => ({
    totalBookings: stats.totalBookings.toLocaleString(),
    todayRevenue: new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(stats.todayRevenue),
    totalRevenue: new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(stats.totalRevenue),
    activeBookings: stats.activeBookings.toLocaleString()
  }), [stats]);

  const statsCards = useMemo(() => [
    {
      title: "Total Bookings",
      value: formattedStats.totalBookings,
      icon: "📊",
      color: "blue",
      bgGradient: "from-blue-500 to-blue-600"
    },
    {
      title: "Today's Revenue",
      value: formattedStats.todayRevenue,
      icon: "�",
      color: "green",
      bgGradient: "from-green-500 to-green-600"
    },
    {
      title: "Total Revenue",
      value: formattedStats.totalRevenue,
      icon: "�",
      color: "yellow",
      bgGradient: "from-yellow-500 to-yellow-600"
    },
    {
      title: "Active Bookings",
      value: formattedStats.activeBookings,
      icon: "🏨",
      color: "purple",
      bgGradient: "from-purple-500 to-purple-600"
    }
  ], [formattedStats]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/80 via-white/90 to-purple-50/80 relative overflow-hidden">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-blue-300/20 to-purple-300/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-r from-purple-300/20 to-pink-300/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-gradient-to-r from-yellow-300/20 to-orange-300/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 p-6 space-y-6">
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Booking Management
              </h1>
              <p className="text-gray-600 mt-1">Manage hotel bookings and room reservations</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium">
                  {loading ? 'Refreshing...' : 'Refresh'}
                </span>
              </button>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-800">Hotel Manager</p>
                <p className="text-xs text-gray-600">Admin</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                HM
              </div>
            </div>
          </div>
        </div>

        {/* Key Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((card, index) => (
            <div key={card.title} className="bg-white/70 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/30 hover:transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className={`text-3xl font-bold text-${card.color}-600`}>
                    {loading ? "..." : card.value}
                  </p>
                </div>
                <div className={`w-12 h-12 bg-${card.color}-100 rounded-xl flex items-center justify-center text-2xl`}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Bookings Section */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/30">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Recent Bookings</h2>
            <button
              onClick={() => navigate('/admin/bookings')}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 text-sm font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : recentBookings.length > 0 ? (
              recentBookings.map((booking, index) => (
                <div key={booking.id || index} className="group relative bg-gradient-to-r from-white/60 to-white/40 rounded-xl p-4 hover:from-white/80 hover:to-white/60 transition-all duration-300 border border-white/20 hover:border-white/40 hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg ${booking.status === 'checked-in'
                        ? 'bg-gradient-to-r from-green-500 to-green-600'
                        : booking.status === 'checked-out'
                          ? 'bg-gradient-to-r from-gray-500 to-gray-600'
                          : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}>
                        {booking.customerName ? booking.customerName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'U'}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${booking.status === 'checked-in' ? 'bg-green-400' :
                          booking.status === 'checked-out' ? 'bg-gray-400' : 'bg-blue-400'
                          }`}></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-gray-800 text-lg">{booking.customerName || 'Unknown Customer'}</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${booking.status === 'checked-in'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : booking.status === 'checked-out'
                              ? 'bg-gray-100 text-gray-800 border border-gray-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${booking.status === 'checked-in' ? 'bg-green-500' :
                              booking.status === 'checked-out' ? 'bg-gray-500' : 'bg-blue-500'
                              }`}></div>
                            {booking.status?.replace('-', ' ') || 'pending'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-sm text-gray-600 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {booking.customerMobile || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Room {booking.room || 'TBD'}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="flex flex-col items-end">
                        <p className="text-2xl font-bold text-gray-900">
                          ₹{booking.rent?.toLocaleString() || 0}
                        </p>
                        <p className="text-xs text-gray-500">
                          {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          }) : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Hover effect indicator */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">No recent bookings found</p>
                <p className="text-gray-400 text-sm mt-1">New bookings will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
