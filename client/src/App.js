import { useEffect } from "react";
import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Toaster } from "react-hot-toast";

import Login from "./pages/login.js";
import Home from "./pages/home.js";
import Signup from "./pages/signup.js";
import Loader from "./components/loader.js";
import ProtectedRoute from "./APIs/protectedRoute.js";
import { userDetails } from "./APIs/users.js";
import { setUser,  clearUser } from "./redux/userSlice.js";

function App() {
  const {user, isAuthLoading} = useSelector(state=>state.userReducer);
  const dispatch = useDispatch();

   //  Run only once on app startup
  useEffect(() => {
    const verifyUser = async () => {
      try {
        const response = await userDetails();
        if (response.success) {
          dispatch(setUser(response.data));
        } else {
          dispatch(clearUser());
        }
      } catch (err) {
        dispatch(clearUser());
      }
    };

    verifyUser();
  }, []);

  return (
    <div>
      <Toaster position="top-center" reverseOrder={false}/>
      
      <BrowserRouter>
      <Routes>
        <Route path = "/" element={<ProtectedRoute><Home/></ProtectedRoute>}></Route>
        <Route path="/login" element={ isAuthLoading ? <Loader/> : user ? (<Navigate to="/" replace />) : (<Login />)  }  />
        <Route path="/signup" element={isAuthLoading ? <Loader/> : user ? (<Navigate to="/" replace />) : (<Signup />)}/>
      </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;