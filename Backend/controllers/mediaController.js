import asyncHandler from "express-async-handler";
import mime from "mime-types";
import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import { generateObjectKey, getSignedUploadUrl, getSignedDownloadUrl } from "../utils/s3.js";

/**
 * @desc    Get signed upload URL for media upload (client uploads directly to S3)
 * @route   POST /api/media/upload-signature
 * @access  Private
 */
export const getUploadSignature = asyncHandler(async (req, res) => {
    const { resourceType, fileName, mimeType: browserMimeType } = req.body;

    // Prefer backend-determined mime type from filename; fall back to the browser.
    const lookedUpMimeType = fileName ? mime.lookup(fileName) : null;
    const resolvedMimeType = lookedUpMimeType || browserMimeType;

    // Validate resource type (only image and raw for documents)
    const validTypes = ["image", "raw"];
    if (!validTypes.includes(resourceType)) {
        res.status(400);
        throw new Error(
            `Invalid resource type. Must be one of: ${validTypes.join(", ")}`
        );
    }

    if (!fileName || typeof fileName !== "string") {
        res.status(400);
        throw new Error("fileName is required");
    }

    if (!resolvedMimeType || typeof resolvedMimeType !== "string") {
        res.status(400);
        throw new Error("mimeType is required (could not be inferred from fileName)");
    }

    // Basic sanity check for images
    if (resourceType === "image" && !resolvedMimeType.startsWith("image/")) {
        res.status(400);
        throw new Error("Invalid mimeType for resourceType=image");
    }

    const expiresIn = parseInt(
        process.env.S3_UPLOAD_PRESIGNED_TTL_SECONDS || "900",
        10
    );

    try {
        const objectKey = generateObjectKey({
            userId: req.user._id.toString(),
            fileName,
        });

        const { uploadUrl } = await getSignedUploadUrl({
            objectKey,
            mimeType: resolvedMimeType,
            expiresIn,
        });

        res.status(200).json({
            success: true,
            data: {
                uploadUrl,
                objectKey,
                mimeType: resolvedMimeType,
                expiresIn,
            },
        });
    } catch (error) {
        console.error("[Media Upload] Error generating upload URL:", error);
        res.status(500);
        throw new Error(error.message || "Failed to generate upload signature");
    }
});

/**
 * @desc    Get a short-lived signed GET URL that forces a file download
 * @route   GET /api/media/download/:messageId
 * @access  Private
 */
export const getDownloadUrl = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message || message.deletedAt) {
        res.status(404);
        throw new Error("Message not found");
    }

    const conversation = await Conversation.findOne({
        _id: message.conversationId,
        participants: userId,
    });
    if (!conversation) {
        res.status(403);
        throw new Error("You are not part of this conversation");
    }

    const objectKey = message.mediaMetadata?.s3ObjectKey;
    if (!objectKey) {
        res.status(400);
        throw new Error("This message has no downloadable media");
    }

    const expiresIn = parseInt(
        process.env.S3_SIGNED_GET_TTL_SECONDS || "60",
        10
    );

    const { downloadUrl } = await getSignedDownloadUrl({
        objectKey,
        fileName: message.mediaMetadata?.fileName || "download",
        mimeType: message.mediaMetadata?.mimeType,
        expiresIn,
    });

    res.status(200).json({
        success: true,
        data: {
            downloadUrl,
            fileName: message.mediaMetadata?.fileName || "download",
            expiresIn,
        },
    });
});
