import { useEffect, useState } from "react";
import { Navbar } from "react-bootstrap";

import socket from "../socket/socket";
import api from "../api/axios";

const ChatHeader = ({ conversation, user }) => {
    const participants = conversation?.participants || [];
    const isGroupChat = participants.length > 2;

    const targetId = isGroupChat
        ? null
        : user?._id?.toString() || user?.id?.toString() || null;

    const [online, setOnline] = useState(false);
    const [lastSeen, setLastSeen] = useState(null);

    useEffect(() => {
        if (isGroupChat || !targetId) return;

        const handleUserOnline = (data) => {
            if (data?.userId?.toString() === targetId) {
                setOnline(data.online);
            }
        };

        socket.on("user_online", handleUserOnline);

        const send_check = () => {
            socket.emit("check_user_online", { userId: targetId });
        };

        send_check();
        const ref = setInterval(send_check, 5000);

        return () => {
            clearInterval(ref);
            socket.off("user_online", handleUserOnline);
        };
    }, [isGroupChat, targetId]);

    useEffect(() => {
        if (isGroupChat || !targetId) return;

        const fetchLastSeenIfNeeded = async () => {
            if (online) return;
            try {
                const res = await api.get(`auth/profile/${targetId}`);
                setLastSeen(res.data?.details?.lastSeen || null);
            } catch {
                setLastSeen(null);
            }
        };

        fetchLastSeenIfNeeded();
    }, [isGroupChat, online, targetId]);

    const title = isGroupChat
        ? conversation?.groupName || `Group (${participants.length} members)`
        : user?.name || "Chat";

    const subtitle = isGroupChat
        ? `${participants.length} members`
        : online
            ? "Online"
            : lastSeen
                ? `Last seen ${new Date(lastSeen).toLocaleString()}`
                : "Offline";

    const dotColor = isGroupChat
        ? "#6366f1"
        : online
            ? "#22c55e"
            : "#666";

    return (
        <Navbar className="border-bottom px-3">
            <div>
                <div className="fw-bold d-flex align-items-center gap-2">
                    {title}
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            display: "inline-block",
                            backgroundColor: dotColor,
                        }}
                        aria-hidden="true"
                    />
                </div>

                <small className="text-muted">
                    {isGroupChat
                        ? subtitle
                        : `${subtitle} — ${user?.bio || user?.email}`}
                </small>
            </div>
        </Navbar>
    );
};

export default ChatHeader;
