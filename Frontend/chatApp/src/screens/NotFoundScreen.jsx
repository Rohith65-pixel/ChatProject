import { Container, Row, Col, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const NotFoundScreen = () => {
    const navigate = useNavigate();

    return (
        <Container fluid className="vh-100 d-flex align-items-center justify-content-center">
            <Row>
                <Col className="text-center">
                    <div className="mb-4">
                        <h1 style={{ fontSize: "6rem", fontWeight: "bold", color: "#6366f1" }}>
                            404
                        </h1>
                        <h3 className="mb-3">Page Not Found</h3>
                        <p className="text-muted mb-4">
                            The page you're looking for doesn't exist or has been moved.
                        </p>
                    </div>

                    <div className="d-flex gap-3 justify-content-center">
                        <Button
                            variant="primary"
                            onClick={() => navigate("/chat")}
                        >
                            Go to Chat
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => navigate("/login")}
                        >
                            Go to Login
                        </Button>
                        
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default NotFoundScreen;
