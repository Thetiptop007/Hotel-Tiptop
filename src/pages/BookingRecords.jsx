import { useState, useEffect, useCallback, useMemo } from "react";
import { bookingAPI } from "../services/booking";
import { useAuth } from "../context/AuthContext";

export default function BookingRecords() {
  const { isAuthenticated, token, user } = useAuth();

  // Debug log
  useEffect(() => {
    console.log("BookingRecords component rendered");

    // Cleanup function to ensure navigation isn't blocked
    return () => {
      console.log("BookingRecords component unmounting");
      // Clear any pending timeouts or intervals
      setLoading(false);
      setIsSearching(false);
    };
  }, []);

  // Enhanced state management for large datasets
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("checkIn");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Performance states
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchTime, setLastSearchTime] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [deletingBooking, setDeletingBooking] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [checkingOutBooking, setCheckingOutBooking] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [editFormData, setEditFormData] = useState({
    customerName: '',
    customerMobile: '',
    customerAadhaar: '',
    checkIn: '',
    checkOut: '',
    rent: '',
    room: '',
    status: ''
  });

  // Debug authentication state
  useEffect(() => {
    console.log("BookingRecords - Auth State:", {
      isAuthenticated,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 50) + "..." : null,
      user: user?.username
    });
  }, [isAuthenticated, token, user]);

  // Fetch bookings from API with performance optimizations
  const fetchBookings = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setIsSearching(true);
      }
      setError("");

      console.log("BookingRecords - Starting fetch with auth:", {
        isAuthenticated,
        hasToken: !!token,
        tokenFromStorage: !!localStorage.getItem('token')
      });

      // Build query parameters - optimized for large datasets
      const params = {
        page: currentPage,
        limit: 20, // Increased page size for better performance
        search: searchTerm.trim(),
        sortBy: sortBy
      };

      // Only add status if it's not 'all'
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      // Add date range filters if specified
      if (dateRange.start) {
        params.startDate = dateRange.start;
      }
      if (dateRange.end) {
        params.endDate = dateRange.end;
      }

      console.log("BookingRecords - Fetching with params:", params);

      const response = await bookingAPI.getBookings(params);

      console.log("BookingRecords - API Response:", {
        success: response.success,
        bookingsCount: response.data?.bookings?.length || 0,
        totalCount: response.data?.totalCount || 0,
        fullResponse: response
      });

      if (response.success) {
        setBookings(response.data.bookings || []);
        setTotalCount(response.data.totalCount || response.data.pagination?.total || 0);
      } else {
        console.error("BookingRecords - API failed:", response);
        setError("Failed to fetch bookings");
      }
    } catch (error) {
      console.error("BookingRecords - Error fetching bookings:", error);
      setError(error.message || "Failed to load booking data");
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, [currentPage, searchTerm, filterStatus, sortBy, isAuthenticated, token, dateRange.start, dateRange.end]);  // Load bookings on component mount and when filters change (except search)
  // Consolidated useEffect for initial load and basic filters
  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings(true);
    }
  }, [isAuthenticated, currentPage, filterStatus, sortBy, fetchBookings]);

  // Debounced search effect only
  useEffect(() => {
    if (!isAuthenticated) return;

    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      if (searchTerm && currentPage !== 1) {
        setCurrentPage(1);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, isAuthenticated, currentPage]);

  // Fetch data when search term or date range changes
  useEffect(() => {
    if (!isAuthenticated || debouncedSearchTerm !== searchTerm) return;

    fetchBookings(false);
  }, [debouncedSearchTerm, dateRange.start, dateRange.end, isAuthenticated, fetchBookings]);

  // Memoized calculations
  const itemsPerPage = 20; // Increased for better performance with large datasets
  const totalPages = useMemo(() => Math.ceil(totalCount / itemsPerPage), [totalCount]);

  const handleEdit = useCallback((booking) => {
    setEditingBooking(booking);
    setEditFormData({
      customerName: booking.customerName || booking.customer?.name || '',
      customerMobile: booking.customerMobile || booking.customer?.mobile || '',
      customerAadhaar: booking.customerAadhaar || booking.customer?.aadhaar || '',
      checkIn: booking.checkIn ? new Date(booking.checkIn).toISOString().split('T')[0] : '',
      checkOut: booking.checkOut ? new Date(booking.checkOut).toISOString().split('T')[0] : '',
      rent: booking.rent || 0,
      room: booking.room || '',
      status: booking.status || 'checked-in'
    });
    setShowEditModal(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    try {
      const response = await bookingAPI.updateBooking(editingBooking._id, editFormData);

      if (response.success) {
        // Refresh the booking list without showing full loader
        fetchBookings(false);
        setShowEditModal(false);
        setEditingBooking(null);
        alert(`Booking for ${editFormData.customerName} has been updated successfully!`);
      } else {
        alert('Failed to update booking record');
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Error updating booking record: ' + error.message);
    }
  }, [editingBooking, editFormData, fetchBookings]);

  const handleDelete = useCallback((booking) => {
    setDeletingBooking(booking);
    setShowDeleteModal(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingBooking) return;

    setIsDeleting(true);
    try {
      const response = await bookingAPI.deleteBooking(deletingBooking._id);

      if (response.success) {
        // Remove the booking from the local state instead of full refresh
        setBookings(prevBookings => prevBookings.filter(b => b._id !== deletingBooking._id));
        setTotalCount(prevCount => prevCount - 1);

        // Close the modal
        setShowDeleteModal(false);
        setDeletingBooking(null);

        // Show success message (you can replace this with a toast notification)
        const customerName = deletingBooking.customerName || deletingBooking.customer?.name || 'Customer';
        alert(`Booking for ${customerName} has been deleted successfully.`);
      } else {
        alert('Failed to delete booking record');
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Error deleting booking record: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  }, [deletingBooking]);

  const handleCheckout = useCallback(async (booking) => {
    setCheckingOutBooking(booking._id);
    try {
      const checkoutDate = new Date().toISOString().split('T')[0]; // Today's date
      const checkoutData = {
        ...booking,
        checkOut: checkoutDate,
        status: 'checked-out'
      };

      const response = await bookingAPI.updateBooking(booking._id, checkoutData);

      if (response.success) {
        // Update the booking in local state for better performance
        setBookings(prevBookings =>
          prevBookings.map(b =>
            b._id === booking._id
              ? { ...b, checkOut: checkoutDate, status: 'checked-out' }
              : b
          )
        );
      } else {
        alert('Failed to checkout customer');
      }
    } catch (error) {
      console.error('Error checking out customer:', error);
      alert('Error checking out customer: ' + error.message);
    } finally {
      setCheckingOutBooking(null);
    }
  }, []);

  const handleViewDetails = useCallback((booking) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  }, []);

  // Pagination handlers with optimization
  const handlePageChange = useCallback((newPage) => {
    if (newPage !== currentPage && newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  }, [currentPage, totalPages]);

  // Form input handlers for better performance
  const handleEditFormChange = useCallback((field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/80 via-white/90 to-purple-50/80 relative overflow-hidden">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-blue-300/20 to-purple-300/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-r from-purple-300/20 to-pink-300/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-gradient-to-r from-yellow-300/20 to-orange-300/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 p-6">
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Booking Records
              </h1>
              <p className="text-gray-600 mt-1">Manage and view all hotel bookings</p>
            </div>
          </div>
        </div>

        {/* Search and Filter Section - Enhanced for Large Datasets */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/30 mb-6">
          {/* Primary Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Search
                {isSearching && (
                  <span className="text-blue-500 text-xs ml-2">Searching...</span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Customer name, mobile, room, serial no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 pl-10 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  {isSearching ? (
                    <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
              >
                <option value="all">All Status</option>
                <option value="checked-in">Checked In</option>
                <option value="checked-out">Checked Out</option>
              </select>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
              >
                <option value="checkIn">Latest Check-in</option>
                <option value="customerName">Customer Name (A-Z)</option>
                <option value="rent">Highest Rent</option>
                <option value="room">Room Number</option>
                <option value="status">Status</option>
              </select>
            </div>

            {/* Results Info */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Results</label>
              <div className="flex items-center justify-center h-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-gray-200">
                <span className="text-sm font-medium text-gray-700">
                  {totalCount.toLocaleString()} booking{totalCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Date Range and Advanced Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            {/* Date From */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Check-in From</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Check-in To</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
              />
            </div>

            {/* Clear Filters */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Actions</label>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setSortBy('checkIn');
                  setDateRange({ start: '', end: '' });
                  setCurrentPage(1);
                }}
                className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-4 rounded-xl font-medium hover:from-gray-600 hover:to-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-500/30 transition-all duration-300 transform hover:scale-105"
              >
                Clear Filters
              </button>
            </div>

            {/* Export Button */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Export</label>
              <button className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-xl font-medium hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-4 focus:ring-green-500/30 transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Export CSV
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Customer Table */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 overflow-hidden">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-600 font-medium">Loading bookings...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 m-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-700 font-medium">Error: {error}</span>
              </div>
              <button
                onClick={fetchBookings}
                className="mt-2 text-red-600 hover:text-red-500 font-medium"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && bookings.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding a new booking.'}
              </p>
            </div>
          )}

          {/* Table Content */}
          {!loading && !error && bookings.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Booking ID</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Room</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Rent</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Check-in</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Check-out</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {bookings.map((booking, index) => (
                    <tr key={booking._id} className="hover:bg-white/50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{booking.serialNo || booking._id.slice(-6)}</div>
                        <div className="text-sm text-gray-500">{booking.entryNo || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {(booking.customerName || booking.customer?.name || 'U').charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{booking.customerName || booking.customer?.name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{booking.customerMobile || booking.customer?.mobile || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{booking.room || 'TBD'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg text-green-600 font-semibold">
                          ₹{booking.rent || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.checkOut ? (
                          new Date(booking.checkOut).toLocaleDateString()
                        ) : booking.status === 'checked-in' ? (
                          <button
                            onClick={() => handleCheckout(booking)}
                            disabled={checkingOutBooking === booking._id}
                            className="bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-lg font-medium hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-4 focus:ring-green-500/30 transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none text-sm"
                          >
                            {checkingOutBooking === booking._id ? (
                              <div className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Checkout
                              </div>
                            )}
                          </button>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${booking.status === 'checked-in'
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'checked-out'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {booking.status || 'checked-in'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewDetails(booking)}
                            className="text-indigo-600 hover:text-indigo-500 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors duration-200"
                            title="View Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEdit(booking)}
                            className="text-blue-600 hover:text-blue-500 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors duration-200"
                            title="Edit Booking"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(booking)}
                            className="text-red-600 hover:text-red-500 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors duration-200"
                            title="Delete Booking"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination - Only show if we have data */}
          {!loading && !error && bookings.length > 0 && (
            <div className="bg-white/50 px-6 py-4 border-t border-gray-200/50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} bookings
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    Previous
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-3 py-2 rounded-lg border transition-colors duration-200 ${currentPage === i + 1
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Booking Modal */}
      {showEditModal && editingBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Edit Booking - {editFormData.customerName}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Row 1 - Customer Name & Mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Customer Name</label>
                  <input
                    type="text"
                    value={editFormData.customerName}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Mobile Number</label>
                  <input
                    type="tel"
                    value={editFormData.customerMobile}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, customerMobile: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
                  />
                </div>
              </div>

              {/* Row 2 - Aadhaar & Room */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Aadhaar Number</label>
                  <input
                    type="text"
                    value={editFormData.customerAadhaar}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, customerAadhaar: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Room Number</label>
                  <input
                    type="text"
                    value={editFormData.room}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, room: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
                  />
                </div>
              </div>

              {/* Row 3 - Check-in & Check-out */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Check-in Date</label>
                  <input
                    type="date"
                    value={editFormData.checkIn}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, checkIn: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Check-out Date</label>
                  <input
                    type="date"
                    value={editFormData.checkOut}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, checkOut: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
                  />
                </div>
              </div>

              {/* Row 4 - Rent & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Room Rent</label>
                  <input
                    type="number"
                    value={editFormData.rent}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, rent: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
                  >
                    <option value="checked-in">Checked In</option>
                    <option value="checked-out">Checked Out</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all duration-300 transform hover:scale-105"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {showBookingDetails && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/30 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Booking Details</h3>
              <button
                onClick={() => setShowBookingDetails(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  {(selectedBooking.customerName || selectedBooking.customer?.name || 'U').charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{selectedBooking.customerName || selectedBooking.customer?.name || 'Unknown'}</div>
                  <div className="text-sm text-gray-600">{selectedBooking.customerMobile || selectedBooking.customer?.mobile || 'N/A'}</div>
                </div>
              </div>

              {/* Booking Details */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Booking ID</div>
                    <div className="font-mono font-bold text-gray-900">{selectedBooking.serialNo || selectedBooking._id.slice(-6)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Entry No</div>
                    <div className="font-mono font-bold text-gray-900">{selectedBooking.entryNo || 'N/A'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Room Number</div>
                    <div className="text-lg font-bold text-gray-900">{selectedBooking.room || 'TBD'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Rent</div>
                    <div className="text-lg font-bold text-green-600">₹{selectedBooking.rent || 0}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Check-in Date</div>
                    <div className="font-medium text-gray-900">
                      {selectedBooking.checkIn ? new Date(selectedBooking.checkIn).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Check-out Date</div>
                    <div className="font-medium text-gray-900">
                      {selectedBooking.checkOut ? new Date(selectedBooking.checkOut).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-1">Status</div>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${selectedBooking.status === 'checked-in'
                    ? 'bg-green-100 text-green-800'
                    : selectedBooking.status === 'checked-out'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {selectedBooking.status || 'checked-in'}
                  </span>
                </div>

                {selectedBooking.customerAadhaar && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Aadhaar Number</div>
                    <div className="font-mono font-medium text-gray-900">{selectedBooking.customerAadhaar}</div>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500 text-center">
                This booking information is confidential and should be handled securely.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/30 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Delete Booking</h3>
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingBooking(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                disabled={isDeleting}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-700 font-medium">Warning: This action cannot be undone!</span>
                </div>
              </div>

              <div className="text-gray-700">
                <p className="mb-3">
                  Are you sure you want to delete the booking for{' '}
                  <span className="font-semibold text-gray-900">
                    {deletingBooking.customerName || deletingBooking.customer?.name || 'this customer'}
                  </span>?
                </p>

                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-600">Booking ID:</span>
                      <div className="font-mono font-medium">{deletingBooking.serialNo || deletingBooking._id.slice(-6)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Room:</span>
                      <div className="font-medium">{deletingBooking.room || 'TBD'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Check-in:</span>
                      <div className="font-medium">
                        {deletingBooking.checkIn ? new Date(deletingBooking.checkIn).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Rent:</span>
                      <div className="font-medium text-green-600">₹{deletingBooking.rent || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingBooking(null);
                }}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-6 rounded-xl font-medium hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/30 transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isDeleting ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </div>
                ) : (
                  'Delete Booking'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
