import { io } from "socket.io-client";

const BASE_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.MODE === "development" ? "http://localhost:5001" : "/");

export const createSocket = (userId) => {
  return io(BASE_URL, {
    query: { userId },
    withCredentials: true,
  });
};
