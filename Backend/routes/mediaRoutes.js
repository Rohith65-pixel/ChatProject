import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getUploadSignature, getDownloadUrl } from "../controllers/mediaController.js";

const mediaRouter = express.Router();

// All media routes require authentication
mediaRouter.use(protect);

// Get signed upload URL for client-side upload
mediaRouter.post("/upload-signature", getUploadSignature);

// Get a short-lived signed GET URL that forces a file download
mediaRouter.get("/download/:messageId", getDownloadUrl);

export default mediaRouter;
