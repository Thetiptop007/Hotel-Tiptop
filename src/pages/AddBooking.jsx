import { useState, useCallback, useMemo, useEffect } from "react";
import { bookingAPI } from "../services/booking";
import { cloudinaryService } from "../services/cloudinary";

// Helper function to get current date in local timezone
const getCurrentLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AddBooking() {
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingFront, setIsUploadingFront] = useState(false);
  const [isUploadingBack, setIsUploadingBack] = useState(false);
  const [customerHistory, setCustomerHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadedDocuments, setUploadedDocuments] = useState({
    front: null,
    back: null
  });

  // Group booking states
  const [additionalGuests, setAdditionalGuests] = useState([]);
  const [showGroupBooking, setShowGroupBooking] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    customerMobile: '',
    customerAadhaar: '',
    rent: '',
    room: '',
    checkIn: getCurrentLocalDate(), // Today's date in local timezone
    aadhaarFront: null,
    aadhaarBack: null
  });

  // Mock customer database for demonstration (now indexed by both mobile and aadhaar)
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
      // Validate customer name (backend requires 2-100 characters, letters and spaces only)
      if (formData.customerName.trim().length < 2) {
        throw new Error('Customer name must be at least 2 characters long');
      }

      if (formData.customerName.trim().length > 100) {
        throw new Error('Customer name cannot exceed 100 characters');
      }

      if (!/^[a-zA-Z\s]+$/.test(formData.customerName.trim())) {
        throw new Error('Customer name can only contain letters and spaces');
      }

      // Validate mobile number format for backend
      if (formData.customerMobile.length !== 10 || !/^[0-9]{10}$/.test(formData.customerMobile)) {
        throw new Error('Mobile number must be exactly 10 digits');
      }

      if (!['6', '7', '8', '9'].includes(formData.customerMobile.charAt(0))) {
        throw new Error('Mobile number must start with 6, 7, 8, or 9');
      }

      // Additional mobile number validation
      const uniqueDigits = new Set(formData.customerMobile).size;
      if (uniqueDigits === 1) {
        throw new Error('Mobile number cannot have all same digits');
      }

      let documentUrls = [];
      let documentPublicIds = [];
      let documentTypes = [];

      // Upload front side document to Cloudinary if provided
      if (formData.aadhaarFront) {
        setIsUploadingFront(true);
        const uploadResult = await cloudinaryService.uploadImage(formData.aadhaarFront, 'hotel-documents/aadhaar-front');

        if (uploadResult.success) {
          documentUrls.push(uploadResult.data.url);
          documentPublicIds.push(uploadResult.data.publicId);
          documentTypes.push('aadhaar-front');
          setUploadedDocuments(prev => ({
            ...prev,
            front: {
              url: uploadResult.data.url,
              publicId: uploadResult.data.publicId
            }
          }));
        } else {
          setIsUploadingFront(false);
          throw new Error(`Front side document upload failed: ${uploadResult.error}`);
        }
        setIsUploadingFront(false);
      }

      // Upload back side document to Cloudinary if provided
      if (formData.aadhaarBack) {
        setIsUploadingBack(true);
        const uploadResult = await cloudinaryService.uploadImage(formData.aadhaarBack, 'hotel-documents/aadhaar-back');

        if (uploadResult.success) {
          documentUrls.push(uploadResult.data.url);
          documentPublicIds.push(uploadResult.data.publicId);
          documentTypes.push('aadhaar-back');
          setUploadedDocuments(prev => ({
            ...prev,
            back: {
              url: uploadResult.data.url,
              publicId: uploadResult.data.publicId
            }
          }));
        } else {
          setIsUploadingBack(false);
          throw new Error(`Back side document upload failed: ${uploadResult.error}`);
        }
        setIsUploadingBack(false);
      }

      // Format Aadhaar number before submission if it's not already formatted
      let formattedAadhaar = formData.customerAadhaar;
      if (formattedAadhaar && !formattedAadhaar.includes('-')) {
        const numbers = formattedAadhaar.replace(/\D/g, '');
        if (numbers.length === 12) {
          formattedAadhaar = `${numbers.slice(0, 4)}-${numbers.slice(4, 8)}-${numbers.slice(8, 12)}`;
        }
      }

      // Validate Aadhaar format for backend
      if (formattedAadhaar && !/^[0-9]{4}-[0-9]{4}-[0-9]{4}$/.test(formattedAadhaar)) {
        throw new Error('Aadhaar number must be in format XXXX-XXXX-XXXX with only numbers');
      }

      // Process additional guests documents
      const processedAdditionalGuests = [];

      if (additionalGuests && additionalGuests.length > 0) {
        for (let i = 0; i < additionalGuests.length; i++) {
          const guest = additionalGuests[i];

          // Validate guest name is provided
          if (!guest.name || guest.name.trim().length === 0) {
            throw new Error(`Guest ${i + 2} name is required`);
          }

          // Validate guest name length and format (backend requires 2-100 characters, letters and spaces only)
          if (guest.name.trim().length < 2) {
            throw new Error(`Guest ${i + 2} name must be at least 2 characters long`);
          }

          if (guest.name.trim().length > 100) {
            throw new Error(`Guest ${i + 2} name cannot exceed 100 characters`);
          }

          if (!/^[a-zA-Z\s]+$/.test(guest.name.trim())) {
            throw new Error(`Guest ${i + 2} name can only contain letters and spaces`);
          }

          // Validate and format guest mobile number
          let guestMobile = guest.mobile || '';
          if (guestMobile) {
            // Ensure mobile is exactly 10 digits
            const mobileString = String(guestMobile).replace(/\D/g, '');
            if (mobileString.length !== 10) {
              throw new Error(`Guest ${i + 2} mobile number must be exactly 10 digits`);
            }
            if (!['6', '7', '8', '9'].includes(mobileString.charAt(0))) {
              throw new Error(`Guest ${i + 2} mobile number must start with 6, 7, 8, or 9`);
            }
            guestMobile = mobileString;
          }

          // Format guest Aadhaar number
          let guestAadhaar = guest.aadhaar || '';
          if (guestAadhaar && !guestAadhaar.includes('-')) {
            const numbers = guestAadhaar.replace(/\D/g, '');
            if (numbers.length === 12) {
              guestAadhaar = `${numbers.slice(0, 4)}-${numbers.slice(4, 8)}-${numbers.slice(8, 12)}`;
            }
          }

          // Validate guest Aadhaar format for backend
          if (guestAadhaar && !/^[0-9]{4}-[0-9]{4}-[0-9]{4}$/.test(guestAadhaar)) {
            throw new Error(`Guest ${i + 2} Aadhaar number must be in format XXXX-XXXX-XXXX with only numbers`);
          }

          const processedGuest = {
            name: guest.name.trim(),
            mobile: guestMobile,
            aadhaar: guestAadhaar,
            relationship: guest.relationship || 'Guest',
            documents: [],
            documentPublicIds: [],
            documentTypes: []
          };

          // Upload guest's front document if provided
          if (guest.aadhaarFront) {
            try {
              const uploadResult = await cloudinaryService.uploadImage(
                guest.aadhaarFront,
                `hotel-documents/guest-${i + 1}-aadhaar-front`
              );
              if (uploadResult.success) {
                processedGuest.documents.push(uploadResult.data.url);
                processedGuest.documentPublicIds.push(uploadResult.data.publicId);
                processedGuest.documentTypes.push('aadhaar-front');
              }
            } catch (err) {
              console.warn(`Failed to upload guest ${i + 1} front document:`, err);
            }
          }

          // Upload guest's back document if provided
          if (guest.aadhaarBack) {
            try {
              const uploadResult = await cloudinaryService.uploadImage(
                guest.aadhaarBack,
                `hotel-documents/guest-${i + 1}-aadhaar-back`
              );
              if (uploadResult.success) {
                processedGuest.documents.push(uploadResult.data.url);
                processedGuest.documentPublicIds.push(uploadResult.data.publicId);
                processedGuest.documentTypes.push('aadhaar-back');
              }
            } catch (err) {
              console.warn(`Failed to upload guest ${i + 1} back document:`, err);
            }
          }

          processedAdditionalGuests.push(processedGuest);
        }
      }

      const bookingData = {
        customerName: formData.customerName,
        customerMobile: formData.customerMobile,
        customerAadhaar: formattedAadhaar,
        rent: parseFloat(formData.rent),
        room: formData.room || 'TBD',
        checkIn: formData.checkIn,
        status: 'checked-in',
        documents: documentUrls,
        documentTypes: documentTypes,
        documentPublicIds: documentPublicIds,
        additionalGuests: processedAdditionalGuests,
        groupSize: 1 + processedAdditionalGuests.length
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
          checkIn: getCurrentLocalDate(),
          aadhaarFront: null,
          aadhaarBack: null
        });
        setUploadedDocuments({
          front: null,
          back: null
        });
        setAdditionalGuests([]);
        setShowGroupBooking(false);
        setShowHistory(false);
        setCustomerHistory(null);
      }
    } catch (error) {
      console.error('Booking submission error:', error);
      setError(error.message || 'Failed to create booking. Please check all fields and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [formData, additionalGuests]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;

    // Format and validate mobile number
    if (name === 'customerMobile') {
      // Remove all non-digit characters
      const numbers = value.replace(/\D/g, '');
      // Limit to 10 digits
      const limited = numbers.slice(0, 10);

      // Validate mobile number format
      if (limited.length > 0) {
        // Check if it starts with valid digits (6, 7, 8, 9)
        const firstDigit = limited.charAt(0);
        if (!['6', '7', '8', '9'].includes(firstDigit)) {
          setError('Mobile number must start with 6, 7, 8, or 9');
          return;
        }
      }

      // Check for invalid patterns
      if (limited.length >= 3) {
        // Check for repeated digits (like 1111111111)
        const uniqueDigits = new Set(limited).size;
        if (uniqueDigits === 1) {
          setError('Mobile number cannot have all same digits');
          return;
        }

        // Check for sequential patterns (like 1234567890)
        const isSequential = limited.split('').every((digit, index) => {
          if (index === 0) return true;
          return parseInt(digit) === (parseInt(limited[index - 1]) + 1) % 10;
        });
        if (isSequential) {
          setError('Mobile number cannot be sequential digits');
          return;
        }
      }

      setFormData(prev => ({
        ...prev,
        [name]: limited
      }));
    }
    // Format Aadhaar number as user types
    else if (name === 'customerAadhaar') {
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
    // Clear messages when user types (except for mobile validation errors)
    if (error && name !== 'customerMobile') setError("");
    if (successMessage) setSuccessMessage("");
  }, [error, successMessage]);

  const handleFileChange = useCallback((e, side) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file
      const validation = cloudinaryService.validateFile(file, 5); // 5MB max
      if (!validation.valid) {
        setError(validation.error);
        return;
      }
      setError(""); // Clear any previous errors
    }

    if (side === 'front') {
      setFormData(prev => ({
        ...prev,
        aadhaarFront: file
      }));
    } else if (side === 'back') {
      setFormData(prev => ({
        ...prev,
        aadhaarBack: file
      }));
    }
  }, []);

  const handleCheckCustomer = useCallback(async () => {
    if (!formData.customerMobile && !formData.customerAadhaar) {
      setError('Please enter either mobile number or Aadhaar number to check customer history');
      return;
    }

    setIsChecking(true);
    setError("");

    try {
      const response = await bookingAPI.searchCustomer(
        formData.customerMobile,
        formData.customerAadhaar
      );

      if (response.success && response.data.found) {
        setCustomerHistory(response.data.customer);
        setShowHistory(true);

        // Auto-fill form with existing customer data
        setFormData(prev => ({
          ...prev,
          customerName: response.data.customer.name,
          customerAadhaar: response.data.customer.aadhaar,
          customerMobile: response.data.customer.mobile
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
  }, [formData.customerMobile, formData.customerAadhaar]);

  // New function specifically for checking history by Aadhaar
  const handleCheckCustomerHistory = useCallback(async () => {
    if (!formData.customerAadhaar || formData.customerAadhaar.length < 14) {
      setError('Please enter a valid Aadhaar number to check customer history');
      return;
    }

    setIsChecking(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await bookingAPI.searchCustomer(null, formData.customerAadhaar);

      if (response.success && response.data.found) {
        setCustomerHistory(response.data.customer);
        setShowHistoryModal(true);

        // Auto-fill form with existing customer data
        setFormData(prev => ({
          ...prev,
          customerName: response.data.customer.name,
          customerMobile: response.data.customer.mobile
        }));
      } else {
        setCustomerHistory(null);
        setSuccessMessage('Customer not found. This appears to be a new customer.');
      }
    } catch (error) {
      console.warn('Customer search failed:', error);
      setCustomerHistory(null);
      // Don't show error for customer not found - it's normal for new customers
      setSuccessMessage('Customer history not available. This may be a new customer.');
    } finally {
      setIsChecking(false);
    }
  }, [formData.customerAadhaar]);

  // Additional guest management functions
  const addAdditionalGuest = useCallback(() => {
    const newGuest = {
      id: Date.now(),
      name: '',
      mobile: '',
      aadhaar: '',
      relationship: 'Guest',
      aadhaarFront: null,
      aadhaarBack: null
    };
    setAdditionalGuests(prev => [...prev, newGuest]);
    setShowGroupBooking(true);
  }, []);

  const removeAdditionalGuest = useCallback((guestId) => {
    setAdditionalGuests(prev => prev.filter(guest => guest.id !== guestId));
    if (additionalGuests.length <= 1) {
      setShowGroupBooking(false);
    }
  }, [additionalGuests.length]);

  const updateAdditionalGuest = useCallback((guestId, field, value) => {
    // Mobile validation for guests
    if (field === 'mobile') {
      // Remove all non-digit characters
      const numbers = value.replace(/\D/g, '');
      // Limit to 10 digits
      const limited = numbers.slice(0, 10);

      // Validate mobile number format
      if (limited.length > 0) {
        // Check if it starts with valid digits (6, 7, 8, 9)
        const firstDigit = limited.charAt(0);
        if (!['6', '7', '8', '9'].includes(firstDigit) && limited.length > 0) {
          return; // Don't update if invalid
        }
      }

      // Check for invalid patterns
      if (limited.length >= 3) {
        // Check for repeated digits (like 1111111111)
        const uniqueDigits = new Set(limited).size;
        if (uniqueDigits === 1) {
          return; // Don't update if invalid
        }

        // Check for sequential patterns (like 1234567890)
        const isSequential = limited.split('').every((digit, index) => {
          if (index === 0) return true;
          return parseInt(digit) === (parseInt(limited[index - 1]) + 1) % 10;
        });
        if (isSequential) {
          return; // Don't update if invalid
        }
      }

      setAdditionalGuests(prev =>
        prev.map(guest =>
          guest.id === guestId
            ? { ...guest, [field]: limited }
            : guest
        )
      );
    } else {
      setAdditionalGuests(prev =>
        prev.map(guest =>
          guest.id === guestId
            ? { ...guest, [field]: value }
            : guest
        )
      );
    }
  }, []);

  const handleGuestFileChange = useCallback((guestId, side, file) => {
    updateAdditionalGuest(guestId, side === 'front' ? 'aadhaarFront' : 'aadhaarBack', file);
  }, [updateAdditionalGuest]);

  // Memoized form validation for better performance
  const isFormValid = useMemo(() => {
    const isMobileValid = formData.customerMobile.trim().length === 10 &&
      ['6', '7', '8', '9'].includes(formData.customerMobile.charAt(0));
    const isAadhaarValid = formData.customerAadhaar.trim().length >= 14; // Should be 12 digits + 2 dashes
    const isNameValid = formData.customerName.trim().length >= 2; // Backend requires min 2 characters

    return isNameValid &&
      isMobileValid &&
      isAadhaarValid &&
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
                    placeholder="Enter 10-digit mobile number"
                    className={`w-full px-4 py-3 rounded-xl border ${formData.customerMobile && formData.customerMobile.length === 10 && ['6', '7', '8', '9'].includes(formData.customerMobile.charAt(0))
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20'
                      : formData.customerMobile && formData.customerMobile.length > 0
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20'
                      } focus:ring-2 outline-none transition-all duration-300 bg-white/50`}
                    maxLength="10"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    {formData.customerMobile && formData.customerMobile.length === 10 && ['6', '7', '8', '9'].includes(formData.customerMobile.charAt(0)) ? (
                      <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : formData.customerMobile && formData.customerMobile.length > 0 ? (
                      <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    )}
                  </div>
                </div>
                {formData.customerMobile && formData.customerMobile.length > 0 && formData.customerMobile.length < 10 && (
                  <p className="text-xs text-orange-600 mt-1">
                    Mobile number must be 10 digits long
                  </p>
                )}
                {formData.customerMobile && formData.customerMobile.length === 10 && !['6', '7', '8', '9'].includes(formData.customerMobile.charAt(0)) && (
                  <p className="text-xs text-red-600 mt-1">
                    Mobile number must start with 6, 7, 8, or 9
                  </p>
                )}
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

            {/* Row 3 - Aadhaar Number & Check-in Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Aadhaar Number with Check History Button */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Aadhaar Number
                </label>
                <div className="flex gap-3 items-center">
                  <div className="relative flex-[3]">
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
                  <button
                    type="button"
                    onClick={handleCheckCustomerHistory}
                    disabled={isChecking || !formData.customerAadhaar || formData.customerAadhaar.length < 14}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-4 focus:ring-green-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap h-full"
                  >
                    {isChecking ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="hidden sm:inline">Checking</span>
                        <span className="sm:hidden">...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span className="hidden lg:inline">Check History</span>
                        <span className="lg:hidden hidden sm:inline">Check</span>
                        <span className="sm:hidden">✓</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Check-in Date */}
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
            </div>

            {/* Row 4 - Aadhaar Document Upload Section */}
            <div className="space-y-4">
              <label className="text-sm font-medium text-gray-700">
                📎 Upload Aadhaar Documents (Optional)
              </label>

              {/* Simplified Upload Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Front Side Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-600">
                    📄 Front Side
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      name="aadhaarFront"
                      onChange={(e) => handleFileChange(e, 'front')}
                      accept=".jpg,.jpeg,.png"
                      className="w-full px-3 py-2 rounded-lg border-2 border-dashed border-blue-200 hover:border-blue-300 focus:border-blue-400 focus:outline-none transition-colors bg-blue-25 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                    />

                    {formData.aadhaarFront && (
                      <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-green-600 mr-2">✓</span>
                          <span className="text-sm text-blue-700 truncate">
                            {formData.aadhaarFront.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, aadhaarFront: null }))}
                          className="text-red-500 hover:text-red-700 ml-2 text-lg"
                          title="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {isUploadingFront && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200 flex items-center">
                        <div className="animate-spin mr-2">⏳</div>
                        <span className="text-sm text-yellow-700">Uploading...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Back Side Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-green-600">
                    📄 Back Side
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      name="aadhaarBack"
                      onChange={(e) => handleFileChange(e, 'back')}
                      accept=".jpg,.jpeg,.png"
                      className="w-full px-3 py-2 rounded-lg border-2 border-dashed border-green-200 hover:border-green-300 focus:border-green-400 focus:outline-none transition-colors bg-green-25 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
                    />

                    {formData.aadhaarBack && (
                      <div className="mt-2 p-2 bg-green-50 rounded border border-green-200 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-green-600 mr-2">✓</span>
                          <span className="text-sm text-green-700 truncate">
                            {formData.aadhaarBack.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, aadhaarBack: null }))}
                          className="text-red-500 hover:text-red-700 ml-2 text-lg"
                          title="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {isUploadingBack && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200 flex items-center">
                        <div className="animate-spin mr-2">⏳</div>
                        <span className="text-sm text-yellow-700">Uploading...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload Tips */}
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                💡 <strong>Tips:</strong> Upload clear photos of Aadhaar card. Accepted formats: JPG, PNG. Max size: 5MB each.
              </div>
            </div>

            {/* Group Booking Section */}
            <div className="mt-8 p-6 bg-gradient-to-r from-green-50/80 to-blue-50/80 rounded-xl border border-green-200/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Group Booking</h3>
                  <p className="text-sm text-gray-600">Add additional guests for group bookings</p>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-600">
                    Total Guests: {1 + additionalGuests.length}
                  </span>
                </div>
              </div>

              {/* Additional Guests Forms */}
              {additionalGuests.map((guest, index) => (
                <div key={guest.id} className="mt-4 p-5 bg-white/70 rounded-lg border border-gray-200/50 relative">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-800">Guest {index + 2}</h4>
                    <button
                      type="button"
                      onClick={() => removeAdditionalGuest(guest.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Guest Name */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guest Name *
                      </label>
                      <input
                        type="text"
                        value={guest.name}
                        onChange={(e) => updateAdditionalGuest(guest.id, 'name', e.target.value)}
                        placeholder="Enter guest name"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
                        required
                      />
                    </div>

                    {/* Guest Mobile */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mobile Number
                      </label>
                      <input
                        type="text"
                        value={guest.mobile}
                        onChange={(e) => updateAdditionalGuest(guest.id, 'mobile', e.target.value)}
                        placeholder="Enter 10-digit mobile number"
                        className={`w-full px-4 py-3 rounded-xl border ${guest.mobile && guest.mobile.length === 10 && ['6', '7', '8', '9'].includes(guest.mobile.charAt(0))
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20 bg-green-50/50'
                          : guest.mobile && guest.mobile.length > 0
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20'
                          } focus:ring-2 outline-none transition-all duration-300 bg-white/50`}
                        maxLength="10"
                      />
                      <div className="absolute inset-y-0 right-0 top-8 flex items-center pr-4">
                        {guest.mobile && guest.mobile.length === 10 && ['6', '7', '8', '9'].includes(guest.mobile.charAt(0)) ? (
                          <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : guest.mobile && guest.mobile.length > 0 ? (
                          <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        )}
                      </div>
                      {guest.mobile && guest.mobile.length > 0 && guest.mobile.length < 10 && (
                        <p className="text-xs text-red-500 mt-1">Mobile number must be 10 digits</p>
                      )}
                      {guest.mobile && guest.mobile.length > 0 && !['6', '7', '8', '9'].includes(guest.mobile.charAt(0)) && (
                        <p className="text-xs text-red-500 mt-1">Mobile number must start with 6, 7, 8, or 9</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Guest Aadhaar */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Aadhaar Number
                      </label>
                      <input
                        type="text"
                        value={guest.aadhaar}
                        onChange={(e) => {
                          const numbers = e.target.value.replace(/\D/g, '');
                          const formatted = numbers.length <= 12
                            ? numbers.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3').replace(/-+$/, '')
                            : guest.aadhaar;
                          updateAdditionalGuest(guest.id, 'aadhaar', formatted);
                        }}
                        placeholder="XXXX-XXXX-XXXX"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
                      />
                    </div>

                    {/* Relationship */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Relationship
                      </label>
                      <select
                        value={guest.relationship}
                        onChange={(e) => updateAdditionalGuest(guest.id, 'relationship', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white/50"
                      >
                        <option value="Guest">Guest</option>
                        <option value="Family">Family</option>
                        <option value="Friend">Friend</option>
                        <option value="Colleague">Colleague</option>
                        <option value="Business Partner">Business Partner</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Guest Document Upload */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Front Side Upload */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-600">
                        📄 Front Side
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          onChange={(e) => handleGuestFileChange(guest.id, 'front', e.target.files[0])}
                          className="w-full px-3 py-2 rounded-lg border-2 border-dashed border-blue-200 hover:border-blue-300 focus:border-blue-400 focus:outline-none transition-colors bg-blue-25 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                        />
                        {guest.aadhaarFront && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200 flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-green-600 mr-2">✓</span>
                              <span className="text-sm text-blue-700 truncate">
                                {guest.aadhaarFront.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateAdditionalGuest(guest.id, 'aadhaarFront', null)}
                              className="text-red-500 hover:text-red-700 ml-2 text-lg"
                              title="Remove file"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Back Side Upload */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-green-600">
                        📄 Back Side
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          onChange={(e) => handleGuestFileChange(guest.id, 'back', e.target.files[0])}
                          className="w-full px-3 py-2 rounded-lg border-2 border-dashed border-green-200 hover:border-green-300 focus:border-green-400 focus:outline-none transition-colors bg-green-25 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
                        />
                        {guest.aadhaarBack && (
                          <div className="mt-2 p-2 bg-green-50 rounded border border-green-200 flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-green-600 mr-2">✓</span>
                              <span className="text-sm text-green-700 truncate">
                                {guest.aadhaarBack.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateAdditionalGuest(guest.id, 'aadhaarBack', null)}
                              className="text-red-500 hover:text-red-700 ml-2 text-lg"
                              title="Remove file"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Guest Button at Bottom */}
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={addAdditionalGuest}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-4 focus:ring-green-500/30 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Another Guest</span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                disabled={isLoading || isUploadingFront || isUploadingBack}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading || isUploadingFront || isUploadingBack ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isLoading ? 'Adding Booking...' :
                      isUploadingFront && isUploadingBack ? 'Uploading Documents...' :
                        isUploadingFront ? 'Uploading Front...' : 'Uploading Back...'}
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
                    checkIn: getCurrentLocalDate(),
                    customerAadhaar: '',
                    aadhaarFront: null,
                    aadhaarBack: null
                  });
                  setUploadedDocuments({
                    front: null,
                    back: null
                  });
                  setAdditionalGuests([]);
                  setShowGroupBooking(false);
                  setError("");
                  setSuccessMessage("");
                  setShowHistory(false);
                  setShowHistoryModal(false);
                  setCustomerHistory(null);
                }}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Customer History Modal */}
      {showHistoryModal && customerHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/30 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Customer History
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Customer Summary */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border border-green-200 mb-6">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl mr-4">
                  {customerHistory.name ? customerHistory.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800">{customerHistory.name}</h4>
                  <p className="text-gray-600">Mobile: {customerHistory.mobile}</p>
                  <p className="text-gray-600">Aadhaar: {customerHistory.aadhaar}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{customerHistory.totalBookings || 0}</p>
                  <p className="text-sm text-gray-600">Total Visits</p>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">₹{customerHistory.totalSpent || 0}</p>
                  <p className="text-sm text-gray-600">Total Spent</p>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
                  <p className="text-lg font-bold text-purple-600">
                    {customerHistory.lastVisit
                      ? new Date(customerHistory.lastVisit).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                      : 'N/A'
                    }
                  </p>
                  <p className="text-sm text-gray-600">Last Visit</p>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
                  <p className="text-lg font-bold text-orange-600">
                    {customerHistory.totalBookings > 5 ? 'VIP' : customerHistory.totalBookings > 2 ? 'Regular' : 'New'}
                  </p>
                  <p className="text-sm text-gray-600">Status</p>
                </div>
              </div>
            </div>

            {/* Booking History */}
            {customerHistory.bookings && customerHistory.bookings.length > 0 ? (
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-4">Previous Bookings:</h4>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {customerHistory.bookings.map((booking, index) => (
                    <div key={booking._id || index} className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white/50 hover:bg-white/80 transition-all duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-700">Booking ID</p>
                          <p className="text-blue-600 font-semibold">{booking.serialNo || booking.entryNo || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Check-in</p>
                          <p className="text-gray-600">{booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Check-out</p>
                          <p className="text-gray-600">{booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : 'Active'}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Room</p>
                          <p className="text-gray-600">{booking.room || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Rent</p>
                          <p className="text-green-600 font-semibold">₹{booking.rent || 0}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Status</p>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${booking.status === 'checked-out'
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'checked-in'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                            }`}>
                            {booking.status || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600 text-lg">No booking history found</p>
                <p className="text-gray-500 text-sm">This customer hasn't made any bookings yet.</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
              >
                Continue with Booking
              </button>
            </div>
          </div>
        </div>
      )}

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
