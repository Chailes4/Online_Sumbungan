import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import plaridelchurch from "../assets/plaridel-church.jpg";
import { Mail, Megaphone, Lock} from "lucide-react"; 

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) return;

  setLoading(true);

  try {
    // 1️⃣ Sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (error) throw error;

    const sessionUser = data.user;
    if (!sessionUser) throw new Error("No user found after login");

    // 2️⃣ Get user info from your users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", sessionUser.id) // Use ID instead of email for reliability
      .single();

    if (userError || !userData) {
      console.error(userError);
      setErrors({ email: "Failed to fetch user info" });
      setLoading(false);
      return;
    }

    // 3️⃣ Redirect based on is_admin
    if (userData.is_admin) {
      navigate("/admin"); // ✅ AdminDashboard
    } else {
      navigate("/dashboard"); // Regular user
    }

  } catch (error: any) {
    console.error("Error during login:", error);
    if (error.message.includes("Invalid login credentials")) {
      setErrors({ email: "Invalid email or password" });
    } else {
      setErrors({ email: "Login failed. Please try again." });
    }
  } finally {
    setLoading(false);
  }
};


  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Error with Google sign-in:", error);
      alert("Google sign-in failed: " + error.message);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* LEFT SIDE */} 
      <div className="hidden md:flex flex-col justify-center px-16 bg-blue-600 text-white relative">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${plaridelchurch})` }}
        />

        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-semibold">Sumbungan ng Plaridel</span>
            </div>

          <h1 className="text-5xl font-extrabold mb-4">Be heard, Plaridel.</h1>

          <p className="text-blue-100 mb-10">
            Join your neighbors in building a better community. Report issues,
            share ideas, and stay informed.
          </p>

          <div className="flex gap-10">
            <div>
              <p className="text-2xl font-bold">15k+</p>
              <p className="text-sm text-blue-100">Active Users</p>
            </div>
            <div>
              <p className="text-2xl font-bold">500+</p>
              <p className="text-sm text-blue-100">Reports Resolved</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-xl border-t-4 border-blue-600 md:p-10">
          <h2 className="text-2xl font-bold mb-1">Welcome Back</h2>
          <p className="text-gray-500 mb-6">
            Please sign in to access your community account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </p>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-600" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. user@example.com"
                className={`w-full border rounded-md pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? "border-red-500" : ""
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>
            <p className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </p>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-600" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="•••••••"
                autoComplete="current-password"
                className={`w-full border rounded-md pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.password ? "border-red-500" : ""
                }`}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                />
                Remember me
              </label>

              <Link to="/forgot-password" className="text-blue-600 hover:underline">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>

            <div className="text-center text-sm text-gray-400">
              OR CONTINUE WITH
            </div>

<button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full border py-2 rounded-md flex items-center justify-center gap-2 hover:bg-gray-100"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>

            <p className="text-center text-sm mt-4">
              New to the community?{" "}
              <Link
                to="/register"
                className="text-blue-600 font-semibold hover:underline"
              >
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;