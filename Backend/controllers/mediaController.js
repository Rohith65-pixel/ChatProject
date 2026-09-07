import asyncHandler from "express-async-handler";
import { generateUploadSignature } from "../utils/cloudinary.js";

/**
 * @desc    Get signed upload URL for media upload
 * @route   POST /api/media/upload-signature
 * @access  Private
 */
export const getUploadSignature = asyncHandler(async (req, res) => {
    const { resourceType = 'auto' } = req.body;

    // Validate resource type (only image and raw for documents)
    const validTypes = ['image', 'raw'];
    if (!validTypes.includes(resourceType)) {
        res.status(400);
        throw new Error(`Invalid resource type. Must be one of: ${validTypes.join(', ')}`);
    }

    try {
        console.log(`[Media Upload] Generating signature for resourceType: ${resourceType}`);

        const signatureData = generateUploadSignature(resourceType, 'chat-media');

        console.log(`[Media Upload] Signature generated successfully for user: ${req.user._id}`);

        res.status(200).json({
            success: true,
            data: signatureData
        });
    } catch (error) {
        console.error('[Media Upload] Error generating upload signature:', error);
        res.status(500);
        throw new Error(error.message || 'Failed to generate upload signature');
    }
});
