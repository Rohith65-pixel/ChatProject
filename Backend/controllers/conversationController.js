import asyncHandler from "express-async-handler";
import Conversation from "../models/conversationModel.js";
import User from "../models/userModel.js";


const populateConversation = (query) =>
    query
        .populate("participants", "name email bio lastSeen")
        .populate("groupAdmin", "name email")
        .populate("lastMessage");


const resolveUsersByEmail = async (emails) => {
    const uniqueEmails = [...new Set(
        emails
            .filter((email) => typeof email === "string")
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean)
    )];

    if (uniqueEmails.length === 0) {
        return [];
    }

    const users = await User.find({
        email: { $in: uniqueEmails }
    });

    if (users.length !== uniqueEmails.length) {
        const found = new Set(users.map((user) => user.email.toLowerCase()));
        const missing = uniqueEmails.filter((email) => !found.has(email));
        const error = new Error(`User(s) not found: ${missing.join(", ")}`);
        error.status = 404;
        throw error;
    }

    return users;
};


const uniqueIdStrings = (ids) => [
    ...new Set(ids.map((id) => id.toString()))
];


const isAdmin = (conversation, userId) =>
    conversation.groupAdmin.some(
        (adminId) => adminId.toString() === userId.toString()
    );


// @desc    Create a 1-to-1 or group conversation
// @route   POST /api/conversations
// @access  Private
// body: { participants: [email, ...], groupName? }
// 2 people total → 1-to-1 (reuses existing). 3+ → group (groupName required).
export const createConversation = asyncHandler(async (req, res) => {

    const currentUserId = req.user._id;
    const { groupName } = req.body;

    const incomingEmails = Array.isArray(req.body.participants)
        ? req.body.participants
        : req.body.email
            ? [req.body.email]
            : [];

    if (incomingEmails.length === 0) {
        res.status(400);
        throw new Error("Participants list is required");
    }

    const otherUsers = await resolveUsersByEmail(incomingEmails);

    const participantIds = uniqueIdStrings([
        currentUserId,
        ...otherUsers.map((user) => user._id)
    ]);

    if (participantIds.length < 2) {
        res.status(400);
        throw new Error("Cannot create conversation with yourself");
    }

    const isGroup = participantIds.length > 2;

    if (isGroup && !groupName?.trim()) {
        res.status(400);
        throw new Error("Group name is required for group chats");
    }

    // Reuse an existing 1-to-1; groups are always created new
    if (!isGroup) {
        const existingConversation = await Conversation.findOne({
            participants: {
                $all: participantIds,
                $size: 2
            }
        });

        if (existingConversation) {
            const populated = await populateConversation(
                Conversation.findById(existingConversation._id)
            );
            return res.status(200).json(populated);
        }
    }

    const conversation = await Conversation.create({
        participants: participantIds,
        groupName: isGroup ? groupName.trim() : null,
        groupAdmin: isGroup ? [currentUserId] : []
    });

    const populated = await populateConversation(
        Conversation.findById(conversation._id)
    );

    res.status(201).json(populated);
});


/* @desc    Get all conversations of logged-in user
@route   GET /api/conversations
@access  Private
*/
export const getConversations = asyncHandler(async (req, res) => {

    const userId = req.user._id;

    const conversations = await populateConversation(
        Conversation.find({
            participants: userId
        }).sort({ lastMessageAt: -1 })
    );

    res.status(200).json(conversations);
});


// @desc    Get a single conversation
// @route   GET /api/conversations/:conversationId
// @access  Private
export const getConversation = asyncHandler(async (req, res) => {

    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await populateConversation(
        Conversation.findOne({
            _id: conversationId,
            participants: userId
        })
    );

    if (!conversation) {
        res.status(404);
        throw new Error("Conversation not found");
    }

    res.status(200).json(conversation);
});


// @desc    Add / remove conversation members
// @route   PATCH /api/conversations/:conversationId/participants
// @access  Private
// body: { add?: [email, ...], remove?: [email, ...], groupName? }
export const updateParticipants = asyncHandler(async (req, res) => {

    const { conversationId } = req.params;
    const currentUserId = req.user._id;
    const { add = [], remove = [], groupName } = req.body;

    const addEmails = Array.isArray(add) ? add : [];
    const removeEmails = Array.isArray(remove) ? remove : [];

    if (addEmails.length === 0 && removeEmails.length === 0) {
        res.status(400);
        throw new Error("Provide members to add and/or remove");
    }

    const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: currentUserId
    });

    if (!conversation) {
        res.status(404);
        throw new Error("Conversation not found");
    }

    const usersToAdd = await resolveUsersByEmail(addEmails);
    const usersToRemove = await resolveUsersByEmail(removeEmails);

    const participantSet = new Set(
        conversation.participants.map((id) => id.toString())
    );
    const adminSet = new Set(
        conversation.groupAdmin.map((id) => id.toString())
    );

    const currentlyGroup = participantSet.size > 2;

    if (usersToAdd.length > 0 && currentlyGroup && !isAdmin(conversation, currentUserId)) {
        res.status(403);
        throw new Error("Only group admins can add members");
    }

    for (const user of usersToAdd) {
        participantSet.add(user._id.toString());
    }

    for (const user of usersToRemove) {
        const targetId = user._id.toString();
        const isSelf = targetId === currentUserId.toString();

        if (!isSelf && !isAdmin(conversation, currentUserId)) {
            res.status(403);
            throw new Error("Only group admins can remove other members");
        }

        if (!participantSet.has(targetId)) {
            continue;
        }

        participantSet.delete(targetId);
        adminSet.delete(targetId);
    }

    const nextParticipants = [...participantSet];

    if (nextParticipants.length < 2) {
        res.status(400);
        throw new Error("A conversation needs at least 2 participants");
    }

    const isGroup = nextParticipants.length > 2;
    const nextGroupName = groupName?.trim() || conversation.groupName;

    if (isGroup && !nextGroupName) {
        res.status(400);
        throw new Error("Group name is required for group chats");
    }

    conversation.participants = nextParticipants;
    conversation.groupName = isGroup ? nextGroupName : null;

    if (isGroup) {
        if (adminSet.size === 0) {
            adminSet.add(currentUserId.toString());
        }
        conversation.groupAdmin = [...adminSet];
    } else {
        conversation.groupAdmin = [];
    }

    await conversation.save();

    const populated = await populateConversation(
        Conversation.findById(conversation._id)
    );

    res.status(200).json(populated);
});
