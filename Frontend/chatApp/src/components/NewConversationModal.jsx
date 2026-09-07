import { useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../api/axios";

const NewConversationModal = ({ show, onHide, onConversationCreated }) => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;

        try {
            setLoading(true);

            const res = await api.post("/conversations", { email: email.trim() });

            // Notify parent and close modal
            onConversationCreated(res.data);
            toast.success("Conversation created successfully!");

            // Reset form
            setEmail("");
            onHide();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create conversation");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setEmail("");
        onHide();
    };

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>New Conversation</Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>User Email</Form.Label>

                        <Form.Control
                            type="email"
                            placeholder="Enter user's email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </Form.Group>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Cancel
                    </Button>

                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? "Starting..." : "Start Chat"}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default NewConversationModal;