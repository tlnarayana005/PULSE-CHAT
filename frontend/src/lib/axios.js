import axios from "axios";

const rawBackendUrl = import.meta.env.VITE_BACKEND_URL;
const BACKEND_URL = rawBackendUrl
  ? rawBackendUrl.trim().replace(/\/+$/, "")
  : import.meta.env.MODE === "development"
  ? "http://localhost:5001"
  : "";

export const axiosInstance = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true,
});
