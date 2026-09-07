import { useState, useRef, useEffect } from "react";
import { Button, Alert } from "react-bootstrap";
import { FaPaperclip, FaTimes } from "react-icons/fa";
import api from "../api/axios";
import axios from "axios";

const MediaUpload = ({ onMediaSelect, onCancel, openOnMount }) => {
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (openOnMount) fileInputRef.current?.click();
    }, [openOnMount]);

    const getFileInfo = (mime) => {
        if (mime.startsWith("image/")) return { resourceType: "image", type: "image" };
        if (mime.startsWith("video/")) return { resourceType: "video", type: "video" };
        return { resourceType: "raw", type: "file" };
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setError(null);
        setSelectedFile(file);
        if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        setError(null);

        try {
            const { resourceType, type } = getFileInfo(selectedFile.type);
            const { data } = await api.post("/media/upload-signature", { resourceType });
            const { signature, timestamp, apiKey, folder, uploadUrl } = data.data;

            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("signature", signature);
            formData.append("timestamp", timestamp);
            formData.append("api_key", apiKey);
            formData.append("folder", folder);

            console.log('in MediaUpload.jsx: Uploading file to Cloudinary with the following details:')

            const res = await axios.post(uploadUrl, formData);

            onMediaSelect({
                type,
                mediaUrl: res.data.secure_url,
                mediaMetadata: {
                    fileName: selectedFile.name,
                    fileSize: selectedFile.size,
                    mimeType: selectedFile.type,
                    width: res.data.width || null,
                    height: res.data.height || null,
                    publicId: res.data.public_id,
                },
            });

            if (preview) URL.revokeObjectURL(preview);
            setSelectedFile(null);
            setPreview(null);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error?.message || err.message || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleCancel = () => {
        if (preview) URL.revokeObjectURL(preview);
        setSelectedFile(null);
        setPreview(null);
        setError(null);
        onCancel();
    };

    return (
        <div className="border rounded p-3 mb-2 bg-dark text-light border-secondary">
            <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileSelect} />

            {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-2 py-1">
                    {error}
                </Alert>
            )}

            {!selectedFile ? (
                <div className="d-flex gap-2">
                    <Button variant="outline-primary" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <FaPaperclip className="me-1" /> Attach File
                    </Button>
                    <Button variant="outline-secondary" size="sm" onClick={handleCancel}>
                        <FaTimes />
                    </Button>
                </div>
            ) : (
                <div>
                    <div className="mb-2 text-truncate">
                        <strong>Selected:</strong> {selectedFile.name} ({(selectedFile.size / 1048576).toFixed(2)} MB)
                    </div>

                    {preview && (
                        <div className="mb-2 border rounded p-2 bg-dark-subtle d-inline-block">
                            {selectedFile.type.startsWith("image/") ? (
                                <img src={preview} alt="Preview" style={{ maxWidth: "200px", maxHeight: "200px" }} className="rounded" />
                            ) : (
                                <video src={preview} style={{ maxWidth: "200px", maxHeight: "200px" }} className="rounded" controls />
                            )}
                        </div>
                    )}

                    <div className="d-flex gap-2">
                        <Button variant="primary" size="sm" onClick={handleUpload} disabled={uploading}>
                            {uploading ? "Uploading..." : "Send"}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={handleCancel} disabled={uploading}>
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaUpload;
