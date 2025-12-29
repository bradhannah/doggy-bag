import createClient from "openapi-fetch";
import type { paths } from "$types/api";

// Base URL configuration
const getBaseUrl = () => {
  // Development: use Vite proxy (empty baseUrl)
  if (import.meta.env.DEV) {
    return "";
  }
  // Production: use direct backend URL
  return import.meta.env.VITE_API_URL || "http://localhost:3000";
};

export const apiClient = createClient<paths>({
  baseUrl: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: Add authentication middleware in the future
// apiClient.use({
//   async onRequest({ request }) {
//     // Add auth token from localStorage or cookie
//     const token = typeof localStorage !== "undefined"
//       ? localStorage.getItem("auth-token")
//       : null;
//
//     if (token) {
//       request.headers.set("Authorization", `Bearer ${token}`);
//     }
//     return request;
//   },
//   async onResponse({ response }) {
//     // Handle 401 unauthorized globally
//     if (response.status === 401) {
//       // Redirect to login or refresh token
//     }
//   },
//   async onError({ error }) {
//     console.error("API Error:", error);
//   },
// });
