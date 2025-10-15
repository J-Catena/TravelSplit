import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App";
import { UserProvider } from "./context/UserContext";
import GroupDetail from "./pages/GroupDetail";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/group/:id" element={<GroupDetail />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  </React.StrictMode>
);
