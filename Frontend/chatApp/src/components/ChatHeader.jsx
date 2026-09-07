import { useState, useEffect } from "react";
import { Navbar } from "react-bootstrap";
import socket from "../socket/socket";
import api from "../api/axios";

const ChatHeader = ({ user }) => {
    const [online, setOnline] = useState(false);
    const targetId = user?._id?.toString() || user?.id?.toString();
    const [lastSeen, setLastSeen] = useState(null);

    useEffect(() => {
        const send_check = () => socket.emit("check_user_online", { userId: targetId });
        send_check();

        const ref = setInterval(send_check, 5000);
        
        socket.on("user_online", (data) => {
            if (data.userId === targetId) {
                setOnline(data.online);
            }
        })

        return () => {
            clearInterval(ref);
            socket.off("user_online");
        }

    }, [user]);

    useEffect(() => {
        const f1 = async () => {
            if(!online) {
                const res = await api.get(`auth/profile/${targetId}`);
                console.log(res.data)
                setLastSeen(res.data.details.lastSeen);
            }
        }
        f1();
    }, [online,user]);

    return (
        <Navbar className="border-bottom px-3">
            <div>
                <div className="fw-bold d-flex align-items-center gap-2">
                    {user?.name}
                    <span style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block", backgroundColor: online ? "#22c55e" : "#666" }} />
                </div>
                <small className="text-muted">{online ? "Online" : lastSeen ? (`Last seen ${new Date(lastSeen).toLocaleString()}` ) : "Offline"} — {user?.bio || user?.email}</small>
            </div>
        </Navbar>
    );
};
export default ChatHeader;
