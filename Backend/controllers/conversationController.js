import asyncHandler from "express-async-handler";
import Conversation from "../models/conversationModel.js";
import User from "../models/userModel.js";


// @desc    Create a new 1-to-1 conversation
// @route   POST /api/conversations
// @access  Private
export const createConversation = asyncHandler(async (req, res) => {

    const currentUserId = req.user._id;

    const { email } = req.body;

    if (!email) {
        res.status(400);
        throw new Error("Email is required");
    }

    // Find the other user
    const otherUser = await User.findOne({ email });

    if (!otherUser) {
        res.status(404);
        throw new Error("User not found");
    }

    // Don't allow conversation with yourself
    if (currentUserId.toString() === otherUser._id.toString()) {
        res.status(400);
        throw new Error("Cannot create conversation with yourself");
    }

    // Check if conversation already exists
    const existingConversation =
        await Conversation.findOne({
            participants: {
                $all: [
                    currentUserId,
                    otherUser._id
                ]
            }
        });

    if (existingConversation) {
        return res.status(200).json(existingConversation);
    }

    // Create conversation
    const conversation =
        await Conversation.create({
            participants: [
                currentUserId,
                otherUser._id
            ]
        });

    res.status(201).json(conversation);
});

// @desc    Get all conversations of logged-in user
// @route   GET /api/conversations
// @access  Private
export const getConversations = asyncHandler(async (req, res) => {

    const userId = req.user._id;

    const conversations = await Conversation.find({
        participants: userId
    })
        .populate("participants", "name email bio lastSeen")
        .populate("lastMessage")
        .sort({ lastMessageAt: -1 });

    res.status(200).json(conversations);
});


// @desc    Get a single conversation
// @route   GET /api/conversations/:conversationId
// @access  Private
export const getConversation = asyncHandler(async (req, res) => {

    const { conversationId } = req.params;
    const userId = req.user._id;

    // Find conversation only if user is a participant
    const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId
    })
        .populate("participants", "name email bio lastSeen")
        .populate("lastMessage");

    if (!conversation) {
        res.status(404);
        throw new Error("Conversation not found");
    }

    res.status(200).json(conversation);
});
