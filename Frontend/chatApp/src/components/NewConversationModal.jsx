import { useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../api/axios";

const normalizeEmail = (email) => email.trim().toLowerCase();

const NewConversationModal = ({ show, onHide, onConversationCreated }) => {
    const [emailInput, setEmailInput] = useState("");
    const [participants, setParticipants] = useState([]); // other users' emails
    const [groupName, setGroupName] = useState("");
    const [loading, setLoading] = useState(false);

    const isGroupChat = participants.length + 1 > 2; // +1 for the current user

    const handleAddParticipant = () => {
        const normalized = normalizeEmail(emailInput);

        if (!normalized) return;

        if (participants.includes(normalized)) {
            toast.info("Participant already added");
            return;
        }

        setParticipants((prev) => [...prev, normalized]);
        setEmailInput("");
    };

    const handleRemoveParticipant = (email) => {
        setParticipants((prev) => prev.filter((p) => p !== email));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (participants.length === 0) {
            toast.error("Add at least one participant");
            return;
        }

        if (isGroupChat && !groupName.trim()) {
            toast.error("Group name is required");
            return;
        }

        try {
            setLoading(true);

            const payload = {
                participants,
            };

            if (isGroupChat) {
                payload.groupName = groupName.trim();
            }

            const res = await api.post("/conversations", payload);

            onConversationCreated(res.data);
            toast.success("Conversation created successfully!");

            // Reset state
            setEmailInput("");
            setParticipants([]);
            setGroupName("");
            onHide();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create conversation");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setEmailInput("");
        setParticipants([]);
        setGroupName("");
        onHide();
    };

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>New Conversation</Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Add participant by email</Form.Label>
                        <div className="d-flex gap-2">
                            <Form.Control
                                type="email"
                                placeholder="Enter user's email"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                disabled={loading}
                            />

                            <Button
                                variant="outline-primary"
                                onClick={handleAddParticipant}
                                disabled={loading || !emailInput.trim()}
                            >
                                Add Participant
                            </Button>
                        </div>
                    </Form.Group>

                    {participants.length > 0 && (
                        <div className="mb-3">
                            <div className="text-muted small mb-2">Participants</div>
                            <div className="d-flex flex-wrap gap-2">
                                {participants.map((p) => (
                                    <div
                                        key={p}
                                        className="d-inline-flex align-items-center px-2 py-1 rounded"
                                        style={{ background: "#1a1a1a", color: "#e0e0e0" }}
                                    >
                                        <span className="me-2">{p}</span>
                                        <Button
                                            variant="link"
                                            className="p-0 text-danger"
                                            style={{ textDecoration: "none" }}
                                            onClick={() => handleRemoveParticipant(p)}
                                            disabled={loading}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {isGroupChat && (
                        <Form.Group className="mb-1">
                            <Form.Label>Group name</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="e.g. Project Team"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                disabled={loading}
                            />
                        </Form.Group>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>

                    <Button
                        variant="primary"
                        type="submit"
                        disabled={loading || participants.length === 0}
                    >
                        {isGroupChat ? "Create Group" : "Create Chat"}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default NewConversationModal;
