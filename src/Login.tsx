import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

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
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('/church.jpg')" }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-white rounded-md" />
            <span className="font-semibold">Sumbungan sa Plaridel</span>
          </div>

          <h1 className="text-4xl font-bold mb-4">Be heard, Plaridel.</h1>

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
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md">
          <h2 className="text-2xl font-bold mb-1">Welcome Back</h2>
          <p className="text-gray-500 mb-6">
            Please sign in to access your community account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address"
                className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? "border-red-500" : ""
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                autoComplete="current-password"
                className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
              className="w-full border py-2 rounded-md flex items-center justify-center gap-2 hover:bg-gray-50"
            >
              <span className="text-2xl">G</span>
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