import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { getConversationContext, chain } from "../utils/aiUtils.js";
import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";

/**
 * Formats messages into context tags along with the sender's identity.
 */
function formatMessageContent(msg) {
  const senderName = msg.senderId?.name || "AI";

  switch (msg.type) {
    case "image":
      return `${senderName}: [Attached Image: ${msg.mediaMetadata?.fileName || "image"}]`;

    case "file":
      return `${senderName}: [Attached File: ${msg.mediaMetadata?.fileName || "file"}]`;

    case "text":
    default:
      return `${senderName}: ${msg.content || ""}`;
  }
}

/**
 * AI Socket Event Handler
 * Generates AI reply, persists it to DB, and broadcasts it to all participants.
 */
export function handleAIEvent(socket, { getStatus, incrementUnread, broadcastToConv }) {
  socket.on("ai_event", async (data) => {
    try {
      const { message, conversationId } = data;

      if (!conversationId) {
        return socket.emit("message_error", { message: "Conversation ID required" });
      }

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: socket.user._id,
      });
      if (!conversation) {
        return socket.emit("message_error", { message: "Conversation not found or unauthorized" });
      }

      const contextMessages = await getConversationContext(conversationId, 30);

      const langChainHistory = contextMessages.map((m) =>
        m.senderId
          ? new HumanMessage(formatMessageContent(m))
          : new AIMessage(formatMessageContent(m))
      );

      const reply = await chain.invoke({
        history: langChainHistory,
        input: message,
      });

      const aiMessage = await Message.create({
        conversationId,
        senderId: null,
        content: reply,
        type: "text",
        status: getStatus(conversation, null),
      });

      conversation.lastMessage = aiMessage._id;
      conversation.lastMessageAt = aiMessage.createdAt;
      incrementUnread(conversation, null);
      await conversation.save();

      broadcastToConv(conversation, "new", aiMessage);
    } catch (err) {
      console.error("ai_event error:", err.message);
      socket.emit("message_error", { message: "Failed to generate AI reply" });
    }
  });
}
