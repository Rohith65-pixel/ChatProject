import { useState, useRef } from "react";
import { Form, InputGroup, Button } from "react-bootstrap";
import { FaPaperclip } from "react-icons/fa";
import axios from "axios";
import api from "../api/axios";

const MessageInput = ({ onSendMessage }) => {
    const [text, setText] = useState("");
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const classifyMimeType = (mimeType) => {
        if (mimeType && mimeType.startsWith("image/")) {
            return { resourceType: "image", messageType: "image" };
        }
        return { resourceType: "raw", messageType: "file" };
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim()) return;

        // If text starts with @ai, send as regular message (ChatScreen handles AI trigger)
        onSendMessage({ content: text.trim(), type: "text" });
        setText("");
    };

    const handlePaperclipClick = () => {
        // Directly open the OS file picker — no modal
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset the input so the same file can be picked again later
        e.target.value = "";

        setError(null);
        setUploading(true);

        try {
            const { resourceType, messageType } = classifyMimeType(file.type);

            const signatureRes = await api.post("/media/upload-signature", {
                resourceType,
                fileName: file.name,
                mimeType: file.type,
                fileSize: file.size,
            });

            const { uploadUrl, objectKey, mimeType } = signatureRes.data.data;

            if (!uploadUrl || !objectKey) {
                throw new Error("Invalid upload URL data received from server");
            }

            const uploadResponse = await axios.put(uploadUrl, file, {
                headers: {
                    "Content-Type": mimeType || file.type,
                },
            });

            // For pre-signed PUT, success typically means 200.
            if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
                throw new Error(`Upload failed with status ${uploadResponse.status}`);
            }

            onSendMessage({
                type: messageType,
                mediaUrl: null,
                mediaMetadata: {
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type,
                    s3ObjectKey: objectKey,
                },
                content: text.trim() || "",
            });

            setText("");
        } catch (err) {
            console.error("Upload error:", err);
            setError(err.message || "Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            {error && (
                <div className="alert alert-danger mx-3 mt-2 mb-0 py-2 small" role="alert">
                    {error}
                </div>
            )}

            <Form onSubmit={handleSubmit}>
                <InputGroup className="p-3 border-top">
                    {/* Hidden file input — triggered directly by the paperclip button */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        style={{ display: "none" }}
                        onChange={handleFileSelected}
                    />

                    <Button
                        variant="outline-secondary"
                        onClick={handlePaperclipClick}
                        disabled={uploading}
                        title="Attach media"
                    >
                        <FaPaperclip />
                    </Button>

                    <Form.Control
                        type="text"
                        placeholder={uploading ? "Uploading..." : "To use AI, start your message with @ai and start typing"}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        disabled={uploading}
                        style={{
                            backgroundColor: "#1a1a1a",
                            borderColor: "#333333",
                            color: "#e0e0e0",
                        }}
                    />
                    <Button type="submit" variant="primary" disabled={uploading}>
                        Send
                    </Button>
                </InputGroup>
            </Form>
        </div>
    );
};

export default MessageInput;
