import { useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { allUsersDetails, userDetails } from "./users.js";
import { allChats } from "./chats.js";
import { setAllChats, setAllUsers, setUser, clearUser } from "../redux/userSlice.js";
import Loader from "../components/loader.js";

function ProtectedRoute({ children }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, isAuthLoading } = useSelector(state => state.userReducer);

    useEffect(() => {
        const init = async () => {
            try {
                // fetch current user if not in redux
                const response = await userDetails();
                if (response.success) {
                    dispatch(setUser(response.data));

                    // Load additional data
                    const usersRes = await allUsersDetails();
                    if (usersRes.success) dispatch(setAllUsers(usersRes.data));

                    const chatsRes = await allChats();
                    if (chatsRes.success) dispatch(setAllChats(chatsRes.data));
                } else {
                    dispatch(clearUser());
                    navigate("/signup");
                }
            } catch (err) {
                dispatch(clearUser());
                navigate("/signup");
            }
        };

        // Only run auth check IF not loaded yet
        if (isAuthLoading) init();
    }, [isAuthLoading, dispatch, navigate]);

    // While auth is being resolved
    if (isAuthLoading) return <Loader/>;

    // If auth resolved but no user
    if (!user) return <Navigate to="/signup" replace />;

    return children;
}
export default ProtectedRoute;