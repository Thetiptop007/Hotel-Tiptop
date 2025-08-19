import { useState, useCallback, useMemo, useEffect } from "react";
import { bookingAPI } from "../services/booking";

export default function AddBooking() {
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [customerHistory, setCustomerHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    customerName: '',
    customerMobile: '',
    customerAadhaar: '',
    rent: '',
    room: '',
    checkIn: new Date().toISOString().split('T')[0], // Today's date
    document: null
  });

  // Debug log
  useEffect(() => {
    console.log("AddBooking component rendered");
  }, []);  // Mock customer database for demonstration (now indexed by both mobile and aadhaar)
  const mockCustomerData = {
    "9876543210": {
      name: "John Smith",
      aadhaar: "1234-5678-9012",
      mobile: "9876543210",
      visitCount: 3,
      visits: [
        {
          id: 1,
          entryNo: "E001",
          serialNo: "S001",
          checkIn: "2024-01-15",
          checkOut: "2024-01-20",
          rent: 2500,
          room: "201"
        },
        {
          id: 2,
          entryNo: "E045",
          serialNo: "S045",
          checkIn: "2024-05-10",
          checkOut: "2024-05-15",
          rent: 3000,
          room: "305"
        },
        {
          id: 3,
          entryNo: "E089",
          serialNo: "S089",
          checkIn: "2024-08-01",
          checkOut: "2024-08-05",
          rent: 2800,
          room: "102"
        }
      ],
      totalSpent: 8300,
      lastVisit: "2024-08-05"
    },
    "1234-5678-9012": {
      name: "John Smith",
      aadhaar: "1234-5678-9012",
      mobile: "9876543210",
      visitCount: 3,
      visits: [
        {
          id: 1,
          entryNo: "E001",
          serialNo: "S001",
          checkIn: "2024-01-15",
          checkOut: "2024-01-20",
          rent: 2500,
          room: "201"
        },
        {
          id: 2,
          entryNo: "E045",
          serialNo: "S045",
          checkIn: "2024-05-10",
          checkOut: "2024-05-15",
          rent: 3000,
          room: "305"
        },
        {
          id: 3,
          entryNo: "E089",
          serialNo: "S089",
          checkIn: "2024-08-01",
          checkOut: "2024-08-05",
          rent: 2800,
          room: "102"
        }
      ],
      totalSpent: 8300,
      lastVisit: "2024-08-05"
    },
    "8765432109": {
      name: "Sarah Johnson",
      aadhaar: "9876-5432-1098",
      mobile: "8765432109",
      visitCount: 2,
      visits: [
        {
          id: 1,
          entryNo: "E023",
          serialNo: "S023",
          checkIn: "2024-03-12",
          checkOut: "2024-03-16",
          rent: 3200,
          room: "401"
        },
        {
          id: 2,
          entryNo: "E067",
          serialNo: "S067",
          checkIn: "2024-07-08",
          checkOut: "2024-07-12",
          rent: 3500,
          room: "301"
        }
      ],
      totalSpent: 6700,
      lastVisit: "2024-07-12"
    },
    "9876-5432-1098": {
      name: "Sarah Johnson",
      aadhaar: "9876-5432-1098",
      mobile: "8765432109",
      visitCount: 2,
      visits: [
        {
          id: 1,
          entryNo: "E023",
          serialNo: "S023",
          checkIn: "2024-03-12",
          checkOut: "2024-03-16",
          rent: 3200,
          room: "401"
        },
        {
          id: 2,
          entryNo: "E067",
          serialNo: "S067",
          checkIn: "2024-07-08",
          checkOut: "2024-07-12",
          rent: 3500,
          room: "301"
        }
      ],
      totalSpent: 6700,
      lastVisit: "2024-07-12"
    }
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      // Format Aadhaar number before submission if it's not already formatted
      let formattedAadhaar = formData.customerAadhaar;
      if (formattedAadhaar && !formattedAadhaar.includes('-')) {
        const numbers = formattedAadhaar.replace(/\D/g, '');
        if (numbers.length === 12) {
          formattedAadhaar = `${numbers.slice(0, 4)}-${numbers.slice(4, 8)}-${numbers.slice(8, 12)}`;
        }
      }

      const bookingData = {
        customerName: formData.customerName,
        customerMobile: formData.customerMobile,
        customerAadhaar: formattedAadhaar,
        rent: parseFloat(formData.rent),
        room: formData.room || 'TBD',
        checkIn: formData.checkIn,
        status: 'checked-in'
      };

      const response = await bookingAPI.createBooking(bookingData);

      if (response.success) {
        setSuccessMessage(`Booking created successfully! Booking ID: ${response.data.booking.serialNo}`);
        // Reset form
        setFormData({
          customerName: '',
          customerMobile: '',
          customerAadhaar: '',
          rent: '',
          room: '',
          checkIn: new Date().toISOString().split('T')[0],
          aadhaarImage: null
        });
        setShowHistory(false);
        setCustomerHistory(null);
      }
    } catch (error) {
      setError(error.message || 'Failed to create booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [formData]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;

    // Format Aadhaar number as user types
    if (name === 'customerAadhaar') {
      // Remove all non-digit characters
      const numbers = value.replace(/\D/g, '');
      // Limit to 12 digits
      const limited = numbers.slice(0, 12);
      // Add dashes after 4th and 8th digits
      let formatted = limited;
      if (limited.length > 4) {
        formatted = limited.slice(0, 4) + '-' + limited.slice(4);
      }
      if (limited.length > 8) {
        formatted = limited.slice(0, 4) + '-' + limited.slice(4, 8) + '-' + limited.slice(8);
      }

      setFormData(prev => ({
        ...prev,
        [name]: formatted
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    // Clear messages when user types
    if (error) setError("");
    if (successMessage) setSuccessMessage("");
  }, [error, successMessage]);

  const handleFileChange = useCallback((e) => {
    setFormData(prev => ({
      ...prev,
      document: e.target.files[0]
    }));
  }, []);

  const handleCheckCustomer = useCallback(async () => {
    if (!formData.mobile && !formData.aadhaar) {
      setError('Please enter either mobile number or Aadhaar number to check customer history');
      return;
    }

    setIsChecking(true);
    setError("");

    try {
      const searchParams = {};
      if (formData.mobile) searchParams.mobile = formData.mobile;
      if (formData.aadhaar) searchParams.aadhaar = formData.aadhaar;

      const response = await customerAPI.searchCustomer(searchParams);

      if (response.success && response.data.found) {
        setCustomerHistory(response.data.customer);
        setShowHistory(true);

        // Auto-fill form with existing customer data
        setFormData(prev => ({
          ...prev,
          name: response.data.customer.name,
          aadhaar: response.data.customer.aadhaar,
          mobile: response.data.customer.mobile
        }));

        if (response.data.archived) {
          setSuccessMessage('Customer found in archives. Some recent booking data may not be available.');
        }
      } else {
        setCustomerHistory(null);
        setShowHistory(false);
        setSuccessMessage('Customer not found. This appears to be a new customer.');
      }
    } catch (error) {
      setError(error.message || 'Failed to search customer. Please try again.');
      setCustomerHistory(null);
      setShowHistory(false);
    } finally {
      setIsChecking(false);
    }
  }, [formData.mobile, formData.aadhaar]);

  // Memoized form validation for better performance
  const isFormValid = useMemo(() => {
    return formData.customerName.trim() &&
      formData.customerMobile.trim() &&
      formData.customerAadhaar.trim() &&
      formData.rent &&
      formData.checkIn;
  }, [formData]);

  const formatCurrency = useMemo(() => {
    return (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0
      }).format(amount || 0);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/80 via-white/90 to-purple-50/80 relative overflow-hidden">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-blue-300/20 to-purple-300/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-r from-purple-300/20 to-pink-300/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-gradient-to-r from-yellow-300/20 to-orange-300/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 p-6">
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Add New Customer
              </h1>
              <p className="text-gray-600 mt-1">Fill in the customer details and room information</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white shadow-lg">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Customer Form */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/30">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-green-700 font-medium">{successMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1 - Name & Mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Customer Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Mobile Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    name="customerMobile"
                    value={formData.customerMobile}
                    onChange={handleInputChange}
                    placeholder="Enter mobile number"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer History Display */}
            {showHistory && customerHistory && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
                <div className="flex items-center mb-4">
                  <svg className="w-6 h-6 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-lg font-bold text-green-700">Returning Customer Found!</h3>
                </div>

                {/* Customer Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{customerHistory.visitCount}</p>
                    <p className="text-sm text-gray-600">Total Visits</p>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">₹{customerHistory.totalSpent}</p>
                    <p className="text-sm text-gray-600">Total Spent</p>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
                    <p className="text-sm font-bold text-purple-600">{customerHistory.lastVisit}</p>
                    <p className="text-sm text-gray-600">Last Visit</p>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
                    <p className="text-sm font-bold text-orange-600">VIP</p>
                    <p className="text-sm text-gray-600">Customer Status</p>
                  </div>
                </div>

                {/* Visit History */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">Previous Visits:</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {customerHistory.visits.map((visit, index) => (
                      <div key={visit.id} className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/50">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-700">Visit #{customerHistory.visitCount - index}</p>
                            <p className="text-gray-600">Entry: {visit.entryNo}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Check-in</p>
                            <p className="text-gray-600">{visit.checkIn}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Check-out</p>
                            <p className="text-gray-600">{visit.checkOut}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Room</p>
                            <p className="text-gray-600">{visit.room}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Rent</p>
                            <p className="text-green-600 font-semibold">₹{visit.rent}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Row 2 - Rent & Room Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Room Rent
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="rent"
                    value={formData.rent}
                    onChange={handleInputChange}
                    placeholder="Enter room rent"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Room Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="room"
                    value={formData.room}
                    onChange={handleInputChange}
                    placeholder="e.g., 101, 201A"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h4a1 1 0 011 1v5m-6 0h6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3 - Aadhaar Number */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Aadhaar Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="customerAadhaar"
                  value={formData.customerAadhaar}
                  onChange={handleInputChange}
                  placeholder="XXXX-XXXX-XXXX"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Row 3 - Check-in Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Check-in Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="checkIn"
                  value={formData.checkIn}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
                  required
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Upload Document
              </label>
              <div className="relative">
                <input
                  type="file"
                  name="document"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            {/* Check Customer Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleCheckCustomer}
                disabled={isChecking}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-8 rounded-xl font-medium hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-4 focus:ring-green-500/30 transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isChecking ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Checking...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    Check Customer History
                  </div>
                )}
              </button>
            </div>

            {/* Submit Button */}
            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding Booking...
                  </div>
                ) : (
                  'Add Booking'
                )}
              </button>

              <button
                type="button"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-300"
                onClick={() => {
                  setFormData({
                    customerName: '',
                    customerMobile: '',
                    rent: '',
                    room: '',
                    checkIn: new Date().toISOString().split('T')[0],
                    customerAadhaar: '',
                    document: null
                  });
                  setError("");
                  setSuccessMessage("");
                  setShowHistory(false);
                  setCustomerHistory(null);
                }}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
