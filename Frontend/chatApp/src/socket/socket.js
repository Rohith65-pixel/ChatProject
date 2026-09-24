import { io } from "socket.io-client";

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const socketUrl = isLocalhost
  ? "http://localhost:8000"
  : window.location.origin;

const socket = io(socketUrl, {
  withCredentials: true,
  autoConnect: false,
});

export default socket;
