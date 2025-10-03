import React, { useContext, useState } from "react";
import AuthLayout from "../../components/layouts/AuthLayout";
import { useNavigate, Link } from "react-router-dom";
import Input from "../../components/Inputs/Input";
import {validateEmail} from '../../utils/helper';
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { UserContext } from "../../context/userContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false); // Loading state for button click effect

  const { updateUser } = useContext(UserContext);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and Password are required.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email");
      return;
    }

    setLoading(true);

    try {
      setTimeout(() => {
        if (email === "user@example.com" && password === "password123") {
          setError(null);
          navigate("/dashboard");
        } else {
          setError("Invalid email or password.");
        }
        setLoading(false);
      }, 1500);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }

    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
        email,
        password,
      });
      const {token, user} = response.data;

      if(token) {
        localStorage.setItem('token', token);
        updateUser(user);
        navigate("/dashboard");
      }
    } catch (error) {
      if( error.response && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <AuthLayout>
      <div className="lg:w-[73%] md:w-[58%] sm:w-[78%] w-[88%] 
                h-auto flex flex-col justify-center 
                bg-gradient-to-br from-red-950 to-black rounded-2xl 
                p-4 md:p-6 shadow-lg shadow-red-900 border border-red-500">
        <h3 className="text-xl font-semibold text-white">Welcome!</h3>
        <p className="text-xs text-slate-400 mt-2 mb-2">
          Please enter your details to login
        </p>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <form onSubmit={handleLogin} className="flex flex-col gap-2">
          <Input
            value={email}
            onChange={({ target }) => setEmail(target.value)}
            label="Email Address"
            placeholder="john@example.com"
            type="email"
            className="rounded-lg"
          />

          <Input
            value={password}
            onChange={({ target }) => setPassword(target.value)}
            label="Password"
            placeholder="Enter your password"
            type="password"
            className="rounded-lg"
          />
          
          <button
            type="submit"
            className={`mt-4 flex justify-center items-center bg-blue-600 text-white py-2 rounded-2xl hover:bg-blue-700 transition ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
            disabled={loading} // Disable button when loading
          >
            {loading ? (
              <svg
                className="w-5 h-5 mr-2 text-white animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 018 8h-4l3 3 3-3h-4a8 8 0 01-8 8v-4l-3 3 3 3v-4a8 8 0 01-8-8h4l-3-3-3 3h4z"
                ></path>
              </svg>
            ) : (
              "Login"
            )}
          </button>
        </form>

        {/* Signup redirect text */}
        <p className="text-sm text-slate-400 mt-3 text-center">
          Don't have an account?{" "}
          <Link to="/signup" className="text-blue-500 hover:underline">
            SignUp
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Login;
