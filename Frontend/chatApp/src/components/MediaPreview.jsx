import { useState } from "react";
import { FaDownload, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFile } from "react-icons/fa";
import { Button } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../api/axios";

const MediaPreview = ({ message }) => {
    const { type, mediaMetadata } = message;
    const [downloading, setDownloading] = useState(false);

    const mediaUrl = mediaMetadata?.mediaUrl;

    if (!mediaUrl) return null;

    const getFileIcon = (mimeType) => {
        if (!mimeType) return <FaFile size={40} />;
        if (mimeType.includes("pdf")) return <FaFilePdf size={40} style={{ color: "#e53e3e" }} />;
        if (mimeType.includes("word") || mimeType.includes("document")) return <FaFileWord size={40} style={{ color: "#2b6cb0" }} />;
        if (mimeType.includes("excel") || mimeType.includes("sheet")) return <FaFileExcel size={40} style={{ color: "#38a169" }} />;
        if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return <FaFilePowerpoint size={40} style={{ color: "#d69e2e" }} />;
        return <FaFile size={40} />;
    };

    const handleDownload = async () => {
        if (!message?._id || downloading) return;

        setDownloading(true);
        try {
            // Browsers ignore <a download> on cross-origin URLs, so the public
            // S3 link just opens the file. A signed GET with
            // Content-Disposition: attachment forces a real download.
            const res = await api.get(`/media/download/${message._id}`);
            const { downloadUrl, fileName } = res.data.data || {};
            if (!downloadUrl) throw new Error("No download URL returned");

            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = fileName || mediaMetadata?.fileName || "download";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Download error:", err);
            toast.error(err.response?.data?.message || "Failed to download file");
        } finally {
            setDownloading(false);
        }
    };


    // Image Preview
    if (type === "image") {
        return (
            <div className="media-preview">
                <img
                    src={mediaUrl}
                    alt={mediaMetadata?.fileName || "Image"}
                    style={{
                        maxWidth: "100%",
                        maxHeight: "400px",
                        borderRadius: "8px",
                        cursor: "pointer",
                    }}
                    onClick={() => window.open(mediaUrl, "_blank")}
                />
                <div className="mt-2">
                    <Button
                        variant="link"
                        size="sm"
                        onClick={handleDownload}
                        disabled={downloading}
                        className="text-light"
                    >
                        <FaDownload className="me-1" />
                        {downloading ? "Downloading..." : "Download"}
                    </Button>
                    {mediaMetadata?.fileName && (
                        <small className="text-light ms-2 opacity-75">
                            {mediaMetadata.fileName}
                        </small>
                    )}
                </div>
            </div>
        );
    }


    // File/Document Preview
    if (type === "file") {
        return (
            <div className="media-preview">
                <div
                    className="d-flex align-items-center gap-3 p-3 border rounded bg-dark-subtle text-light"
                >
                    <div className="flex-shrink-0">
                        {getFileIcon(mediaMetadata?.mimeType)}
                    </div>
                    <div className="flex-grow-1 overflow-hidden">
                        <div className="fw-bold text-truncate">
                            {mediaMetadata?.fileName || "File"}
                        </div>
                        {mediaMetadata?.fileSize && (
                            <small className="text-light opacity-75">
                                {(mediaMetadata.fileSize / 1024 / 1024).toFixed(2)} MB
                            </small>
                        )}
                    </div>
                    <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={handleDownload}
                        disabled={downloading}
                        title={downloading ? "Downloading..." : "Download"}
                    >
                        <FaDownload />
                    </Button>
                </div>
            </div>
        );
    }

    return null;
};

export default MediaPreview;
