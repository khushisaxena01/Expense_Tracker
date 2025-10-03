import React, { useContext, useState } from "react";
import AuthLayout from "../../components/layouts/AuthLayout";
import { useNavigate, Link } from "react-router-dom";
import Input from "../../components/Inputs/Input";
import ProfilePhotoSelector from "../../components/Inputs/ProfilePhotoSelector";
import { validateEmail } from '../../utils/helper';
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { UserContext } from "../../context/userContext";
import uploadImage from "../../utils/uploadImage";

const SignUp = () => {
  const [profilePic, setProfilePic] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const {updateUser} = useContext(UserContext);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);

    let profileImageURL = "";

    if (!fullName || !email || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      navigate("/login");
    }, 1500);

    try {

      if(profilePic){
        const imgUploadRes = await uploadImage(profilePic);
        profileImageURL = imgUploadRes.imgUrl || "" ;
      }

      const response = await axiosInstance.post(API_PATHS.AUTH.REGISTER, {
        fullName,
        email,
        password,
        profileImageURL,
      });

      const { token , user } = response.data;

      if(token) {
        localStorage.setItem("token", token);
        updateUser(user);
        navigate("/dashboard");
      }
    } catch (error) {
      if (error.response && error.response.data.message) {
        setError(error.response.data.message);
    } else {
      setError("An error occurred. Please try again.");
    }
  }
};

  return (
    <AuthLayout>
      <div className="lg:w-[73%] md:w-[58%] sm:w-[78%] w-[88%] 
             h-auto flex flex-col justify-center 
             bg-gradient-to-br from-red-950 to-black rounded-2xl 
             p-4 md:p-6 shadow-lg shadow-red-900 border border-red-500">

        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Create an Account</h3>
          <ProfilePhotoSelector image={profilePic} setImage={setProfilePic} small />
        </div>

        <p className="text-xs text-slate-300 mt-1 mb-3">
          Join us today by entering your details
        </p>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <form onSubmit={handleSignUp} className="flex flex-col gap-0">
          <Input
            value={fullName}
            onChange={({ target }) => setFullName(target.value)}
            label="Full Name"
            placeholder="John"
            type="text"
            className="rounded-lg"
          />

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
            placeholder="Minimum of 8 characters"
            type="password"
            className="rounded-lg"
          />

          <Input
            value={confirmPassword}
            onChange={({ target }) => setConfirmPassword(target.value)}
            label="Confirm Password"
            placeholder="Re-enter your password"
            type="password"
            className="rounded-lg"
          />

          <button
            type="submit"
            className={`mt-2 flex justify-center items-center bg-blue-600 text-white py-2 rounded-2xl 
            transition-all duration-[150ms] hover:bg-red-700 ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            {loading ? (
              <div className="flex space-x-2">
                <span className="h-2 w-2 bg-white rounded-full animate-bounce"></span>
                <span className="h-2 w-2 bg-white rounded-full animate-bounce delay-100"></span>
                <span className="h-2 w-2 bg-white rounded-full animate-bounce delay-200"></span>
              </div>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        {/* Redirect to Login */}
        <p className="text-sm text-slate-400 mt-4 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-500 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default SignUp;
