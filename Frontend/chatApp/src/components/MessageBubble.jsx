import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { toast } from "react-toastify";
import socket from "../socket/socket";
import MediaPreview from "./MediaPreview";

const MessageBubble = ({ message, isOwn }) => {

    const [editing, setEditing] = useState(false);
    const [content, setContent] = useState(message.content);

    const handleEdit = () => {

        if (!content.trim()) {
            toast.warning("Message cannot be empty");
            return;
        }

        socket.emit("new_message", {
            eventType: "edit",
            messageId: message._id,
            content: content.trim(),
            conversationId: message.conversationId?._id ?? message.conversationId,
        });

        setEditing(false);
    };

    const handleDelete = () => {
        socket.emit("new_message", {
            eventType: "delete",
            messageId: message._id,
            conversationId: message.conversationId?._id ?? message.conversationId,
        });
    };


    return (
        <div
            className={`d-flex mb-3 ${
                isOwn
                    ? "justify-content-end"
                    : "justify-content-start"
            }`}
        >

            <div style={{ maxWidth: "70%" }}>

                {/* Message bubble */}

                <div
                    className={`px-3 py-2 rounded ${
                        isOwn ? "bg-own-dark" : "bg-other-dark"
                    }`}
                    style={isOwn ? {
                        backgroundColor: "#1a3d1a",
                        color: "#f0f0f0"
                    } : {
                        backgroundColor: "#2d2d2d",
                        color: "#e5e5e5"
                    }}
                >

                    {editing ? (

                        <Form.Control
                            autoFocus
                            value={content}
                            onChange={(e) =>
                                setContent(e.target.value)
                            }
                            onKeyDown={(e) => {

                                if (e.key === "Enter") {
                                    handleEdit();
                                }

                                if (e.key === "Escape") {
                                    setEditing(false);
                                    setContent(
                                        message.content
                                    );
                                }

                            }}
                        />

                    ) : (

                        <>
                            {message.deletedAt ? (
                                <i>Message deleted</i>
                            ) : (
                                <>
                                    {/* Media Preview for image, video, audio */}
                                    {message.type !== "text" &&  message.mediaMetadata?.mediaUrl && (
                                        <div className="mb-2">
                                            <MediaPreview message={message} />
                                        </div>
                                    )}

                                    {/* Text content (if any) */}
                                    {message.content && message.content.trim() && (
                                        <div>{message.content}</div>
                                    )}
                                </>
                            )}

                            {message.editedAt &&
                                !message.deletedAt && (
                                    <small className="ms-2 opacity-75">
                                        edited
                                    </small>
                                )
                            }

                            {/* Message status indicator (only for own messages) */}
                            {isOwn && !message.deletedAt && (
                                <span className="ms-2" style={{ fontSize: "0.9rem", fontWeight: "bold" }}>
                                    {message.status === "sent" && (
                                        <span style={{ opacity: 0.7 }}>✓</span>
                                    )}
                                    {message.status === "delivered" && (
                                        <span style={{ opacity: 0.7 }}>✓✓</span>
                                    )}
                                    {message.status === "read" && (
                                        <span style={{ color: "#1a6ff8" }}>✓✓</span>
                                    )}
                                </span>
                            )}
                        </>

                    )}

                </div>


                {/* Edit/Delete */}

                {isOwn &&
                    !message.deletedAt &&
                    !editing && (

                    <div className="mt-1">
                        {
                            message.type === "text" && (
                            <Button
                            variant="link"
                            size="sm"
                            className="p-0 me-2"
                            onClick={() =>
                                setEditing(true)
                            }
                        >
                            Edit
                        </Button>)
                        }

                        <Button
                            variant="link"
                            size="sm"
                            className="p-0 text-danger"
                            onClick={handleDelete}
                        >
                            Delete
                        </Button>

                    </div>
                )}


                {/* Save / Cancel */}

                {editing && (

                    <div className="mt-1">

                        <Button
                            size="sm"
                            variant="success"
                            className="me-2"
                            onClick={handleEdit}
                        >
                            Save
                        </Button>

                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                                setEditing(false);
                                setContent(
                                    message.content
                                );
                            }}
                        >
                            Cancel
                        </Button>

                    </div>
                )}

            </div>

        </div>
    );
};

export default MessageBubble;