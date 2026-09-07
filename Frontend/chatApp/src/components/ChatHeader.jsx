import { Navbar } from "react-bootstrap";

const ChatHeader = ({ user }) => {

    return (
        <Navbar className="border-bottom px-3">

            <div>

                <div className="fw-bold">
                    {user?.name}
                </div>

                <small className="text-muted">
                    {user?.email}
                </small>

            </div>

        </Navbar>
    );
};

export default ChatHeader;