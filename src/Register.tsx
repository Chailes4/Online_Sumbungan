import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

interface Barangay {
  id: number;
  name: string;
}

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
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

  // Fetch barangays from Supabase
  useEffect(() => {
    fetchBarangays();
  }, []);

  const fetchBarangays = async () => {
    const { data, error } = await supabase
      .from("barangays")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching barangays:", error);
    } else {
      setBarangays(data || []);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6 py-8">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* FORM */}
        <div className="md:col-span-2 bg-white p-8 rounded-xl shadow-md">
          <h2 className="text-2xl font-bold mb-1">Join the Sumbungan Community</h2>
          <p className="text-gray-500 mb-6">
            Help us make Plaridel a better place by reporting local issues.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Full Name"
                className={`w-full border rounded-md px-4 py-2 ${
                  errors.fullName ? "border-red-500" : ""
                }`}
              />
              {errors.fullName && (
                <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Username"
                  className={`border rounded-md px-4 py-2 w-full ${
                    errors.username ? "border-red-500" : ""
                  }`}
                />
                {errors.username && (
                  <p className="text-red-500 text-xs mt-1">{errors.username}</p>
                )}
              </div>
              <div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email Address"
                  className={`border rounded-md px-4 py-2 w-full ${
                    errors.email ? "border-red-500" : ""
                  }`}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  autoComplete="new-password"
                  className={`border rounded-md px-4 py-2 w-full ${
                    errors.password ? "border-red-500" : ""
                  }`}
                />
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                )}
              </div>
              <div>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm Password"
                  autoComplete="new-password"
                  className={`border rounded-md px-4 py-2 w-full ${
                    errors.confirmPassword ? "border-red-500" : ""
                  }`}
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            <h3 className="text-sm font-semibold text-gray-600">PERSONAL DETAILS</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <select
                  name="barangay"
                  value={formData.barangay}
                  onChange={handleChange}
                  disabled={isNonResident}
                  className={`border rounded-md px-4 py-2 w-full ${
                    isNonResident ? "bg-gray-100 cursor-not-allowed" : ""
                  } ${errors.barangay ? "border-red-500" : ""}`}
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

              <input
                type="text"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="Phone Number (Optional)"
                className="border rounded-md px-4 py-2"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isNonResident}
                onChange={handleCheckboxChange}
              />
              I am not a resident of Plaridel
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            <p className="text-center text-sm mt-4">
              Already have an account?{" "}
              <Link to="/" className="text-blue-600 font-semibold hover:underline">
                Login here
              </Link>
            </p>
          </form>
        </div>

        {/* GUIDELINES */}
        <div className="bg-blue-600 text-white p-6 rounded-xl">
          <h3 className="font-semibold mb-4">Community Guidelines</h3>

          <ul className="space-y-4 text-sm">
            <li>
              <strong>Be Respectful</strong>
              <p className="text-blue-100">Treat neighbors with kindness and empathy.</p>
            </li>
            <li>
              <strong>No Fake News</strong>
              <p className="text-blue-100">Share only verified information.</p>
            </li>
            <li>
              <strong>Report Local Issues</strong>
              <p className="text-blue-100">Focus on Plaridel-related concerns.</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Register;