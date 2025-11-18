import { useEffect, useState } from "react";
import {io} from 'socket.io-client';
import { useSelector } from "react-redux";

import Header from "../components/header.js";
import Sidebar from "../components/sidebar.js";
import ChatArea from "../components/chatArea.js";
import NoChatSelected from "../components/NoChatSelected.js";
import Profile from "../components/profile.js";

const BASE_URL = process.env.REACT_APP_MODE === "development" ? "http://localhost:5000": "/";
const socket = io(BASE_URL);

function Home(){
    const {user, selectedChat} = useSelector(state=>state.userReducer);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [inProfile, setInProfile] = useState(false);

    useEffect(()=>{
        if(user){
            socket.emit('join-room', user?._id);
            socket.emit('user-logged-in', user?._id);
        }
    },[user]);

    useEffect(()=>{
        if(user){
            socket.on('online-users', onlineUsers=>{
                setOnlineUsers(onlineUsers);
            });
        }
    },[onlineUsers]);

    return (<div className="home-page">
                <Header socket = {socket} inProfile={inProfile} setInProfile={setInProfile}/>
                {!inProfile && <div className="main-content">
                    {/* <!--SIDEBAR LAYOUT--> */}
                    <Sidebar socket = {socket} onlineUsers = {onlineUsers}/>

                    {/* <!--CHAT AREA LAYOUT--> */}
                    {!selectedChat ? <NoChatSelected/>:<ChatArea socket = {socket} onlineUsers={onlineUsers}/>}
                </div>}

                {inProfile && <Profile inProfile={inProfile} setInProfile={setInProfile}/>}
            </div>)
}

export default Home;