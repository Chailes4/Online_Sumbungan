import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";  // Add this import
import FileReport from "./components/FileReport";  // Add this import
import AdminDashboard from "./AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />  {/* Add this route */}
            <Route path="/file-report" element={<FileReport onBack={() => window.history.back()} />} />  {/* Add this route */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;