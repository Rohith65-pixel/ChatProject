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
            });

            const { signature, timestamp, cloudName, apiKey, folder, uploadUrl } =
                signatureRes.data.data;

            if (!signature || !timestamp || !cloudName || !apiKey) {
                throw new Error("Invalid signature data received from server");
            }

            const formData = new FormData();
            formData.append("file", file);
            formData.append("signature", signature);
            formData.append("timestamp", timestamp);
            formData.append("api_key", apiKey);
            formData.append("folder", folder);

            const uploadResponse = await axios.post(uploadUrl, formData);

            if (uploadResponse.status !== 200) {
                throw new Error(
                    uploadResponse.data?.error?.message ||
                        `Upload failed with status ${uploadResponse.status}`
                );
            }

            const uploadData = uploadResponse.data;

            onSendMessage({
                type: messageType,
                mediaUrl: uploadData.secure_url,
                mediaMetadata: {
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type,
                    width: uploadData.width,
                    height: uploadData.height,
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
                        placeholder={uploading ? "Uploading..." : "Type a message..."}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        disabled={uploading}
                        style={{
                            backgroundColor: "#1a1a1a",
                            borderColor: "#333333",
                            color: "#e0e0e0"
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
