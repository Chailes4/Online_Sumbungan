import { BrowserRouter, Routes, Route } from "react-router-dom";
import FileReport from "./components/FileReport";  
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";  // Add this import

import AdminDashboard from "./AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />  
            <Route path="/login" element={<Login />} />  
            <Route path="/file-report" element={<FileReport onBack={() => window.history.back()} />} />  
      </Routes>
    </BrowserRouter>
  );
}

export default App;