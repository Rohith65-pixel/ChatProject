import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with better error handling
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Log configuration status (without exposing secrets)
console.log('Cloudinary Configuration:', {
    cloud_name: cloudName ? '✓ Set' : '✗ Missing',
    api_key: apiKey ? '✓ Set' : '✗ Missing',
    api_secret: apiSecret ? '✓ Set' : '✗ Missing'
});

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
});

/**
 * Generate a signed upload URL for client-side uploads
 * @param {string} resourceType - 'image', 'video', or 'raw' (for audio)
 * @param {string} folder - Folder path in Cloudinary
 * @returns {Object} - Contains upload URL, timestamp, signature, and other params
 */
export const generateUploadSignature = (resourceType = 'auto', folder = 'chat-media') => {
    // Validate configuration
    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary credentials not configured. Please check your .env file.');
    }

    const timestamp = Math.round(Date.now() / 1000);

    const params = {
        timestamp,
        folder
    };

    try {
        const signature = cloudinary.utils.api_sign_request(
            params,
            apiSecret
        );

        return {
            signature,
            timestamp,
            cloudName: cloudName,
            apiKey: apiKey,
            folder,
            resourceType,
            uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`
        };
    }
    catch (error) {
        console.error('Error generating signature:', error);
        throw new Error('Failed to generate upload signature');
    }
};

export default cloudinary;
