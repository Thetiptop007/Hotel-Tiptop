import { useNavigate } from "react-router-dom";
import logoFull from "../assets/logo-full.png";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="flex items-center justify-center mb-6">
          <img
            src={logoFull}
            alt="TipTop Hotel"
            className="h-20 w-auto object-contain"
          />
        </div>
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8 max-w-md">
          Sorry, the page you are looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-300 mr-4"
        >
          Go Back
        </button>
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-all duration-300"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
