import { useState, useEffect, useCallback, useMemo } from "react";
import { bookingAPI } from "../services/booking";
import { useAuth } from "../context/AuthContext";

// Helper function to get current date in local timezone
const getCurrentLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function BookingRecords() {
  const { isAuthenticated, token, user } = useAuth();

  // Cleanup function to ensure navigation isn't blocked
  useEffect(() => {
    return () => {
      // Clear any pending timeouts or intervals
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
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
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [allBookingsLoaded, setAllBookingsLoaded] = useState(false);
  const [useServerSearch, setUseServerSearch] = useState(false);
  const [bookingsCache, setBookingsCache] = useState(new Map());
  const [lastFetchParams, setLastFetchParams] = useState(null);
  const [dataLoadedAt, setDataLoadedAt] = useState(null);
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

  // Fetch bookings from API with intelligent caching and minimal server load
  const fetchBookings = useCallback(async (showLoader = true, forceServerSearch = false, forceRefresh = false) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setIsSearching(true);
      }
      setError("");

      // Create cache key for this request
      const cacheKey = JSON.stringify({
        page: currentPage,
        filterStatus,
        sortBy,
        dateStart: dateRange.start,
        dateEnd: dateRange.end,
        search: forceServerSearch ? searchTerm.trim() : ''
      });

      // Check cache first (only use cache if data is less than 5 minutes old and not forced refresh)
      const cachedData = bookingsCache.get(cacheKey);
      const now = Date.now();
      const cacheExpiry = 5 * 60 * 1000; // 5 minutes

      if (cachedData && !forceRefresh && (now - cachedData.timestamp) < cacheExpiry) {
        setBookings(cachedData.bookings);
        setTotalCount(cachedData.totalCount);
        setLoading(false);
        setIsSearching(false);
        return;
      }

      // Check if we can avoid this API call by using existing data
      const currentParams = {
        page: currentPage,
        filterStatus,
        sortBy,
        dateStart: dateRange.start,
        dateEnd: dateRange.end,
        search: forceServerSearch ? searchTerm.trim() : ''
      };

      // If params haven't changed and we have recent data, skip API call
      if (!forceRefresh && lastFetchParams &&
        JSON.stringify(currentParams) === JSON.stringify(lastFetchParams) &&
        dataLoadedAt && (now - dataLoadedAt) < 30000) { // 30 seconds
        setLoading(false);
        setIsSearching(false);
        return;
      }

      // Determine search strategy based on dataset size and search requirements
      const shouldUseServerSearch = forceServerSearch || useServerSearch || searchTerm.trim().length > 0;

      // Build query parameters with minimal data transfer
      const params = {
        page: shouldUseServerSearch && searchTerm.trim() ? 1 : currentPage,
        limit: shouldUseServerSearch && searchTerm.trim() ? 300 : 50, // Reduced limits for less server load
        sortBy: sortBy,
        // Only include necessary fields to reduce data transfer
        fields: 'customerName,customerMobile,customerAadhaar,room,rent,checkIn,checkOut,status,serialNo,entryNo,documents,documentTypes,documentPublicIds,groupSize,additionalGuests,_id,createdAt'
      };

      // Add search parameter if we're using server search
      if (shouldUseServerSearch && searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

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

      const response = await bookingAPI.getBookings(params);

      if (response.success) {
        const newBookings = response.data.bookings || [];
        const newTotalCount = response.data.totalCount || response.data.pagination?.total || 0;

        setBookings(newBookings);
        setTotalCount(newTotalCount);
        setLastFetchParams(currentParams);
        setDataLoadedAt(now);

        // Cache the results (limit cache size to prevent memory issues)
        setBookingsCache(prev => {
          const newCache = new Map(prev);
          if (newCache.size > 20) {
            const firstKey = newCache.keys().next().value;
            newCache.delete(firstKey);
          }
          newCache.set(cacheKey, {
            bookings: newBookings,
            totalCount: newTotalCount,
            timestamp: now
          });
          return newCache;
        });

        // Increased threshold to 500 to allow more client-side operations
        if (newTotalCount > 500 && !useServerSearch) {
          setUseServerSearch(true);
        }

        // Track if we have loaded all bookings (for client-side search)
        setAllBookingsLoaded(!searchTerm.trim() && newBookings.length >= newTotalCount);

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
  }, [currentPage, searchTerm, filterStatus, sortBy, isAuthenticated, token, dateRange.start, dateRange.end, useServerSearch, bookingsCache, lastFetchParams, dataLoadedAt]);  // Load bookings on component mount and when filters change
  // Initial load effect
  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings(true);
    }
  }, [isAuthenticated, filterStatus, sortBy, dateRange.start, dateRange.end]);

  // Optimized search with proper debouncing (like Flipkart)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Clear existing timeout to prevent multiple API calls
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // If no search term, handle separately
    if (!searchTerm.trim()) {
      setIsSearching(false);

      // Reset to first page if needed
      if (currentPage !== 1) {
        setCurrentPage(1);
      }

      // Only reload if we don't have recent data (avoid unnecessary calls)
      const timeout = setTimeout(() => {
        const now = Date.now();
        if (!dataLoadedAt || (now - dataLoadedAt) > 60000) { // 1 minute threshold
          fetchBookings(false);
        }
      }, 200); // Quick timeout for clearing search

      setSearchTimeout(timeout);
      return;
    }

    // For search terms - implement Flipkart-style search with longer delay
    // Show searching indicator immediately for better UX
    setIsSearching(true);

    // Debounced search with optimal delay (1.2 seconds like Flipkart)
    const timeout = setTimeout(() => {
      // Reset to first page for new search
      if (currentPage !== 1) {
        setCurrentPage(1);
      }

      // Choose optimal search strategy
      if (totalCount <= 500 && allBookingsLoaded && !useServerSearch) {
        setIsSearching(false); // Client-side is instant
      } else {
        fetchBookings(false, true); // Server search
      }
    }, 1200); // 1.2 second delay like modern e-commerce sites

    setSearchTimeout(timeout);

    // Cleanup function to prevent memory leaks
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [searchTerm, isAuthenticated, fetchBookings, totalCount, allBookingsLoaded, useServerSearch, currentPage, dataLoadedAt]);  // Separate effect for pagination (only when not searching)
  useEffect(() => {
    if (!isAuthenticated || currentPage === 1 || searchTerm.trim()) return;
    fetchBookings(false);
  }, [currentPage, isAuthenticated, fetchBookings, searchTerm]);

  // Memoized calculations
  const itemsPerPage = 100; // Increased for admin interface
  const totalPages = useMemo(() => Math.ceil(totalCount / itemsPerPage), [totalCount]);

  // Memoized filtered bookings with intelligent search strategy
  const filteredBookings = useMemo(() => {
    // If we're using server search or have search results from server, return as-is
    if (useServerSearch && searchTerm.trim()) {
      return bookings;
    }

    // Otherwise, use client-side filtering for small datasets
    if (!searchTerm.trim()) {
      return bookings;
    }

    // Optimized client-side search 
    const searchLower = searchTerm.toLowerCase().trim();

    const filtered = bookings.filter(booking => {
      // Customer name - optimized matching
      const customerName = (booking.customerName || booking.customer?.name || '').toLowerCase();
      if (customerName.includes(searchLower)) return true;

      // Search in additional guest names
      if (booking.additionalGuests && booking.additionalGuests.length > 0) {
        for (const guest of booking.additionalGuests) {
          const guestName = (guest.name || '').toLowerCase();
          const guestMobile = (guest.mobile || '').toLowerCase();
          if (guestName.includes(searchLower) || guestMobile.includes(searchLower)) {
            return true;
          }
        }
      }

      // Check individual words for partial matching
      const customerNameWords = customerName.split(/\s+/);
      if (customerNameWords.some(word => word.startsWith(searchLower))) return true;

      // Other fields - quick includes check
      const customerMobile = (booking.customerMobile || booking.customer?.mobile || '').toLowerCase();
      const customerAadhaar = (booking.customerAadhaar || booking.customer?.aadhaar || '').toLowerCase();
      const room = (booking.room || '').toLowerCase();
      const serialNo = (booking.serialNo || booking._id || '').toLowerCase();
      const entryNo = (booking.entryNo || '').toLowerCase();

      return customerMobile.includes(searchLower) ||
        customerAadhaar.includes(searchLower) ||
        room.includes(searchLower) ||
        serialNo.includes(searchLower) ||
        entryNo.includes(searchLower);
    });

    return filtered;
  }, [bookings, searchTerm, useServerSearch, allBookingsLoaded]);

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
        // Update local state immediately for better UX
        setBookings(prevBookings =>
          prevBookings.map(booking =>
            booking._id === editingBooking._id
              ? { ...booking, ...editFormData }
              : booking
          )
        );
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
  }, [editingBooking, editFormData]);

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
        // Close the modal first
        setShowDeleteModal(false);
        setDeletingBooking(null);
        
        // Refresh the bookings list from server to ensure UI is in sync with database
        await fetchBookings(false, false, true); // forceRefresh = true
      } else {
        console.error('Failed to delete booking record');
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [deletingBooking, fetchBookings]);

  const handleCheckout = useCallback(async (booking) => {
    setCheckingOutBooking(booking._id);
    try {
      const checkoutDate = getCurrentLocalDate(); // Today's date in local timezone
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                  placeholder="Search by name, mobile, room, booking ID... (e.g., 'nai' finds 'Naitik Kumar')"
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
          </div>

          {/* Date Range and Advanced Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
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
                  // Clear cache to ensure fresh data
                  setBookingsCache(new Map());
                  fetchBookings(true, false, true);
                }}
                className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-4 rounded-xl font-medium hover:from-gray-600 hover:to-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-500/30 transition-all duration-300 transform hover:scale-105"
              >
                Clear & Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Customer Table */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 overflow-hidden min-h-[600px]">
          {/* Fixed height container to prevent shifting */}
          <div className="h-full flex flex-col">
            {/* Loading State */}
            {loading && (
              <div className="flex-1 flex items-center justify-center py-12">
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
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-w-md w-full">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-700 font-medium">Error: {error}</span>
                  </div>
                  <button
                    onClick={() => fetchBookings(true)}
                    className="mt-2 text-red-600 hover:text-red-500 font-medium"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredBookings.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-center py-12">
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? `No results found for "${searchTerm}". Try different keywords.` : 'Get started by adding a new booking.'}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="mt-3 text-blue-600 hover:text-blue-500 font-medium text-sm"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Table Content */}
            {!loading && !error && filteredBookings.length > 0 && (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 sticky top-0">
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
                      {filteredBookings.map((booking, index) => (
                        <tr key={booking._id} className="hover:bg-white/50 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{booking.serialNo || booking._id.slice(-6)}</div>
                            <div className="text-sm text-gray-500">{booking.entryNo || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold relative">
                                {(booking.customerName || booking.customer?.name || 'U').charAt(0)}
                                {booking.groupSize > 1 && (
                                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white">
                                    {booking.groupSize}
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{booking.customerName || booking.customer?.name || 'Unknown'}</div>
                                <div className="text-sm text-gray-500">{booking.customerMobile || booking.customer?.mobile || 'N/A'}</div>
                                {booking.groupSize > 1 && (
                                  <div className="text-xs text-green-600 font-medium mt-1 flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Group of {booking.groupSize}
                                  </div>
                                )}
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

                {/* Pagination - Only show if we have more than 100 records and no search */}
                {!searchTerm && totalCount > 100 && (
                  <div className="bg-white/50 px-6 py-4 border-t border-gray-200/50 flex-shrink-0">
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

                        {/* Show page numbers only if reasonable number of pages */}
                        {totalPages <= 10 ? (
                          [...Array(totalPages)].map((_, i) => (
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
                          ))
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">
                              Page {currentPage} of {totalPages}
                            </span>
                          </div>
                        )}

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
            )}
          </div>
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
                  {!editFormData.checkOut || editFormData.status === 'checked-in' ? (
                    <button
                      type="button"
                      onClick={() => {
                        const today = getCurrentLocalDate();
                        setEditFormData(prev => ({
                          ...prev,
                          checkOut: today,
                          status: 'checked-out'
                        }));
                      }}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-xl font-medium hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-4 focus:ring-green-500/30 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Checkout Today</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-medium">
                        Checked out: {new Date(editFormData.checkOut).toLocaleDateString()}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditFormData(prev => ({
                            ...prev,
                            checkOut: '',
                            status: 'checked-in'
                          }));
                        }}
                        className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                      >
                        Clear checkout & mark as checked-in
                      </button>
                    </div>
                  )}
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
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold relative">
                  {(selectedBooking.customerName || selectedBooking.customer?.name || 'U').charAt(0)}
                  {selectedBooking.groupSize > 1 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white">
                      {selectedBooking.groupSize}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="font-semibold text-gray-900">{selectedBooking.customerName || selectedBooking.customer?.name || 'Unknown'}</div>
                    {selectedBooking.groupSize > 1 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Group Leader
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">{selectedBooking.customerMobile || selectedBooking.customer?.mobile || 'N/A'}</div>
                  {selectedBooking.groupSize > 1 && (
                    <div className="text-sm text-blue-600 font-medium mt-1">
                      Total Members: {selectedBooking.groupSize} ({selectedBooking.additionalGuests?.length || 0} additional guests)
                    </div>
                  )}
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
                      {selectedBooking.checkOut ? (
                        new Date(selectedBooking.checkOut).toLocaleDateString()
                      ) : (
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            Currently Staying
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-1">Booking Status</div>
                  <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${selectedBooking.status === 'checked-in'
                    ? 'bg-green-100 text-green-800'
                    : selectedBooking.status === 'checked-out'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {selectedBooking.status === 'checked-in' && (
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {selectedBooking.status === 'checked-out' && (
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {selectedBooking.status === 'checked-in' ? 'Guest Currently Staying' :
                      selectedBooking.status === 'checked-out' ? 'Completed Stay' :
                        selectedBooking.status || 'Active Booking'}
                  </span>
                </div>

                {selectedBooking.customerAadhaar && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Aadhaar Number</div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-gray-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm12 2H4v8h12V6z" clipRule="evenodd" />
                      </svg>
                      <span className="font-mono font-medium text-gray-900 bg-gray-50 px-2 py-1 rounded">
                        {selectedBooking.customerAadhaar}
                      </span>
                    </div>
                  </div>
                )}

                {/* Group Booking Summary */}
                {selectedBooking.groupSize > 1 && (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">Group Booking</div>
                          <div className="text-sm text-gray-600">Total {selectedBooking.groupSize} members staying together</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">{selectedBooking.groupSize}</div>
                        <div className="text-xs text-gray-500">Total Members</div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white/60 rounded-lg p-2 text-center">
                        <div className="font-medium text-gray-900">1</div>
                        <div className="text-xs text-gray-600">Primary Guest</div>
                      </div>
                      <div className="bg-white/60 rounded-lg p-2 text-center">
                        <div className="font-medium text-gray-900">{selectedBooking.additionalGuests?.length || 0}</div>
                        <div className="text-xs text-gray-600">Additional Guests</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Group Members Section */}
                {selectedBooking.additionalGuests && selectedBooking.additionalGuests.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="text-sm text-gray-600 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Additional Group Members ({selectedBooking.additionalGuests.length})
                    </div>
                    <div className="space-y-3">
                      {selectedBooking.additionalGuests.map((guest, index) => (
                        <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {guest.name ? guest.name.charAt(0).toUpperCase() : `G${index + 1}`}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{guest.name || 'Guest ' + (index + 1)}</div>
                                <div className="text-sm text-gray-500">{guest.mobile || 'No mobile provided'}</div>
                                {guest.aadhaar && (
                                  <div className="text-xs text-gray-600 font-mono mt-1">{guest.aadhaar}</div>
                                )}

                                {/* Guest Documents */}
                                {guest.documents && guest.documents.length > 0 && (
                                  <div className="mt-3">
                                    <div className="text-xs text-gray-600 mb-2 flex items-center">
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      Documents ({guest.documents.length})
                                    </div>
                                    <div className="flex space-x-2">
                                      {guest.documents.map((docUrl, docIndex) => {
                                        const docType = guest.documentTypes ? guest.documentTypes[docIndex] : 'document';
                                        const isAadhaarFront = docType === 'aadhaar-front';
                                        const isAadhaarBack = docType === 'aadhaar-back';

                                        return (
                                          <a
                                            key={docIndex}
                                            href={docUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors duration-200"
                                          >
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            {isAadhaarFront ? 'Front' : isAadhaarBack ? 'Back' : `Doc ${docIndex + 1}`}
                                          </a>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {guest.relationship || 'Guest'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents Section */}
                {selectedBooking.documents && selectedBooking.documents.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-600 mb-3">Aadhaar Documents</div>

                    {/* Check if we have both front and back documents */}
                    {selectedBooking.documentTypes &&
                      selectedBooking.documentTypes.includes('aadhaar-front') &&
                      selectedBooking.documentTypes.includes('aadhaar-back') ? (
                      // Display side by side for front and back
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedBooking.documents.map((documentUrl, index) => {
                          const documentType = selectedBooking.documentTypes[index];
                          const isImage = documentUrl.match(/\.(jpg|jpeg|png|gif)$/i);
                          const isFront = documentType === 'aadhaar-front';
                          const isBack = documentType === 'aadhaar-back';

                          return (
                            <div key={index} className={`${isFront ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <svg className={`w-5 h-5 ${isFront ? 'text-blue-600' : 'text-green-600'} mr-2`} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                  </svg>
                                  <span className={`text-sm font-medium ${isFront ? 'text-blue-700' : 'text-green-700'}`}>
                                    {isFront ? 'Aadhaar Front' : 'Aadhaar Back'}
                                  </span>
                                </div>
                                <button
                                  onClick={() => window.open(documentUrl, '_blank')}
                                  className={`${isFront ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200`}
                                >
                                  View Full Size
                                </button>
                              </div>

                              {/* Image Preview */}
                              {isImage ? (
                                <div className="relative bg-white rounded-lg border border-gray-200 overflow-hidden">
                                  <img
                                    src={documentUrl}
                                    alt={`Aadhaar ${isFront ? 'front' : 'back'} side`}
                                    className="w-full h-48 object-contain bg-gray-50"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                  <div
                                    className="w-full h-48 bg-gray-100 items-center justify-center text-gray-500"
                                    style={{ display: 'none' }}
                                  >
                                    <div className="text-center">
                                      <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <p className="text-sm">Image failed to load</p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white rounded-lg border border-gray-200 p-6">
                                  <div className="text-center text-gray-500">
                                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-sm font-medium">Document</p>
                                    <p className="text-xs text-gray-400">Click "View Full Size" to open</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // Fallback for old documents or single documents
                      <div className="space-y-4">
                        {selectedBooking.documents.map((documentUrl, index) => {
                          const documentType = selectedBooking.documentTypes && selectedBooking.documentTypes[index]
                            ? selectedBooking.documentTypes[index] : 'document';
                          const isImage = documentUrl.match(/\.(jpg|jpeg|png|gif)$/i);

                          return (
                            <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <svg className="w-5 h-5 text-gray-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-sm font-medium text-gray-700">
                                    {documentType.charAt(0).toUpperCase() + documentType.slice(1)} Document
                                  </span>
                                </div>
                                <button
                                  onClick={() => window.open(documentUrl, '_blank')}
                                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                                >
                                  View Full Size
                                </button>
                              </div>

                              {/* Image Preview */}
                              {isImage ? (
                                <div className="relative bg-white rounded-lg border border-gray-200 overflow-hidden">
                                  <img
                                    src={documentUrl}
                                    alt={`${documentType} document`}
                                    className="w-full h-48 object-contain bg-gray-50"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                  <div
                                    className="w-full h-48 bg-gray-100 items-center justify-center text-gray-500"
                                    style={{ display: 'none' }}
                                  >
                                    <div className="text-center">
                                      <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <p className="text-sm">Image failed to load</p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white rounded-lg border border-gray-200 p-6">
                                  <div className="text-center text-gray-500">
                                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-sm font-medium">Document</p>
                                    <p className="text-xs text-gray-400">Click "View Full Size" to view</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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
