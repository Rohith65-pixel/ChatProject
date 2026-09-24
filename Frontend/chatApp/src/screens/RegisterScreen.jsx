import { useState } from "react";
import {
    Container,
    Row,
    Col,
    Card,
    Form,
    Button
} from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../api/axios";

const RegisterScreen = () => {

    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [bio, setBio] = useState("");

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            setLoading(true);

            const res = await api.post("/auth/register", {
                name,
                email,
                password,
                bio
            });

            localStorage.setItem(
                "user",
                JSON.stringify(res.data.details)
            );

            toast.success("Account created successfully!");
            navigate("/chat");

        } catch (err) {

            toast.error(
                err.response?.data?.message ||
                "Registration failed"
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
                                Create Account
                            </h5>

                            <Form onSubmit={handleSubmit}>

                                <Form.Group className="mb-3">

                                    <Form.Label>
                                        Name
                                    </Form.Label>

                                    <Form.Control
                                        type="text"
                                        placeholder="Enter name"
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        required
                                    />

                                </Form.Group>


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


                                <Form.Group className="mb-3">

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


                                <Form.Group className="mb-4">

                                    <Form.Label>
                                        Bio
                                    </Form.Label>

                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        placeholder="Tell us about yourself"
                                        value={bio}
                                        onChange={(e) =>
                                            setBio(e.target.value)
                                        }
                                    />

                                </Form.Group>


                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-100"
                                    disabled={loading}
                                >
                                    {loading
                                        ? "Creating account..."
                                        : "Register"
                                    }
                                </Button>

                            </Form>


                            <div className="text-center mt-3">

                                Already have an account?{" "}

                                <Link to="/login">
                                    Login
                                </Link>

                            </div>

                        </Card.Body>

                    </Card>

                </Col>

            </Row>

        </Container>
    );
};

export default RegisterScreen;