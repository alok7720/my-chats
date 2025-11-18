import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { doesUserExist, isUserBlocked, loginUser, sendOTP, verifyOTP } from "../APIs/auth.js";
import { resetPassword } from "../APIs/users.js";
import Footer from "../components/footer.js";

function Login() {
    const [user, setUser] = useState({
        email: '',
        password: ''
    });
    const [otp, setOTP] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [state, setState] = useState('Login');
    const [btn, setBtn] = useState('Login');

    async function onFormSubmit(event) {
        event.preventDefault();
        try {
            // If the user wants to Login normally
            if(state ==='Login'){
                setBtn("Logging...");
                const response = await loginUser(user);
                if (response.success) {
                    toast.success(response.message);
                    window.location.href="/";
                }
                else {
                    toast.error(response.message);
                    setBtn('Login')
                }
            }
            // If user wants to reset his/her password
            else if(state === 'Send OTP'){
                //first check whether the user exists 
                const response = await doesUserExist({email:user.email});
                if(response.exists){
                    const isBlocked = await isUserBlocked({email:user.email});
                    if(isBlocked.isBlocked){
                        setState('Login');
                        setBtn('Login');
                        return toast.error(isBlocked.message);
                    }
                    setBtn('Sending...')
                    // Send the OTP
                    const isSent = await sendOTP({email:user.email,type:'password-reset'});
                    if(isSent.success){
                        setBtn('Reset Password');
                        setState('Reset Password');
                        toast.success(isSent.message);
                    }
                    else{
                        toast.error(isSent.message);
                        setBtn('Send OTP');
                    }
                }
                else{
                    toast.error(response.message);
                }              
            }
            else if(state === 'Reset Password'){
                // First verify the entered OTP
                setBtn('Verifying OTP...');
                const response = await verifyOTP({email:user.email,otp:otp});
                if(response.isBlocked){
                    toast.error(response.message);
                    setState('Login');
                    setBtn('Login');
                }
                else if(response.success){
                    setBtn('Resetting...');
                    const isReset = await resetPassword({email:user.email, newPassword:user.password});
                    if(isReset.success){
                        setState('Login');
                        setBtn('Login');
                        setUser({email:'', password:''});
                        setOTP('');
                        toast.success(isReset.message);
                        window.location.href='/login';
                    }
                    else {
                        setBtn('Reset Password');
                        toast.error(isReset.message);}
                }
                else {
                    setBtn('Verify');
                    toast.error(response.message);}
            }    
        } catch (error) {
            toast.error(error.message);
        }
    }
    
    return (<>
        <div className="app-container flex-wrap">
            <div className="container-back-img"></div>
            <div className="container-back-color"></div>
            <div className="card">
                <div className="card_title">
                    <h1>{(state==='Login')?"Login":"Reset Password"}</h1>
                    {state==='Reset Password' && <span>Reset Password for email : {user.email}</span>}
                </div>
                <div className="form">
                    <form onSubmit={onFormSubmit}>

                        {/* Email Input Field */}
                        { (state==='Login' || state==='Send OTP' ) && <input type="email" placeholder="Email" value={user.email} 
                        onChange={(e) => setUser({ ...user, email: e.target.value.replace(/\s/g, "")})} 
                        onKeyDown={(e) => {if (e.key === " ") e.preventDefault();}} required/>
                        }
                        
                        {/* Password Input Field */}
                        {(state === 'Login' ||state === 'Reset Password')&&<div className="password-wrapper">
                        <input type={showPassword ? "text" : "password"} placeholder={state==='Login'?'Password':'New Password'} value={user.password} 
                            onChange={(e) => setUser({ ...user, password: e.target.value.replace(/\s/g, "")})} 
                            onKeyDown={(e) => {if (e.key === " ") e.preventDefault();}} required/>
                        <i className = {showPassword ?"fa fa-eye":"fa fa-eye-slash" }onClick={() => setShowPassword(!showPassword)}></i>
                        </div>}
                        
                        {/* OTP Input Field */}
                        {(state === 'Reset Password')&&<div className="password-wrapper">
                        <input type='text' placeholder="OTP" value={otp} 
                            onChange={(e) => setOTP( e.target.value.replace(/\s/g, ""))} 
                            onKeyDown={(e) => {if (e.key === " ") e.preventDefault();}} required/>
                        </div>
                        }
                        <button className={(btn==='Login' || btn==='Send OTP' || btn==='Reset Password')?"":"bg-gray-400 cursor-not-allowed"}>{btn}</button>
                    </form>
                </div>
                <div className="card_terms flex flex-col">
                    {state==='Login'&&<span> Forgot Password ?<span className="cursor-pointer text-blue-400" 
                    onClick={()=>{setState('Send OTP');setBtn('Send OTP');setUser({...user, email:"", password:""});setOTP('')}}> Reset Here</span></span>}
                    
                    {(state==='Send OTP'||state==='Reset Password')&&<span className=" cursor-pointer text-blue-400" 
                    onClick={()=>{setBtn('Login');setState('Login');setUser({...user, email:"", password:""});setOTP('')}}><i className="fa fa-arrow-left"></i>Go back to Login</span>}
                    
                    <span>Don't have an account yet?
                        <Link to="/signup">Signup</Link>
                    </span>
                </div>
            </div>
            <Footer/>
        </div></>
    );
}

export default Login;