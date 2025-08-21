// Cloudinary service for image upload and management via backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class CloudinaryService {
    // Upload image via backend
    async uploadImage(file, folder = 'hotel-documents') {
        try {
            const formData = new FormData();
            formData.append('document', file);

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/upload/document`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to upload image');
            }

            const data = await response.json();

            return {
                success: true,
                data: {
                    url: data.data.url,
                    publicId: data.data.publicId,
                    originalName: data.data.originalName,
                    size: data.data.size,
                    format: data.data.format
                }
            };
        } catch (error) {
            console.error('Upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Delete image via backend
    async deleteImage(publicId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/upload/document/${encodeURIComponent(publicId)}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete image');
            }

            const data = await response.json();

            return {
                success: true,
                data: data.data
            };
        } catch (error) {
            console.error('Delete error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Extract public ID from Cloudinary URL
    extractPublicId(cloudinaryUrl) {
        try {
            const parts = cloudinaryUrl.split('/');
            const filename = parts[parts.length - 1];
            // Remove file extension
            const publicId = filename.split('.')[0];
            // If it's in a folder, include folder path
            const uploadIndex = parts.findIndex(part => part === 'upload');
            if (uploadIndex !== -1 && uploadIndex + 2 < parts.length - 1) {
                const folderPath = parts.slice(uploadIndex + 2, -1).join('/');
                return folderPath ? `${folderPath}/${publicId}` : publicId;
            }
            return publicId;
        } catch (error) {
            console.error('Error extracting public ID:', error);
            return null;
        }
    }

    // Validate file before upload
    validateFile(file, maxSizeInMB = 5) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        const maxSize = maxSizeInMB * 1024 * 1024; // Convert to bytes

        if (!allowedTypes.includes(file.type)) {
            return {
                valid: false,
                error: 'Invalid file type. Only JPEG, PNG, and PDF files are allowed.'
            };
        }

        if (file.size > maxSize) {
            return {
                valid: false,
                error: `File size too large. Maximum size allowed is ${maxSizeInMB}MB.`
            };
        }

        return { valid: true };
    }
}

export const cloudinaryService = new CloudinaryService();
export default cloudinaryService;
