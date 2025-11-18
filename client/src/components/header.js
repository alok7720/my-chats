import { useNavigate } from "react-router-dom";
import { useSelector , useDispatch} from "react-redux";
import toast from "react-hot-toast";

import { logoutUser } from "../APIs/auth.js";
import { setUser } from "../redux/userSlice.js";
import "./header.css";

function Header({socket, inProfile, setInProfile}) {
    const {user} = useSelector(state=>state.userReducer);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    function getFullName(){
        let fname = user?.firstName.toUpperCase();
        let lname = user?.lastName.toUpperCase();

        return fname+" "+lname;
    }

    function getInitial(){
        let f = user?.firstName[0];
        let l = user?.lastName[0];
        
        return f+l;
    }

    // Function to logout the user
    const logout = async ()=>{
        try {
            const response = await logoutUser();
            if(response.success){
                dispatch(setUser(null));
                navigate('/login');
                toast.success(response.message);
            }
        } catch (error) {
            console.log("Error in logout in react");
            toast.error(error.message);
        }
        socket.emit('user-logged-out', user._id);
    }
    return (<div className="app-header">
                <div className="app-logo">
                    <i className="fa fa-comments-o" aria-hidden="true"></i>
                    My Chats
                </div>
                <div className="app-user-profile">
                    <div className="logged-user-name"> {getFullName()}</div>
                    {!inProfile && <div className="logged-user-profile-pic" onClick={()=>setInProfile(true)}>
                        {user?.profilePic ? <img className="rounded-full"src = {user?.profilePic}/>:getInitial()}
                    </div>}
                    <button className="logout-btn"  onClick={logout}>
                    <i className="fa fa-power-off"></i>
                    </button>
                </div>
            </div>
    );
}
export default Header;