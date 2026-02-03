import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Megaphone, ThumbsUp, ShieldCheck, AlertCircle } from "lucide-react";

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isNonResident, setIsNonResident] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    barangay: "",
    phoneNumber: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsNonResident(checked);
    // Clear barangay if non-resident
    if (checked) {
      setFormData((prev) => ({ ...prev, barangay: "" }));
      setErrors((prev) => ({ ...prev, barangay: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Only require barangay if user is a resident
    if (!isNonResident && !formData.barangay) {
      newErrors.barangay = "Please select your barangay";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      // 2. Insert user data into users table
      const { error: insertError } = await supabase.from("users").insert([
        {
          id: authData.user?.id,
          email: formData.email,
          username: formData.username,
          full_name: formData.fullName,
          phone_number: formData.phoneNumber || null,
          barangay: isNonResident ? null : formData.barangay,
          is_non_resident: isNonResident,
        },
      ]);

      if (insertError) throw insertError;

      alert("Registration successful! You can now login.");
      navigate("/");
    } catch (error: any) {
      console.error("Error during registration:", error);
      if (error.message.includes("duplicate")) {
        setErrors({ email: "This email or username is already registered" });
      } else {
        alert("Registration failed: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">Sumbungan sa Plaridel</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/" className="text-gray-600 hover:text-gray-900">
              Home
            </Link>
            <Link to="/about" className="text-gray-600 hover:text-gray-900">
              About
            </Link>
            <Link to="/contact" className="text-gray-600 hover:text-gray-900">
              Contact
            </Link>
            <Link
              to="/"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left - Registration Form */}
          <div>
            <h1 className="text-4xl font-bold mb-2">Join the Sumbungan Community</h1>
            <p className="text-gray-600 mb-8">
              Help us make Plaridel a better place by reporting and discussing local issues.
            </p>

            <div className="bg-white p-8 rounded-xl shadow-lg">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Juan Dela Cruz"
                    className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.fullName ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.fullName && (
                    <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>
                  )}
                </div>

                {/* Username & Email */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="juandc"
                      className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.username ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.username && (
                      <p className="text-red-500 text-xs mt-1">{errors.username}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="juan@email.com"
                      className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                    )}
                  </div>
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.password ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.password && (
                      <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.confirmPassword ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                {/* Barangay & Phone Number */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Barangay
                    </label>
                    <select
                      name="barangay"
                      value={formData.barangay}
                      onChange={handleChange}
                      disabled={isNonResident}
                      className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isNonResident ? "bg-gray-100 cursor-not-allowed" : ""
                      } ${errors.barangay ? "border-red-500" : "border-gray-300"}`}
                    >
                      <option value="">Select Barangay</option>
                      <option value="Barangay Agnaya">Barangay Agnaya</option>
                      <option value="Barangay Bagong Silang">Barangay Bagong Silang</option>
                      <option value="Barangay Banga I">Barangay Banga I</option>
                      <option value="Barangay Banga II">Barangay Banga II</option>
                      <option value="Barangay Bintog">Barangay Bintog</option>
                      <option value="Barangay Bulihan">Barangay Bulihan</option>
                      <option value="Barangay Culianin">Barangay Culianin</option>
                      <option value="Barangay Dampol">Barangay Dampol</option>
                      <option value="Barangay Lagundi">Barangay Lagundi</option>
                      <option value="Barangay Lalangan">Barangay Lalangan</option>
                      <option value="Barangay Lumang Bayan">Barangay Lumang Bayan</option>
                      <option value="Barangay Parulan">Barangay Parulan</option>
                      <option value="Barangay Poblacion">Barangay Poblacion</option>
                      <option value="Barangay Rueda">Barangay Rueda</option>
                      <option value="Barangay San Jose">Barangay San Jose</option>
                      <option value="Barangay Santa Ines">Barangay Santa Ines</option>
                      <option value="Barangay Santo Niño">Barangay Santo Niño</option>
                      <option value="Barangay Sipat">Barangay Sipat</option>
                      <option value="Barangay Tabang">Barangay Tabang</option>
                    </select>
                    {errors.barangay && (
                      <p className="text-red-500 text-xs mt-1">{errors.barangay}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="text"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      placeholder="+63 912 345 6789"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Checkbox */}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isNonResident}
                    onChange={handleCheckboxChange}
                    className="w-4 h-4"
                  />
                  I am not a resident of Plaridel
                </label>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>

                {/* Login Link */}
                <p className="text-center text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link to="/" className="text-blue-600 font-semibold hover:underline">
                    Login here
                  </Link>
                </p>
              </form>
            </div>
          </div>

          {/* Right - Community Guidelines */}
          <div>
            <div className="bg-blue-600 text-white p-8 rounded-xl">
              <div className="flex items-center gap-2 mb-6">
                <AlertCircle className="w-6 h-6" />
                <h2 className="text-xl font-semibold">Community Guidelines</h2>
              </div>

              <div className="space-y-6">
                {/* Guideline 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                      <ThumbsUp className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Be Respectful</h3>
                    <p className="text-blue-100 text-sm">
                      Treat neighbors with kindness and empathy. Healthy debate is encouraged,
                      but harassment is not.
                    </p>
                  </div>
                </div>

                {/* Guideline 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">No Fake News</h3>
                    <p className="text-blue-100 text-sm">
                      Share only verified information from credible sources. Misinformation will
                      be removed immediately.
                    </p>
                  </div>
                </div>

                {/* Guideline 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Report Local Issues</h3>
                    <p className="text-blue-100 text-sm">
                      Keep the focus on our municipality. Report road issues, utility outages, or
                      local events.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Section */}
            <div className="mt-6 bg-blue-50 p-6 rounded-xl">
              <p className="text-xs text-gray-600 text-center mb-3">
                By signing up, you agree to our{" "}
                <Link to="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
                . © 2024 Sumbungan sa Plaridel
              </p>
              <Link to="/officialguidelines" target="_blank" rel="noopener noreferrer" className="text-blue-600 text-center block mb-4">
              <div className="bg-gradient-to-r from-yellow-200 to-yellow-300 text-center py-8 rounded-lg hover:from-yellow-100 hover:to-yellow-400 transition-colors">
                <span className="text-gray-700 font-semibold text-4xl opacity-50">
                  COMMUNITY SAFE ENVIRONMENT
                </span>
                <div className="block bg-white px-3 py-1 rounded text-blue-600 font-bold text-lg mt-2 ml-auto mr-auto w-fit">
                  PLARIDEL PRIDE
                </div>
              </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;