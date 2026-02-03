import { BrowserRouter, Routes, Route } from "react-router-dom";
<<<<<<< HEAD
import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";  
import FileReport from "./components/FileReport";  
=======
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";  // Add this import
import FileReport from "./components/FileReport";  // Add this import
>>>>>>> b89cfb637490233662a8e1049c9599e4b64d8286
import AdminDashboard from "./AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />  
            <Route path="/file-report" element={<FileReport onBack={() => window.history.back()} />} />  
      </Routes>
    </BrowserRouter>
  );
}

export default App;