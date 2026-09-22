import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    content: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },

    type: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },

    mediaMetadata: {
      fileName: String,
      fileSize: Number,
      mimeType: String,
      width: Number,    // For images
      height: Number,
      mediaUrl: String,
      publicId: String,
    },

    readCount: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },

    editedAt: {
      type: Date,
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messageSchema);
export default Message;

// {
//   "_id": "65msg999",
//   "conversationId": "65abc123",
//   "senderId": "USER_A",
//   "content": "Hey Rahul!",
//   "type": "text",
//   "status": "read",
//   "editedAt": null,
//   "deletedAt": null,
//   "createdAt": "2026-08-28T14:30:00Z",
//   "updatedAt": "2026-08-28T14:30:00Z"
// }