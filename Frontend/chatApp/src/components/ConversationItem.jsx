import { ListGroup, Badge } from "react-bootstrap";

const ConversationItem = ({conversation, selected, onClick}) => {

    const other = conversation.other;
    const unreadCount = conversation.unreadCount || 0;

    return (
        <ListGroup.Item
            action
            active={selected}
            onClick={onClick}
            className="py-3"
        >
            <div className="d-flex align-items-center justify-content-between">

                <div className="d-flex align-items-center overflow-hidden flex-grow-1">
                    {/* Avatar */}
                    <div
                        className="rounded-circle text-white d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                        style={{
                            width: "45px",
                            height: "45px",
                            backgroundColor: "#6366f1"
                        }}
                    >
                        {other?.name?.charAt(0).toUpperCase()}
                    </div>

                    {/* User information */}
                    <div className="overflow-hidden flex-grow-1">

                        <div className="fw-bold">
                            {other?.name}
                        </div>

                        <small className="text-muted text-truncate d-block">
                            {conversation.lastMessage?.content || conversation.lastMessage?.type ||
                                "No messages yet"}
                        </small>

                        <small className="text-muted opacity-75">
                            {conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                        </small>

                    </div>
                </div>

                {/* Unread badge */}
                {unreadCount > 0 && (
                    <Badge
                        bg="danger"
                        pill
                        className="ms-2 flex-shrink-0"
                    >
                        {unreadCount}
                    </Badge>
                )}

            </div>
        </ListGroup.Item>
    );
};

export default ConversationItem;