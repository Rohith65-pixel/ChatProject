import express from "express";
import {protect} from "../middleware/authMiddleware.js";

import {
    getMessages,
    editMessage,
    deleteMessage,createMessage
} from "../controllers/messageController.js";

const messageRouter = express.Router();
messageRouter.use(protect);

messageRouter.post("/", createMessage);
messageRouter.get("/:conversationId",getMessages);
messageRouter.put("/:messageId",editMessage);
messageRouter.delete("/:messageId",deleteMessage);

export default messageRouter;