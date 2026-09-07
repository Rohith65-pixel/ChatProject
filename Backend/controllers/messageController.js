import asyncHandler from "express-async-handler";
import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";


export const createMessage = asyncHandler(async (req, res) => {

    const { conversationId, content, type = "text", mediaUrl, mediaMetadata } = req.body;

    if (!conversationId || (!content?.trim() && !mediaUrl)) {
        res.status(400);
        throw new Error("Conversation ID and content or media are required");
    }

    const conversation = await Conversation.findById(
        conversationId
    );

    if (!conversation) {
        res.status(404);
        throw new Error("Conversation not found");
    }

    // Make sure current user belongs to conversation
    const isParticipant = conversation.participants.some(
        (id) => id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
        res.status(403);
        throw new Error("You are not part of this conversation");
    }

    // Create message with media support
    const message = await Message.create({
        conversationId,
        senderId: req.user._id,
        content: content?.trim() || "",
        type: type || "text",
        mediaUrl: mediaUrl || null,
        mediaMetadata: mediaMetadata || null
    });

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;

    await conversation.save();

    res.status(201).json(message);
});

// @desc    Get messages of a conversation
// @route   GET /api/messages/:conversationId
// @access  Private
export const getMessages = asyncHandler(async (req, res) => {

    const { conversationId } = req.params;
    const userId = req.user._id;

    // Make sure user belongs to this conversation
    const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId
    });

    if (!conversation) {
        res.status(404);
        throw new Error("Conversation not found");
    }

    const limit = Math.min(
        parseInt(req.query.limit) || 50,
        100
    );

    const messages = await Message.find({
        conversationId,
    })
        .populate("senderId", "name email")
        .sort({ createdAt: 1 })
        .limit(limit);

    res.status(200).json(messages);
});


// @desc    Edit a message
// @route   PATCH /api/v1/messages/:messageId
// @access  Private
export const editMessage = asyncHandler(async (req, res) => {

    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    // Validate content
    if (!content || !content.trim()) {
        res.status(400);
        throw new Error("Message content is required");
    }

    // Find message belonging to current user
    const message = await Message.findOne({
        _id: messageId,
        senderId: userId,
        deletedAt: null
    });

    if (!message) {
        res.status(404);
        throw new Error("Message not found or unauthorized");
    }

    message.content = content.trim();
    message.editedAt = new Date();
    message.status = "sent";

    await message.save();

    res.status(200).json(message);
});


// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
export const deleteMessage = asyncHandler(async (req, res) => {

    const { messageId } = req.params;
    const userId = req.user._id;

    // Find message belonging to current user
    const message = await Message.findOne({
        _id: messageId,
        senderId: userId,
        deletedAt: null
    });

    if (!message) {
        res.status(404);
        throw new Error("Message not found or unauthorized");
    }

    // Soft delete
    message.deletedAt = new Date();
    message.content = "This message was deleted";

    await message.save();

    res.status(200).json(message);
});
