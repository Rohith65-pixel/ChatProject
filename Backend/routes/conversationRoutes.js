import express from "express";
import {protect} from "../middleware/authMiddleware.js";
import {
    createConversation,
    getConversations,
    getConversation,
    updateParticipants
} from "../controllers/conversationController.js";

const conversationRouter = express.Router();

conversationRouter.use(protect);

conversationRouter.post("/",createConversation);
conversationRouter.get("/",getConversations);
conversationRouter.get("/:conversationId",getConversation);
conversationRouter.patch("/:conversationId/participants",updateParticipants);

export default conversationRouter;
