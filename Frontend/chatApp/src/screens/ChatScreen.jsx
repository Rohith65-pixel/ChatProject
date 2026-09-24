import { useEffect, useRef, useState } from "react";
import { Container, Row, Col, Button, ListGroup } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import api from "../api/axios";
import socket from "../socket/socket";
import ConversationItem from "../components/ConversationItem";
import ChatHeader from "../components/ChatHeader";
import MessageBubble from "../components/MessageBubble";
import MessageInput from "../components/MessageInput";
import NewConversationModal from "../components/NewConversationModal";

const ChatScreen = () => {
    const navigate = useNavigate();
    const myInfo = JSON.parse(localStorage.getItem("user") || "{}");

    // Core state
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);

    // Modal state
    const [showNewChat, setShowNewChat] = useState(false);

    // Ref to avoid stale state in socket callbacks
    const selectedConversationRef = useRef(null);
    selectedConversationRef.current = selectedConversation;

    // Ref for auto-scrolling to bottom of messages
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when messages change
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Helper: Sort conversations by latest message timestamp
    const sortByRecent = (list) =>
        [...list].sort(
            (a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
        );

    // Fetch all conversations from server
    const fetchConversations = async () => {
        try {
            const res = await api.get("/conversations");
            const formatted = res.data.map((convo) => {
                const participants = convo.participants || [];
                const other = participants.find((user) => user._id !== myInfo._id) || null;

                return {
                    _id: convo._id,
                    participants,
                    groupName: convo.groupName || null,
                    other,
                    lastMessage: convo.lastMessage,
                    lastMessageAt: convo.lastMessageAt,
                    unreadCount: convo.unreadCount?.[myInfo._id] || 0,
                };
            });

            const sorted = sortByRecent(formatted);
            setConversations(sorted);
            return sorted;
        } catch (err) {
            toast.error("Failed to fetch conversations");
            console.error("Failed to fetch conversations:", err.response?.data || err.message);
            return [];
        }
    };

    // Single unified helper to update any conversation in the list
    const updateConversationInList = (conversationId, patch) => {
        setConversations((prev) => {
            const exists = prev.some((c) => c._id === conversationId);

            // If it's a new conversation not in our list yet, fetch from server
            if (!exists) {
                fetchConversations();
                return prev;
            }

            const updated = prev.map((convo) => {
                if (convo._id !== conversationId) return convo;
                const changes = typeof patch === "function" ? patch(convo) : patch;
                return { ...convo, ...changes };
            });

            return sortByRecent(updated);
        });
    };

    // Socket lifecycle & event listeners
    useEffect(() => {
        fetchConversations();

        // 1. New message event - handles new, edit, and delete
        const handleNewMessage = ({ eventType = "new", message, conversationId, unreadCount, lastMessageAt }) => {
            const currentConvo = selectedConversationRef.current;
            const isForCurrentChat = currentConvo && conversationId === currentConvo._id;
            const senderId = message.senderId?._id ?? message.senderId;
            const isOwn = senderId?.toString() === myInfo._id;

            // For "new" or "edit" of an incoming message in the current chat, mark as read
            if (isForCurrentChat && !isOwn && (eventType === "new" || eventType === "edit")) {
                socket.emit("mark_read", { conversationId });
            }

            if (eventType === "edit" || eventType === "delete") {
                // Replace the message in-place
                if (isForCurrentChat) {
                    setMessages((prev) =>
                        prev.map((m) => m._id === message._id ? message : m)
                    );
                }

                // Update sidebar if lastMessageAt changed (this message was the last one)
                if (lastMessageAt) {
                    updateConversationInList(conversationId, {
                        lastMessage: message,
                        lastMessageAt,
                    });
                }

                return;
            }

            // eventType === "new"
            if (isForCurrentChat) {
                // Append message to current chat window
                setMessages((prev) => {
                    if (prev.some((m) => m._id === message._id)) return prev;
                    return [...prev, message];
                });

                // Update sidebar without unread count
                updateConversationInList(conversationId, {
                    lastMessage: message,
                    lastMessageAt: message.createdAt,
                    unreadCount: 0,
                });
            } else {
                // Update sidebar with unread count (server always includes it)
                updateConversationInList(conversationId, () => ({
                    lastMessage: message,
                    lastMessageAt: message.createdAt,
                    unreadCount: isOwn ? 0 : unreadCount,
                }));
            }
        };

        // 2. Read receipt updates
        const handleMessagesRead = (data) => {
            const currentConvo = selectedConversationRef.current;
            if (currentConvo && data.conversationId === currentConvo._id) {
                const ids = new Set((data.readMessageIds || []).map(String));
                if (ids.size === 0) return;
                setMessages((prev) =>
                    prev.map((msg) =>
                        ids.has(msg._id.toString()) && msg.status !== "read"
                            ? { ...msg, status: "read" }
                            : msg
                    )
                );
            }
        };

        // 3. Delivered receipt updates
        const handleMessagesDelivered = (data) => {
            const currentConvo = selectedConversationRef.current;
            console.log("Delivered event received:", data);
            if (currentConvo && data.conversationId === currentConvo._id) {
                setMessages((prev) =>
                    prev.map((msg) => {
                        const senderId = msg.senderId?._id ?? msg.senderId;
                        const isOwn = senderId?.toString() === myInfo._id;
                        return isOwn && msg.status === "sent"
                            ? { ...msg, status: "delivered" }
                            : msg;
                    })
                );
            }
        };

        const handleMessageError = (err) => {
            toast.error(err?.message || "Failed to send message");
            console.error("Socket message error:", err?.message || err);
        };

        socket.on("new_message", handleNewMessage);
        socket.on("messages_read", handleMessagesRead);
        socket.on("messages_delivered", handleMessagesDelivered);
        socket.on("message_error", handleMessageError);

        if (!socket.connected) {
            socket.connect();
        }

        return () => {
            socket.off("new_message", handleNewMessage);
            socket.off("messages_read", handleMessagesRead);
            socket.off("messages_delivered", handleMessagesDelivered);
            socket.off("message_error", handleMessageError);
        };
    }, []);

    // Actions
    const handleSelectConversation = async (conversation) => {
        try {
            setSelectedConversation(conversation);
            setMessages([]);

            // Clear unread badge locally
            updateConversationInList(conversation._id, { unreadCount: 0 });

            // Mark messages as read on server
            socket.emit("mark_read", { conversationId: conversation._id });

            // Load chat history
            const res = await api.get(`/messages/${conversation._id}`);
            setMessages(res.data);

            // Messages are fetched fresh from the server below
        } catch (err) {
            toast.error("Failed to load messages");
            console.error("Failed to load messages:", err.response?.data || err.message);
        }
    };
    
    const handleCreateConversation = async (newConversation) => {
        const list = await fetchConversations();
        const created = list.find((c) => c._id === newConversation._id);

        if (created) {
            handleSelectConversation(created);
        }
        toast.success("New conversation added!!!");
    };

    const handleSendMessage = (messageData) => {
        if (!selectedConversation) return;

        // Check for @ai prefix to trigger AI assistant
        const isAITrigger = messageData.content?.trim().startsWith("@ai");
        if (isAITrigger) {
            socket.emit("ai_event", {
                conversationId: selectedConversation._id,
                message: messageData.content || "Please assist with this conversation.",
            });
        }

        // messageData can be { content, type: "text" } or { type, mediaUrl, mediaMetadata, content }
        socket.emit("new_message", {
            eventType: "new",
            conversationId: selectedConversation._id,
            content: messageData.content || "",
            type: messageData.type || "text",
            mediaUrl: messageData.mediaUrl || null,
            mediaMetadata: messageData.mediaMetadata || null,
        });
    };

    const handleLogout = async () => {
        try {
            await api.post("/auth/logout");
            toast.success("Logged out successfully");
        }
        catch (err) {
            console.error("Logout error:", err);
        } 
        finally {
            localStorage.removeItem("user");
            socket.disconnect();
            navigate("/login");
        }
    };

    return (
        <Container fluid className="vh-100 p-0 overflow-hidden d-flex flex-column">
            <div className="border-bottom px-3 py-2 d-flex justify-content-between align-items-center flex-shrink-0">
                <h5 className="mb-0">Welcome, {myInfo.name}!</h5>
                <Button variant="outline-danger" size="sm" onClick={handleLogout}>
                    Logout
                </Button>
            </div>

            <Row className="g-0 flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
                {/* Left Sidebar: Conversations */}
                <Col xs={4} md={3} className="border-end d-flex flex-column h-100">
                    <div className="p-3 border-bottom d-flex justify-content-between align-items-center flex-shrink-0">
                        <h5 className="mb-0">Conversations</h5>
                        <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setShowNewChat(true)}
                        >
                            + New
                        </Button>
                    </div>

                    <ListGroup variant="flush" className="flex-grow-1 overflow-auto">
                        {conversations.map((convo) => (
                            <ConversationItem
                                key={convo._id}
                                conversation={convo}
                                selected={selectedConversation?._id === convo._id}
                                onClick={() => handleSelectConversation(convo)}
                            />
                        ))}
                    </ListGroup>
                </Col>

                {/* Right Area: Active Chat */}
                <Col xs={8} md={9} className="d-flex flex-column h-100">
                    {selectedConversation ? (
                        <>
                            <div className="flex-shrink-0">
                                <ChatHeader conversation={selectedConversation} user={selectedConversation.other} />
                            </div>

                            <div
                                className="flex-grow-1 p-3 overflow-auto"
                                style={{ minHeight: 0 }}
                            >
                                {messages.map((msg) => {
                                    const senderId = msg.senderId?._id ?? msg.senderId;
                                    const isOwn = senderId?.toString() === myInfo._id;

                                    return (
                                        <MessageBubble
                                            key={msg._id}
                                            message={msg}
                                            isOwn={isOwn}
                                        />
                                    );
                                })}
                                {/* Scroll anchor */}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="flex-shrink-0">
                                <MessageInput onSendMessage={handleSendMessage} />
                            </div>
                        </>
                    ) : (
                        <div className="h-100 d-flex align-items-center justify-content-center">
                            <h5 className="text-muted">Select a conversation</h5>
                        </div>
                    )}
                </Col>
            </Row>

            <NewConversationModal
                show={showNewChat}
                onHide={() => setShowNewChat(false)}
                onConversationCreated={handleCreateConversation}
            />
        </Container>
    );
};

export default ChatScreen;
