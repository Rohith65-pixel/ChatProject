import { useState } from "react";
import {Container,Row,Col,Card,Form,Button} from "react-bootstrap";
import { toast } from "react-toastify";

import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import socket from "../socket/socket";

const LoginScreen = () => {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);

            const res = await api.post("/auth/login", {
                email,
                password
            });

            localStorage.setItem(
                "user",
                JSON.stringify(res.data.details)
            );

            toast.success("Login successful!");
            socket.connect();
            navigate("/chat");

        } catch (err) {
            toast.error(
                err.response?.data?.message ||
                "Login failed"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container fluid className="vh-100">

            <Row className="h-100 justify-content-center align-items-center">

                <Col
                    xs={11}
                    sm={8}
                    md={6}
                    lg={4}
                >

                    <Card className="shadow">

                        <Card.Body className="p-4">

                            <h2 className="text-center mb-4">
                                ChatApp
                            </h2>

                            <h5 className="text-center mb-4">
                                Login
                            </h5>

                            <Form onSubmit={handleSubmit}>

                                <Form.Group className="mb-3">

                                    <Form.Label>
                                        Email
                                    </Form.Label>

                                    <Form.Control
                                        type="email"
                                        placeholder="Enter email"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        required
                                    />

                                </Form.Group>


                                <Form.Group className="mb-4">

                                    <Form.Label>
                                        Password
                                    </Form.Label>

                                    <Form.Control
                                        type="password"
                                        placeholder="Enter password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        required
                                    />

                                </Form.Group>


                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-100"
                                    disabled={loading}
                                >
                                    {loading
                                        ? "Logging in..."
                                        : "Login"
                                    }
                                </Button>

                            </Form>


                            <div className="text-center mt-3">

                                Don't have an account?{" "}

                                <Link to="/register">
                                    Register
                                </Link>

                            </div>

                        </Card.Body>

                    </Card>

                </Col>

            </Row>

        </Container>
    );
};

export default LoginScreen;