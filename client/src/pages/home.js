import { useEffect, useState, useCallback } from "react";
import { io } from 'socket.io-client';
import { useSelector, useDispatch } from "react-redux";

import Header from "../components/header.js";
import Sidebar from "../components/sidebar.js";
import ChatArea from "../components/chatArea.js";
import NoChatSelected from "../components/NoChatSelected.js";
import Profile from "../components/profile.js";
import { VideoCall } from "../components/videoCall.js";
import { setAllChats, setSelectedChat } from "../redux/userSlice.js";
import store from '../redux/store.js';
import toast from "react-hot-toast";


const BASE_URL = process.env.REACT_APP_MODE === "development" ? "http://localhost:5000" : "/";
const socket = io(BASE_URL);

function Home() {
    const { user, selectedChat } = useSelector(state => state.userReducer);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [inProfile, setInProfile] = useState(false);

    // VIDEO CALL STATES
    const [showCallScreen, setShowCallScreen] = useState(false);
    const [incomingCallData, setIncomingCallData] = useState(null);
    const [mySocketId, setMySocketId] = useState("");
    const dispatch = useDispatch();

    let selectedUser;
    if (selectedChat) {
        selectedUser = selectedChat.members.find(u => u._id !== user._id);
    }

    const handleCallEnd = useCallback(() => {
        setShowCallScreen(false);
        setIncomingCallData(null);
    }, []);

    useEffect(() => {
        if (user) {
            socket.emit('user-logged-in', user?._id);

            socket.on('user-socket-id', (socketId) => {
                setMySocketId(socketId);
                // console.log(`User : ${user.firstName + " " + user.lastName} | Socket ID : ${mySocketId}`);
            });

            socket.on('incoming-call', (data) => {
                setIncomingCallData(data); // This triggers the modal
            });

            socket.on('call-cancelled', () => {
                setIncomingCallData(null);
                setShowCallScreen(false);
                toast("Call cancelled by caller", { icon: '📞' });
            });
        }

        // Request permission to send notifications
        if ("Notification" in window) {
            if (Notification.permission !== "granted" && Notification.permission !== "denied") {
                Notification.requestPermission();
            }
        }

        socket.off("receive-message").on("receive-message", (newMessage) => {
            // Logic: Only show notification if the tab is NOT in focus
            // Case 1: Browser is minimized or in another tab
            if (document.hidden && Notification.permission === "granted") {

                // Find sender details from your allUsers/allChats state if needed
                const senderName = newMessage.senderName || "New Message";

                const notification = new Notification(`Message from ${senderName}`, {
                    body: newMessage.text || "Sent a media file",
                    icon: "/chat-tab-icon.png", // Path to app icon
                    tag: "chat-notification", // Prevents stacking multiple notifications
                    renotify: true
                });

                // Optional: Focus the tab when the notification is clicked
                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };
            }
            // Case 2: Browser is open, but looking at a DIFFERENT chat
            else if (selectedChat?._id !== newMessage.chatId) {
                toast.success(`New message from ${newMessage.senderName}`);
            }
        });

        return () => {
            socket.off('user-socket-id');
            socket.off('incoming-call');
            socket?.off("receive-message");
            socket?.off("call-cancelled");
        }
    }, [user, socket]);

    // set online users
    useEffect(() => {
        if (user) {
            socket.on('online-users', onlineUsers => {
                setOnlineUsers(new Set(onlineUsers));
            });
        }
    }, [onlineUsers]);

    // listener for block and unblock user
    useEffect(() => {
        if (socket) {
            socket.on("chat-blocked-status", (data) => {
                const { chatId, isBlocked, blockedBy } = data;

                // 1. Get the current list of chats from Redux
                const currentState = store.getState().userReducer;
                const allChats = currentState.allChats;
                const selectedChat = currentState.selectedChat;

                // 2. Update the specific chat in the list
                const updatedAllChats = allChats.map((chat) => {
                    if (chat._id === chatId) {
                        return { ...chat, isBlocked, blockedBy };
                    }
                    return chat;
                });

                // 3. Dispatch the updated list to Redux
                dispatch(setAllChats(updatedAllChats));

                // 4. ALSO update selectedChat if it's the one currently open
                if (selectedChat?._id === chatId) {
                    dispatch(setSelectedChat({ ...selectedChat, isBlocked, blockedBy }));
                }
            });
        }

        return () => {
            socket?.off("chat-blocked-status");
        };
    }, [socket, dispatch]);

    return (<div className="home-page">
        <Header socket={socket} inProfile={inProfile} setInProfile={setInProfile} />
        
        {!inProfile && <div className="main-content">
            {/* <!--SIDEBAR LAYOUT--> */}
            <Sidebar socket={socket} onlineUsers={onlineUsers} />

            {/* <!--CHAT AREA LAYOUT--> */}
            {!selectedChat ? <NoChatSelected /> : <ChatArea socket={socket} onlineUsers={onlineUsers} setShowCallScreen={setShowCallScreen} />}
        </div>}

        {inProfile && <Profile inProfile={inProfile} setInProfile={setInProfile} />}

        {/* VIDEO CALL */}
        {(incomingCallData || showCallScreen) && (
            <VideoCall
                socket={socket}
                mySocketId={mySocketId}
                selectedUser={selectedUser}
                isInitiator={showCallScreen ? true : false}
                incomingCallData={incomingCallData}
                onEnd={handleCallEnd}
            />
        )}
    </div>)
}

export default Home;