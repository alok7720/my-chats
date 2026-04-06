import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import toast from "react-hot-toast";

import { updateUser } from "../APIs/users.js";
import { setUser } from "../redux/userSlice.js";

function Profile({ inProfile, setInProfile }) {
  const { user } = useSelector((state) => state.userReducer);

  const dispatch = useDispatch();
  const [image, setImage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Track user input values
  const [userInfo, setUserInfo] = useState({
    firstName: "",
    lastName: "",
    password: "",
    profilePic: "",
  });

  // Helper: allow ONLY letters
  const onlyLetters = (value) => value.replace(/[^A-Za-z]/g, "");

  // Check if at least 1 field is changed
  const isAnyFieldChanged = userInfo.firstName.trim() || userInfo.lastName.trim() || userInfo.password.trim() || image;

  // Handle image selection
  const onFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    // Check File Size (2MB Limit)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      toast.error("Image must be less than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setImage(reader.result);
      setUserInfo((prev) => ({ ...prev, profilePic: reader.result }));
    };
  };

  // Function to update user profile
  const updateUserProfile = async () => {
    if (!isAnyFieldChanged) return;

    // Frontend check
    const lastUpdate = new Date(user.profileUpdatedDate || 0);
    const diffInDays = (new Date() - lastUpdate) / (1000 * 60 * 60 * 24);

    if (diffInDays < 15) {
      const remaining = Math.ceil(15 - diffInDays);
      return toast.error(`Please wait ${remaining} more days to update your profile.`);
    }

    try {
      const updatedFields = {
        firstName: userInfo.firstName || undefined,
        lastName: userInfo.lastName || undefined,
        password: userInfo.password || undefined,
        profilePic: userInfo.profilePic || undefined,
      };

      const response = await updateUser(updatedFields);

      if (response.success) {
        toast.success("Profile updated successfully!");
        dispatch(setUser(response.data));
      }
      else {
        toast.error(response.message); // Show "15 days remaining" message from server
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="w-full flex flex-col items-center py-6 px-4">
      <div className="mt-6 w-full max-w-md bg-white shadow-lg rounded-xl p-6 border border-gray-200">
        <button className="text-gray-700 text-xl mb-3 flex items-center gap-2 hover:text-black transition cursor-pointer"
          onClick={() => setInProfile(false)}>
          <i className="fa fa-arrow-left"></i>
        </button>

        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {user?.profilePic || image ? (<img src={image || user.profilePic} className="w-32 h-32 rounded-full object-cover border border-gray-300 shadow" />
            ) : (
              <div className="w-32 h-32 rounded-full bg-[#e74c3c] text-white flex items-center justify-center text-3xl font-semibold shadow">
                {(user?.firstName[0] + user?.lastName[0]).toUpperCase()}
              </div>
            )}

            {/* Camera icon */}
            <label htmlFor="avatar-upload"
              className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow cursor-pointer hover:bg-gray-100">
              <i className="fa fa-camera text-gray-700"></i>
            </label>

            <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={onFileSelect} />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 mb-4 mt-4">Profile Details</h2>

        {/* First Name */}
        <label className="block mb-3">
          <span className="text-gray-600 font-medium">First Name</span>
          <input type="text" className="input-box" value={userInfo.firstName}
            onChange={(e) => setUserInfo({ ...userInfo, firstName: onlyLetters(e.target.value) })}
            placeholder={user.firstName} />
        </label>

        {/* Last Name */}
        <label className="block mb-3">
          <span className="text-gray-600 font-medium">Last Name</span>
          <input type="text" className="input-box" value={userInfo.lastName}
            onChange={(e) => setUserInfo({ ...userInfo, lastName: onlyLetters(e.target.value) })}
            placeholder={user.lastName} />
        </label>

        {/* PASSWORD FIELD */}
        <div className="mb-4 relative">
          <label className="block font-medium mb-1">New Password</label>
          <input type={showPassword ? "text" : "password"} value={userInfo.password}
            onChange={(e) => setUserInfo({ ...userInfo, password: e.target.value.replace(/\s/g, "") })}
            onKeyDown={(e) => { if (e.key === " ") e.preventDefault(); }} //disable space key
            className="w-full px-3 py-2 border rounded-lg pr-10 outline-none focus:ring focus:ring-indigo-300"
            placeholder="Enter your new password" />

          <i className={`${showPassword ? "fa fa-eye" : "fa fa-eye-slash"} absolute right-3 top-3/5 -translate-y-1/2 text-gray-600 cursor-pointer`}
            onClick={() => setShowPassword(!showPassword)}></i>
        </div>

        {/* Email */}
        <p className="text-gray-600 mt-4"><b>Email:</b> {user.email}</p>

        {/* Created Date */}
        <p className="text-gray-600"><b>Account Created:</b>{" "}
          {moment(user?.createdAt).format("DD-MM-YYYY hh:mm A")}
        </p>

        {/* Submit Button */}
        <button disabled={!isAnyFieldChanged} onClick={updateUserProfile}
          className={`mt-5 w-full py-2 rounded-lg text-white font-medium transition ${isAnyFieldChanged
              ? "bg-[#e74c3c] hover:bg-[#e74c3c]"
              : "bg-gray-400 cursor-not-allowed"
            }`}
        >Save Changes</button>
      </div>
    </div>
  );
}

export default Profile;