import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { doesUserExist, isUserBlocked, sendOTP, signupUser, verifyOTP } from "../APIs/auth.js";
import Footer from "../components/footer.js";

function Signup() {
    // React state to store User details
    const [user, setUser] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        profilePic : ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [selectedImg, setSelectedImg] = useState(null);
    const [btn, setBtn] = useState('Sign Up');

    // Function to validate the form
    const validateForm = () => {
        if (!user.firstName.trim()) return toast.error("First name is required");
        if (!user.lastName.trim()) return toast.error("Last name is required");
        if (!user.email.trim()) return toast.error("Email is required");
        if (!/\S+@\S+\.\S+/.test(user.email)) return toast.error("Invalid email format");
        if (!user.password) return toast.error("Password is required");
        if (user.password.length < 8) return toast.error("Password must be at least 8 characters");

        return true;
    };
    async function onFormSubmit(event) {
        event.preventDefault();
        try {
            const success = validateForm();

            if (success === true) {
                if(state==='Sign Up'){
                    const response = await doesUserExist({email:user.email});
                    if(response.exists) return toast.error('A user with this email already exists.');
                    
                    const isBlocked = await isUserBlocked({email: user.email});
                    if(isBlocked.isBlocked) return toast.error(isBlocked.message);
                    
                    setBtn('Sending OTP...');
                    const isSent = await sendOTP({email:user.email, type:'verify'});
                    if(isSent.success){
                        toast.success(isSent.message);
                        setBtn('Verify');
                        setState('Verify');
                    }
                    else {
                        setBtn('Sign Up');
                        toast.error(isSent.message);}
                }
                // State of verifying the OTP and Signning Up
                else if (state ==='Verify'){
                    setBtn('Verifying...');
                    const isVerified = await verifyOTP({email:user.email, otp:otp});
                    if(isVerified.isBlocked){
                        setState('Sign Up');
                        setBtn('Sign Up');
                        toast.error(isVerified.message);
                    }
                    else if(isVerified.success){
                        setBtn('Signning Up...');
                        const response = await signupUser(user);
                        if (response.success) {
                            toast.success(response.message);
                            window.location.href = "/";
                        }
                        else {
                            setState('Sign Up');
                            setBtn('Sign Up');
                            toast.error(response.message);}
                    }
                    else {
                        setBtn('Verify');
                        toast.error(isVerified.message);}
                }
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    // Function to handle image and its preview
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file?.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64Image = reader.result;
            setSelectedImg(base64Image);
            setUser({ ...user, profilePic: base64Image })
        };
    };
    // Helper: allow ONLY letters
    const onlyLetters = (value) => value.replace(/[^A-Za-z]/g, "");
    const [state, setState] = useState('Sign Up');
    const [otp, setOTP] = useState('');

    
    return (<>
        <div className="app-container flex-wrap">
            <div className="container-back-img"></div>
            <div className="container-back-color"></div>
            <div className="card">
                <div className="card_title">
                    {(state === 'Sign Up')?<h1>Create Account</h1>:<h1>Verify your Email</h1>}
                    {(state === 'Verify')?<h5>An OTP has been sent to your email !</h5>:""}
                </div>
                <div className="form">
                    <form onSubmit={onFormSubmit}>
                        {(state==='Sign Up')&&(<><div className="flex flex-col items-center gap-4">
                            <div className="relative group">
                               
                                <img src={selectedImg || "/avatar.png"} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-gray-300"/>

                                {/* Camera Icon Button */}
                                <label htmlFor="avatar-upload" className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-md cursor-pointer 
                                    hover:bg-gray-100 transition-all duration-200">
                                    <i className="fa fa-camera text-gray-700 text-lg"></i>
                                </label>

                                {/* Hidden File Input */}
                                <input type="file" id="avatar-upload" accept="image/*" className="hidden" onChange={handleImageUpload}/>
                            </div>
                        </div>

                        <div className="column">
                            <input type="text" placeholder="First Name" value={user.firstName}
                                onChange={(e) => setUser({ ...user, firstName: onlyLetters(e.target.value) })} required/>

                            <input type="text" placeholder="Last Name" value={user.lastName}
                                onChange={(e) => setUser({ ...user, lastName: onlyLetters(e.target.value) })} required/>
                        </div>
                        <input type="email" placeholder="Email" value={user.email}
                            onChange={(e) => setUser({ ...user, email: e.target.value.replace(/\s/g,"") })}
                            onKeyDown={(e) => {if (e.key === " ") e.preventDefault();}} />

                        <div className="password-wrapper">
                            <input type={showPassword ? "text" : "password"} placeholder="Password" value={user.password}
                                onChange={(e) => setUser({ ...user, password: e.target.value.replace(/\s/g, "") })}
                                onKeyDown={(e) => {if (e.key === " ") e.preventDefault();}} required/>

                            <i className={showPassword ? "fa fa-eye" : "fa fa-eye-slash"} onClick={() => setShowPassword(!showPassword)}></i>
                        </div></>)}

                        {(state==='Verify') && <div className="password-wrapper">
                        <input type='text' placeholder="OTP" value={otp} 
                        onChange={(e) => setOTP( e.target.value.replace(/\s/g, ""))} 
                            onKeyDown={(e) => {if (e.key === " ") e.preventDefault();}} required/>
                        </div>}
                        <button> {btn}</button>
                    </form>
                </div>
                <div className="card_terms">
                    <span>Already have an account?
                        <Link to="/login">Login Here</Link>
                    </span>
                </div>
            </div>
            <Footer/>
        </div></>
    );
}

export default Signup;