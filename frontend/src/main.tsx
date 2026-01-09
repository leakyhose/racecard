import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./pages/Home.tsx";
import Lobby from "./pages/Lobby.tsx";
import Auth from "./pages/Auth.tsx";
import Confirm from "./pages/Confirm.tsx";
import { AuthProvider } from "./contexts/AuthContext";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/:code",
    element: <Lobby />,
  },
  {
    path: "/auth",
    element: <Auth />,
  },
  {
    path: "/confirm",
    element: <Confirm />,
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);
