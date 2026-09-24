import User from "../models/userModel.js";
import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import { getPublicObjectUrl, deleteObjectFromS3 } from "../utils/s3.js";
import { handleAIEvent } from "./aiSocket.js";

const initializeSocket = (io) => {

    const isUserOnline = (userId) => {
        const room = io.sockets.adapter.rooms.get(userId.toString());
        return room && room.size > 0;
    };

    const participantId = (p) => p._id?.toString() || p.toString();

    const ensureUnreadMap = (conversation) => {
        if (!conversation.unreadCount) conversation.unreadCount = new Map();
        return conversation.unreadCount;
    };

    // Delivered if any recipient (everyone except the sender) is online.
    // senderId is null for AI messages, so all participants are recipients.
    const getStatus = (conversation, senderId = null) => {
        const senderStr = senderId?.toString() || null;
        const recipients = conversation.participants.filter((id) => {
            if (!senderStr) return true;
            return participantId(id) !== senderStr;
        });
        return recipients.some((id) => isUserOnline(id)) ? "delivered" : "sent";
    };

    const incrementUnread = (conversation, senderId = null) => {
        const unreadMap = ensureUnreadMap(conversation);
        const senderStr = senderId?.toString() || null;
        conversation.participants.forEach((pid) => {
            const pIdStr = participantId(pid);
            if (senderStr && pIdStr === senderStr) return;
            unreadMap.set(pIdStr, (unreadMap.get(pIdStr) || 0) + 1);
        });
        return unreadMap;
    };

    const requiredReaderCount = (conversation, senderId) => {
        const senderStr = senderId?.toString() || null;
        return conversation.participants.filter((id) => {
            if (!senderStr) return true;
            return participantId(id) !== senderStr;
        }).length;
    };

    // Per-participant unread so the sidebar badge is never wiped by undefined.
    const broadcastToConv = (conv, eventType, messageData, extra = {}) => {
        const unreadMap = conv.unreadCount;
        conv.participants.forEach((pid) => {
            const pIdStr = participantId(pid);
            io.to(pIdStr).emit("new_message", {
                eventType,
                message: messageData,
                conversationId: conv._id.toString(),
                unreadCount: unreadMap?.get?.(pIdStr) || 0,
                ...extra,
            });
        });
    };

    io.on("connection", async (socket) => {
        console.log(`User connected: ${socket.user.name}`);
        const userIdStr = socket.user._id.toString();

        socket.join(userIdStr);

        handleAIEvent(socket, { getStatus, incrementUnread, broadcastToConv });

        const getOtherParticipants = (participants) =>
            participants.filter((id) => participantId(id) !== userIdStr);

        // On connect: mark pending messages as delivered, then notify only affected conversations
        try {
            const conversations = await Conversation.find({ participants: socket.user._id });

            if (conversations.length > 0) {
                const conversationIds = conversations.map((c) => c._id);

                // 1. Perform update and capture write result
                const updateResult = await Message.updateMany(
                    {
                        conversationId: { $in: conversationIds },
                        senderId: { $ne: socket.user._id },
                        status: "sent",
                    },
                    { $set: { status: "delivered" } }
                );

                // 2. Emit events using existing conversations data if any messages were modified
                if (updateResult.modifiedCount > 0) {
                    conversations.forEach((conv) => {
                        const otherParticipants = getOtherParticipants(conv.participants);

                        otherParticipants.forEach((pid) => {
                            io.to(participantId(pid.toString())).emit("messages_delivered", {
                                deliveredTo: socket.user._id,
                                conversationId: conv._id.toString(),
                            });
                        });
                    });
                }
            }
        }
        catch (err) {
            console.error("Error updating message status on connect:", err);
        }

        // NEW / EDIT / DELETE via unified new_message event
        socket.on("new_message", async (data) => {
            try {
                const {
                    eventType,
                    messageId,
                    content,
                    conversationId: incomingConvId,
                    type = "text",
                    mediaUrl,
                    mediaMetadata,
                } = data;

                const userId = socket.user._id;

                // --- NEW ---
                if (eventType === "new") {
                    if (!incomingConvId || (!content?.trim() && !mediaUrl && !mediaMetadata?.mediaUrl && !mediaMetadata?.s3ObjectKey)) {
                        return socket.emit("message_error", { message: "Conversation ID and content or media required" });
                    }

                    const conversation = await Conversation.findOne({ _id: incomingConvId, participants: userId });
                    if (!conversation) return socket.emit("message_error", { message: "Conversation not found" });

                    // If S3 object key exists, inject a public S3 URL so the client can render immediately
                    let resolvedMediaMetadata = mediaMetadata || null;
                    const s3ObjectKey = mediaMetadata?.s3ObjectKey;
                    if (resolvedMediaMetadata && s3ObjectKey) {
                        resolvedMediaMetadata = {
                            ...resolvedMediaMetadata,
                            mediaUrl: getPublicObjectUrl({ objectKey: s3ObjectKey }),
                        };
                    }

                    const status = getStatus(conversation, userId);
                    const message = await Message.create({
                        conversationId: incomingConvId,
                        senderId: userId,
                        content: (content || "").trim(),
                        type: type || "text",
                        mediaMetadata: resolvedMediaMetadata,
                        status,
                    });

                    await message.populate("senderId", "name email");

                    conversation.lastMessage = message._id;
                    conversation.lastMessageAt = message.createdAt;
                    incrementUnread(conversation, userId);
                    await conversation.save();

                    broadcastToConv(conversation, "new", message);
                    return;
                }

                // EDIT or DELETE: need messageId
                if (!messageId) {
                    return socket.emit("message_error", { message: "Message ID required" });
                }

                const message = await Message.findOne({ _id: messageId, senderId: userId, deletedAt: null });
                if (!message) return socket.emit("message_error", { message: "Message not found or unauthorized" });

                const conversation = await Conversation.findById(message.conversationId);
                if (!conversation) return socket.emit("message_error", { message: "Conversation not found" });

                const s3ObjectKey = message.mediaMetadata?.s3ObjectKey;

                if (eventType === "edit") {
                    if (!content?.trim()) return socket.emit("message_error", { message: "Content required for edit" });
                    message.content = content.trim();
                    message.editedAt = new Date();
                    message.status = getStatus(conversation, userId);
                }
                else if (eventType === "delete") {
                    message.deletedAt = new Date();
                    message.content = "This message was deleted";
                    message.status = getStatus(conversation, userId);
                }
                else {
                    return socket.emit("message_error", { message: "Invalid eventType" });
                }

                await message.save();
                await message.populate("senderId", "name email");

                // Only delete S3 objects after the DB write succeeds
                if (eventType === "delete" && s3ObjectKey) {
                    setImmediate(async () => {
                        try {
                            await deleteObjectFromS3({ objectKey: s3ObjectKey });
                        }
                        catch (s3Err) {
                            console.error("S3 delete error (deferred):", s3Err.message);
                        }
                    });
                }

                // Update conversation lastMessageAt if this message was the last one
                if (conversation.lastMessage?.toString() === messageId) {
                    conversation.lastMessageAt = message.updatedAt || new Date();
                    await conversation.save();
                    broadcastToConv(conversation, eventType, message, {
                        lastMessageAt: conversation.lastMessageAt,
                    });
                }
                else {
                    broadcastToConv(conversation, eventType, message);
                }

            }
            catch (err) {
                console.error("New message error:", err);
                socket.emit("message_error", { message: "Failed to process message" });
            }
        });

        // MARK READ
        socket.on("mark_read", async (data) => {
            try {
                const { conversationId } = data;
                const userId = socket.user._id;

                if (!conversationId) {
                    return socket.emit("message_error", { message: "Conversation ID required" });
                }

                const conversation = await Conversation.findOne({
                    _id: conversationId,
                    participants: userId,
                });
                if (!conversation) return socket.emit("message_error", { message: "Conversation not found" });

                await Message.updateMany(
                    {
                        conversationId,
                        senderId: { $ne: userId },
                        status: { $ne: "read" },
                    },
                    { $addToSet: { readCount: userId } }
                );

                const msgs = await Message.find({
                    conversationId,
                    senderId: { $ne: userId },
                    status: { $ne: "read" },
                }).select("_id senderId readCount");

                const readMessageIds = msgs
                    .filter((msg) => (msg.readCount?.length || 0) >= requiredReaderCount(conversation, msg.senderId))
                    .map((msg) => msg._id);

                if (readMessageIds.length > 0) {
                    await Message.updateMany(
                        { _id: { $in: readMessageIds } },
                        { $set: { status: "read" } }
                    );
                }

                if (readMessageIds.length > 0) {
                    const readMessageIdStrs = readMessageIds.map((id) => id.toString());
                    getOtherParticipants(conversation.participants).forEach((pid) => {
                        io.to(participantId(pid)).emit("messages_read", {
                            conversationId,
                            readBy: userId,
                            readMessageIds: readMessageIdStrs,
                        });
                    });
                }

                const unreadMap = ensureUnreadMap(conversation);
                unreadMap.set(userIdStr, 0);
                await conversation.save();

            } catch (err) {
                console.error("Mark read error:", err);
                socket.emit("message_error", { message: "Failed to mark messages as read" });
            }
        });

        socket.on("check_user_online", (data) => {
            const { userId } = data;
            const online = isUserOnline(userId);
            socket.emit("user_online", { userId, online });
        });

        socket.on("disconnect", async () => {
            console.log(`User disconnected: ${socket.user.name}`);
            try {
                await User.findByIdAndUpdate(socket.user._id, { lastSeen: new Date() });
            }
            catch (e) { 
                console.error("Error updating lastSeen on disconnect:", e);
            }
        });
    });
};

export default initializeSocket;
