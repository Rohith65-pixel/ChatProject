import Message from "../models/messageModel.js";
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { SystemMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";

// Declare first — used in the prompt template below
export const SYSTEM_PROMPT = `You are a helpful AI assistant in a chat app.
Answer ONLY using the provided chat history. Do not invent facts not present in the history. Keep responses concise and direct. If the history doesn't contain the answer, say so briefly.`;

const model = new ChatGroq({
  model: "openai/gpt-oss-20b",
  temperature: 0.0,
  apiKey: process.env.GROQ_API_KEY,
});

const prompt = ChatPromptTemplate.fromMessages([
  new SystemMessage(SYSTEM_PROMPT),
  new MessagesPlaceholder("history"),
  ["human", "{input}"],
]);

export const chain = prompt.pipe(model).pipe(new StringOutputParser());

export async function getConversationContext(conversationId, limit = 30) {
  const msgs = await Message.find({ conversationId, deletedAt: null })
    .populate("senderId", "name") // Populates user's name
    .sort({ createdAt: -1 })
    .limit(limit);
    
  return msgs.reverse();
}
