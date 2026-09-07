import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    lastMessageAt: {
      type: Date,
      default: null,
    },

    // Track unread count per participant
    unreadCount: {
      type: Map,
      of: Number,
      default: new Map(),
    },
  },
  {
    timestamps: true,
  }
);

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;

// {
//   "_id": "65abc123",
//   "participants": [
//     "USER_A",
//     "USER_B"
//   ],
//   "lastMessage": "65msg999",
//   "lastMessageAt": "2026-08-28T14:30:00Z",
//   "createdAt": "2026-08-28T12:00:00Z",
//   "updatedAt": "2026-08-28T14:30:00Z"
// }