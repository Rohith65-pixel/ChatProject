import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import cloudinary from "../utils/cloudinary.js";

const initializeSocket = (io) => {

    const isUserOnline = (userId) => {
        const room = io.sockets.adapter.rooms.get(userId.toString());
        return room && room.size > 0;
    };

    io.on("connection", async (socket) => {
        console.log(`User connected: ${socket.user.name}`);
        const userIdStr = socket.user._id.toString();

        const getOtherParticipants = (participants) =>
            participants.filter((id) => id.toString() !== userIdStr);

        const ensureUnreadMap = (conversation) => {
            if (!conversation.unreadCount) conversation.unreadCount = new Map();
            return conversation.unreadCount;
        };

        socket.join(userIdStr);

        // On connect: mark pending messages as delivered
        try {
            const conversations = await Conversation.find({ participants: socket.user._id });
            if (conversations.length > 0) {
                const conversationIds = conversations.map((c) => c._id);
                const result = await Message.updateMany(
                    { conversationId: { $in: conversationIds }, senderId: { $ne: socket.user._id }, status: "sent" },
                    { $set: { status: "delivered" } }
                );
                if (result.modifiedCount > 0) {
                    conversations.forEach((conv) => {
                        getOtherParticipants(conv.participants).forEach((pid) => {
                            io.to(pid.toString()).emit("messages_delivered", {
                                conversationId: conv._id.toString(), deliveredTo: socket.user._id
                            });
                        });
                    });
                }
            }
        } 
        catch (err) {
            console.error("Error updating message status on connect:", err);
        }

        // Helper: get status based on recipient online status
        const getStatus = async (conversation) => {
            const others = getOtherParticipants(conversation.participants);
            const online = others.some((id) => isUserOnline(id));
            return online ? "delivered" : "sent";
        };

        // Shared broadcast helper
        const broadcastToConv = (conv, eventType, messageData, extra = {}) => {
            conv.participants.forEach((pid) => {
                io.to(pid.toString()).emit("new_message", {
                    eventType, message: messageData, conversationId: conv._id.toString(), ...extra
                });
            });
        };

        // NEW / EDIT / DELETE via unified new_message event
        socket.on("new_message", async (data) => {
            try {
                const { eventType, messageId, content, conversationId: incomingConvId, type = "text", mediaUrl, mediaMetadata } = data;
                const userId = socket.user._id;

                // --- NEW ---
                if (eventType === "new") {
                    if (!incomingConvId || (!content?.trim() && !mediaUrl)) {
                        return socket.emit("message_error", { message: "Conversation ID and content or media required" });
                    }
                    const conversation = await Conversation.findOne({ _id: incomingConvId, participants: userId });
                    if (!conversation) return socket.emit("message_error", { message: "Conversation not found" });

                    const status = await getStatus(conversation);
                    const message = await Message.create({
                        conversationId: incomingConvId, senderId: userId,
                        content: (content || "").trim(), type: type || "text",
                        mediaUrl: mediaUrl || null,
                        mediaMetadata: mediaMetadata || null,
                        status
                    });
                    await message.populate("senderId", "name email");

                    conversation.lastMessage = message._id;
                    conversation.lastMessageAt = message.createdAt;
                    const unreadMap = ensureUnreadMap(conversation);
                    getOtherParticipants(conversation.participants).forEach((pid) => {
                        const pIdStr = pid.toString();
                        unreadMap.set(pIdStr, (unreadMap.get(pIdStr) || 0) + 1);
                    });
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

                if (eventType === "edit") {
                    if (!content?.trim()) return socket.emit("message_error", { message: "Content required for edit" });
                    message.content = content.trim();
                    message.editedAt = new Date();
                    message.status = await getStatus(conversation);
                } 
                else if (eventType === "delete") {
                    // Delete media from Cloudinary
                    try {
                        const publicId = message.mediaMetadata.publicId;
                        const resourceType = message.mediaMetadata.mediaUrl.includes("/raw/") ? "raw" : "image";
                        // console.log(`[Delete] Deleting from Cloudinary — publicId: "${publicId}", resourceType: "${resourceType}", url: "${message.mediaMetadata.mediaUrl}"`);
                        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
                    }
                    catch (cloudErr) {
                        console.error("Cloudinary delete error:", cloudErr.message);
                    }
                    message.deletedAt = new Date();
                    message.content = "This message was deleted";
                    message.status = await getStatus(conversation);
                } 
                else {
                    return socket.emit("message_error", { message: "Invalid eventType" });
                }

                await message.save();
                await message.populate("senderId", "name email");

                // Update conversation lastMessageAt if this message was the last one
                if (conversation.lastMessage?.toString() === messageId) {
                    conversation.lastMessageAt = message.updatedAt || new Date();
                    await conversation.save();
                    broadcastToConv(conversation, eventType, message, {
                        lastMessageAt: conversation.lastMessageAt,
                    });
                } else {
                    broadcastToConv(conversation, eventType, message);
                }

            } catch (err) {
                console.error("New message error:", err);
                socket.emit("message_error", { message: "Failed to process message" });
            }
        });

        // MARK READ
        socket.on("mark_read", async (data) => {
            try {
                const { conversationId } = data;
                const userId = socket.user._id;

                await Message.updateMany(
                    { conversationId, senderId: { $ne: userId }, status: { $ne: "read" } },
                    { $set: { status: "read" } }
                );

                const conversation = await Conversation.findById(conversationId);
                if (conversation) {
                    getOtherParticipants(conversation.participants).forEach((pid) => {
                        io.to(pid.toString()).emit("messages_read", { conversationId, readBy: userId });
                    });
                    const unreadMap = ensureUnreadMap(conversation);
                    unreadMap.set(userId.toString(), 0);
                    await conversation.save();
                }
            
            } 
            catch (err) {
                console.error("Mark read error:", err);
                socket.emit("message_error", { message: "Failed to mark messages as read" });
            }
        });

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.user.name}`);
        });
    });
};

export default initializeSocket;