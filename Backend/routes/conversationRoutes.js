import express from "express";
import {protect} from "../middleware/authMiddleware.js";
import {
    createConversation,
    getConversations,
    getConversation
} from "../controllers/conversationController.js";

const conversationRouter = express.Router();

conversationRouter.use(protect);

conversationRouter.post("/",createConversation);
conversationRouter.get("/",getConversations);
conversationRouter.get("/:conversationId",getConversation);

export default conversationRouter;