import { FaDownload, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFile } from "react-icons/fa";
import { Button } from "react-bootstrap";

const MediaPreview = ({ message }) => {
    const { type, mediaMetadata } = message;

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
        // Fetch as blob and trigger download via object URL — avoids cross-origin restriction
        try {
        const response = await fetch(mediaUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = mediaMetadata?.fileName || "download";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        }
        catch(err) {
            console.error("Download failed:", err);
            // Fallback: open in new tab if blob fetch fails (e.g. CORS)
            window.open(mediaUrl, "_blank");
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
                    <Button variant="link" size="sm" onClick={handleDownload} className="text-light">
                        <FaDownload className="me-1" />
                        Download
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
