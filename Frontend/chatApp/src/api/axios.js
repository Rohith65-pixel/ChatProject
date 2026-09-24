import axios from "axios";

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const baseURL = isLocalhost ? "http://localhost:8000/api" : "/api";

const api = axios.create({
  baseURL,
  withCredentials: true,
});

export default api;
