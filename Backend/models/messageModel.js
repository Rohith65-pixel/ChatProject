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

      // For S3 private bucket (persistent identifier)
      s3ObjectKey: String,

      // Signed/usable URL for rendering (ephemeral; generated at runtime)
      mediaUrl: String,
    },

    readCount: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
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
