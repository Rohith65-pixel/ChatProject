import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getUploadSignature } from "../controllers/mediaController.js";

const mediaRouter = express.Router();

// All media routes require authentication
mediaRouter.use(protect);

// Get signed upload URL for client-side upload
mediaRouter.post("/upload-signature", getUploadSignature);

export default mediaRouter;
