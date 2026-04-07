import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import moment from 'moment';
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";
import axios from "axios";

import { newMessage, getMessages } from "../APIs/message.js";
import { clearUnreadMessageCount, blockUser, unblockUser } from "../APIs/chats.js";
import store from '../redux/store.js';
import { setAllChats, setSelectedChat } from "../redux/userSlice.js";
import { setUploads, cancelUpload, addUploads, markUploading, markDone, markError, updateProgress } from "../redux/uploadSlice.js";
import './css/chatArea.css';
import MessageSkeleton from "./MessageSkeleton.js";

function ChatArea({ socket, onlineUsers, setShowCallScreen }) {
    const { selectedChat, user, allChats } = useSelector(state => state.userReducer);
    const { uploads } = useSelector(state => state.uploadReducer);
    const dispatch = useDispatch();
    const fileInputRef = useRef(null);

    // For message input
    const [message, setMessage] = useState('');
    const [allMsgs, setAllMsgs] = useState([]);
    const [typing, setTyping] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [typingData, setTypingData] = useState(null);

    const [open, setOpen] = useState(true); // for mobile view    
    const textareaRef = useRef(null); //text area ref
    const [pendingFiles, setPendingFiles] = useState([]);
    const [showMediaModal, setShowMediaModal] = useState(false);

    // For Message limiting
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const messageContainerRef = useRef(null); // Ref for the scrollable div

    /*
    Each upload object:
    { id, file, preview, progress, status: "queued" | "uploading" | "done" | "error" | "canceled", url, type, controller }
    */

    // File selection and Preview
    const handleFiles = (e) => {
        const rawFiles = Array.from(e.target.files).slice(0, 10);

        // Define limits in bytes
        const IMAGE_LIMIT = 5 * 1024 * 1024; // 5MB
        const VIDEO_LIMIT = 20 * 1024 * 1024; // 20MB

        const validFiles = rawFiles.filter(file => {
            const isVideo = file.type.startsWith("video");
            const isImage = file.type.startsWith("image");

            if (isImage && file.size > IMAGE_LIMIT) {
                toast.error(`${file.name} is too large (Max 5MB for images)`);
                return false;
            }
            if (isVideo && file.size > VIDEO_LIMIT) {
                toast.error(`${file.name} is too large (Max 20MB for videos)`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) {
            e.target.value = ""; // Reset input so user can try again
            return;
        }
        const previews = validFiles.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            type: file.type.startsWith("video") ? "video" : "image"
        }));
        setPendingFiles(previews);
        setShowMediaModal(true);

        // Clear the input value so the same file can be re-selected if needed
        e.target.value = "";
    };

    // 1. Simplified Modal Send: Just queue the files and close
    const handleModalSend = async () => {
        if (pendingFiles.length === 0) return;

        // Prepare to track uploads in Redux for the UI progress bars
        const filesToUpload = pendingFiles.map(p => p.file);
        dispatch(addUploads(filesToUpload)); // Starts the background upload process

        setShowMediaModal(false);
        setPendingFiles([]);
    };

    // 2. AUTO-TRIGGER: Watch for queued files and start uploading them
    useEffect(() => {
        const queuedItems = uploads.filter(u => u.status === "queued" && !u.started);
        queuedItems.forEach(item => uploadFile(item));
    }, [uploads]);

    // 3. AUTO-SEND: Watch for completion and send to DB/Socket
    useEffect(() => {
        const isPending = uploads.some(u => u.status === "uploading" || u.status === "queued");
        const hasMedia = uploads.length > 0;

        // If we have media and nothing is pending anymore, send the message
        if (hasMedia && !isPending && uploads.every(u => u.status === "done")) {
            sendMessage();
        }
    }, [uploads]);

    //Upload function 
    const uploadFile = async (uploadItem) => {
        // 1. Mark as started immediately to prevent loop
        dispatch(markUploading(uploadItem.id));

        const formData = new FormData();
        formData.append("file", uploadItem.file);
        formData.append("upload_preset", process.env.REACT_APP_CLOUD_FOLDER);

        try {
            const res = await axios.post(
                `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUD}/auto/upload`,
                formData,
                {
                    signal: uploadItem.controller.signal,
                    onUploadProgress: (e) => {
                        const percent = Math.round((e.loaded * 100) / e.total);
                        dispatch(updateProgress({ id: uploadItem.id, progress: percent }));
                    }
                }
            );

            dispatch(markDone({
                id: uploadItem.id,
                url: res.data.secure_url,
                type: res.data.resource_type === "video" ? "video" : "image"
            }));

        } catch (err) {
            if (axios.isCancel(err)) dispatch(markError(uploadItem.id));
        }
    };

    // Cancel upload button
    const doNotUpload = (id) => {
        dispatch(cancelUpload(id));
    };

    //Function to send message
    const sendMessage = async () => {
        // Prevent double toast if called by useEffect
        const isUploading = uploads.some(u => u.status === "uploading" || u.status === "queued");
        if (isUploading) {
            return toast.error("Please wait for uploads to finish");
        }
        try {
            const completed = uploads.filter(u => u.status === "done");
            const media = completed.map(u => ({
                url: u.url,
                type: u.type
            }));

            const msg = {
                chatId: selectedChat._id,
                sender: user._id,
                text: message.trim(),
                media
            }

            socket.emit('send-message', {
                ...msg,
                members: selectedChat.members.map(m => m._id),
                read: false,
                createdAt: Date.now(),
                senderName: user.firstName
            });

            const response = await newMessage(msg);
            if (response.success) {
                setMessage('');
                if (textareaRef.current) textareaRef.current.style.height = "40px"; // Reset to default
                setShowEmoji(false);
                dispatch(setUploads([]))
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    // Cancel upload on refresh or logout
    useEffect(() => {
        const handleUnload = () => {
            uploads.forEach(u => u.controller.abort());
        };

        window.addEventListener("beforeunload", handleUnload);
        return () => window.removeEventListener("beforeunload", handleUnload);
    }, [uploads]);

    //Function to get message of the selected user
    const getAllMsg = async (isInitial = false) => {
        if (!selectedChat || (loadingMore && !isInitial)) return;

        if (isInitial) {
            setIsInitialLoading(true); // Start loading skeleton
            setSkip(0);
            setHasMore(true);
            setAllMsgs([]);
        }
        else{
            setLoadingMore(true);
        }
            
        try {
            const currentSkip = isInitial ? 0 : skip;
            const response = await getMessages(selectedChat._id, currentSkip, 100);
            if (response.success) {
                const newMsgs = response.data.reverse();

                if (isInitial) {
                    setAllMsgs(newMsgs);
                    setSkip(newMsgs.length);
                    // Scroll to bottom on first load
                    setTimeout(() => {
                        if (messageContainerRef.current)
                            messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
                    }, 100);
                } else {
                    // Record height before prepending
                    const prevHeight = messageContainerRef.current.scrollHeight;
                    setAllMsgs(prev => [...newMsgs, ...prev]);
                    setSkip(prev => prev + newMsgs.length);

                    // Restore scroll position after DOM updates
                    setTimeout(() => {
                        const newHeight = messageContainerRef.current.scrollHeight;
                        messageContainerRef.current.scrollTop = newHeight - prevHeight;
                    }, 0);
                }
                setHasMore(response.hasMore);
            }
            setLoadingMore(false);
        } catch (error) {
            toast.error(error.message);
            console.error(error);
        }
        finally{
            setLoadingMore(false);
            setIsInitialLoading(false);
        }
    }

    // Scroll Event Handler
    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        // 1. Don't trigger if we are already loading
        // 2. Don't trigger if the initial load hasn't finished
        // 3. ONLY trigger if scrollTop is 0 AND we have messages (meaning we are at the top of a list)
        if (scrollTop === 0 && hasMore && !loadingMore && !isInitialLoading && allMsgs.length > 0) {
            getAllMsg(false);
        }
};

    // Function to clear unread message when a user is selected
    const clearUnreadMessage = async () => {
        if (!selectedChat) return;
        try {
            socket.emit('clear-unread-message', {
                chatId: selectedChat?._id,
                members: selectedChat?.members?.map(m => m._id)
            });

            const response = await clearUnreadMessageCount(selectedChat?._id);
            if (response.success) {
                allChats.map(chat => {
                    if (chat._id === selectedChat?._id) return response.data;
                    return chat;
                })
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    // Main useEffect to listen socket events
    useEffect(() => {
        if(selectedChat) getAllMsg(true); // Reset and fetch first 100
        if (selectedChat?.lastMessage?.sender !== user?._id) { clearUnreadMessage(); }

        socket.off('receive-message').on('receive-message', (message) => {
            // console.log(message);
            const selectedChat = store.getState().userReducer.selectedChat;
            if (!selectedChat) return;
            if (selectedChat?._id === message.chatId) {
                setAllMsgs(prevMsg => [...prevMsg, message]);
                if (message.sender !== user._id) {
                    clearUnreadMessage();
                }
            }
        });

        socket.on('message-count-cleared', data => {
            const { selectedChat, allChats } = store.getState().userReducer;
            if (!selectedChat) return;
            if (selectedChat?._id === data.chatId) {
                //Update the unread message count
                const updatedChats = allChats.map(chat => {
                    if (chat._id === data.chatId) {
                        return { ...chat, unreadMessageCount: 0 }
                    }
                    return chat;
                })
                dispatch(setAllChats(updatedChats));

                //update the read property of the message
                setAllMsgs(prevMsgs => {
                    return prevMsgs.map(msg => {
                        return { ...msg, read: true }
                    })
                })
            }
        });

        socket.on('started-typing', (data) => {
            setTypingData(data);
            if (!selectedChat) return;
            if (selectedChat?._id === data.chatId && data.sender !== user?._id) {
                setTyping(true);
                setTimeout(() => {
                    setTyping(false);
                }, 3000)
            }
        });

        // Listen for busy signal
        socket.on('user-busy', (data) => {
            toast.error(`${selectedUser?.firstName} is currently on another call.`);
            setShowCallScreen(false); // Close the initiator screen if it opened
        });

        return () =>{
            socket.off('started-typing');
            socket.off('user-busy');
            socket.off('receive-message');
            socket.off('message-count-cleared');
        }

    }, [selectedChat?._id]);

    // Object to store detials of current selected user
    let selectedUser;
    if (selectedChat) {
        selectedUser = selectedChat.members.find(u => u._id !== user._id);
    }

    // Function to format timestamp of message
    const formatTime = (timestamp) => {
        const diff = moment().diff(moment(timestamp), 'days');
        if (diff < 1) {
            return `Today ${moment(timestamp).format('hh:mm A')}`
        }
        else if (diff === 1) {
            return `Yesterday ${moment(timestamp).format('hh:mm A')}`
        }
        else {
            return moment(timestamp).format('MMM D,hh:mm A')
        }
    }

    // Auto scroll to bottom when a new message arrives
    useEffect(() => {
        const msgContainer = document.getElementById('main-chat-area');
        if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
    }, [allMsgs, typing]);

    const handleTextareaChange = (e) => {
        const val = e.target.value;
        setMessage(val);

        // Auto-expand logic
        const target = e.target;
        target.style.height = "inherit"; // Reset height to calculate correctly
        const newHeight = Math.min(target.scrollHeight, 150); // Cap at 150px
        target.style.height = `${newHeight}px`;

        socket.emit('user-typing', {
            chatId: selectedChat._id,
            members: selectedChat.members.map(m => m._id),
            sender: user._id
        });
    };

    // Function to handle call
    const handleCall = () => {
        if (onlineUsers?.has(selectedUser._id)) setShowCallScreen(true);       
        else toast.error(`${selectedUser.firstName} is offline !`);
    }

    // Funtion to handle user blocking and unblocking
    const handleBlockAction = async () => {
        const isCurrentlyBlocked = selectedChat.isBlocked;
        const res = isCurrentlyBlocked
            ? await unblockUser({ chatId: selectedChat._id })
            : await blockUser({ chatId: selectedChat._id, blockedBy: user._id });

        if (res.success) {
            // Updated Chat Data from Server
            const updatedChat = res.data;
            dispatch(setSelectedChat(updatedChat));

            const updatedList = allChats.map(c =>
                c._id === updatedChat._id ? updatedChat : c
            );
            dispatch(setAllChats(updatedList));

            // Inform the other user via socket
            const socketEvent = isCurrentlyBlocked ? "unblock-chat" : "block-chat";
            socket.emit(socketEvent, {
                chatId: selectedChat._id,
                blockedBy: isCurrentlyBlocked ? null : user._id,
                members: selectedChat.members.map(m => m._id)
            });
            toast.success(isCurrentlyBlocked ? "User Unblocked" : "User Blocked");
        }
    };

    // FULL SCREEN VIEWER
    const [previewIndex, setPreviewIndex] = useState(null); // Index of media being viewed
    const [activeMediaList, setActiveMediaList] = useState([]); // The array of media for the current modal

    return (<>{
        <div className="app-chat-area" style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}>
            {/* Chat Header */}
            <div className="app-chat-area-header flex items-center gap-3 w-full">
                {/* Back Button */}
                <button className="fa fa-arrow-left m-[10px]" onClick={() => { setOpen(false); dispatch(setSelectedChat(null)) }}>
                </button>

                {/* Avatar */}
                <div className="avatar">
                    <div className="logged-user-profile-pic">
                        {selectedUser?.profilePic ? (
                            <img className="rounded-full" src={selectedUser?.profilePic} />
                        ) : ((selectedUser?.firstName?.[0] || "") + (selectedUser?.lastName?.[0] || ""))}
                    </div>
                </div>

                {/* Name + Status */}
                <div className="flex flex-col justify-center leading-tight">
                    <span className="font-medium text-[16px]">{selectedUser.firstName + " " + selectedUser.lastName}</span>
                    <span className="text-sm text-gray-500">{onlineUsers?.has(selectedUser._id) ? "Online" : "Offline"}</span>
                </div>

                {/* SPACER: This pushes everything after it to the right */}
                <div className="flex-grow"></div>

                {/* Video Call Button */}
                <div className="flex items-center gap-6 mr-4">
                    <button className="fa fa-lg fa-video-camera text-zinc-500 hover:text-emerald-500 transition-colors text-xl"
                        title="Start Video Call"
                        onClick={handleCall}
                    />

                    {/* Block and Unblock user button */}
                    {(!selectedChat.isBlocked || selectedChat.blockedBy === user._id) && (
                        <button onClick={handleBlockAction} title={selectedChat.isBlocked ? "Unblock User" : "Block User"}
                            className={`${selectedChat.isBlocked ? "fa-unlock text-emerald-500" : "fa-ban text-red-500"} fa fa-lg hover:opacity-80 transition-opacity `}>
                        </button>
                    )}
                </div>
            </div>

            {/* <!--Chat Area--> */}
            <div className="main-chat-area" id="main-chat-area" ref={messageContainerRef} onScroll={handleScroll} style={{overflowY : 'auto'}}>
                {isInitialLoading ? (<MessageSkeleton/>) : ( <>
                    {loadingMore && <div className="text-center p-2 text-xs text-gray-400">Loading...</div>}
                {allMsgs.map((msg) => {
                    let isSender = msg.sender === user._id;
                    return <div key={msg._id} className="message-container" style={{ justifyContent: isSender ? 'end' : 'start' }}>
                        <div>
                            <div className={isSender ? "send-message" : "received-message"}>

                                {/* Media Grid Display */}
                                {msg.media && msg.media.length > 0 && (
                                    <div className={`media-grid-container count-${Math.min(msg.media.length, 4)}`}>
                                        {msg.media.slice(0, 4).map((item, idx) => {
                                            const isLast = idx === 3;
                                            const remaining = msg.media.length - 4;

                                            return (
                                                <div key={idx}
                                                    className="relative cursor-pointer overflow-hidden rounded-md group"
                                                    onClick={() => {
                                                        setActiveMediaList(msg.media);
                                                        setPreviewIndex(idx);
                                                    }}
                                                >
                                                    {item.type === "video" ? (
                                                        <div className="relative h-full w-full">
                                                            <video src={item.url} className="h-full w-full object-cover" />
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                                <i className="fa fa-play text-white text-xl"></i>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <img src={item.url} alt="media" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                                    )}

                                                    {/* The +N Overlay */}
                                                    {isLast && remaining > 0 && (
                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                            <span className="text-white text-2xl font-bold">+{remaining}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {msg.text && <div className="mt-1 text-[15px]">{msg.text}</div>}
                            </div>
                            <div className="message-timestamp" style={isSender ? { float: 'right' } : { float: 'left' }}>
                                {formatTime(msg.createdAt)}
                                {isSender && (<i className={`fa ${msg.read ? "fa-check-circle text-[#e74c3c]" : "fa-check text-gray-400"} ml-1`} />)}
                            </div>
                        </div>
                    </div>
                })}

                </>)}
                
                {/* Live Upload Progress - Styled as sending messages */}
                {uploads.filter(u => u.status !== "done").map((u) => (
                    <div key={u.id} className="message-container justify-end">
                        <div className="send-message opacity-80 min-w-[150px]">
                            <div className="relative rounded-lg overflow-hidden bg-zinc-900">
                                {u.type === "video" ? (
                                    <video src={u.preview} className="w-full h-32 object-cover opacity-50" />
                                ) : (
                                    <img src={u.preview} className="w-full h-32 object-cover opacity-50" />
                                )}

                                <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                                    {u.status === "uploading" ? (
                                        <>
                                            <div className="text-xs mb-1 text-white font-bold">{u.progress}%</div>
                                            <div className="w-full bg-gray-700 h-1 rounded-full">
                                                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${u.progress}%` }} />
                                            </div>
                                            <button onClick={() => doNotUpload(u.id)} className="mt-2 text-[10px] bg-red-500/80 px-2 py-0.5 rounded">Cancel</button>
                                        </>
                                    ) : (
                                        <i className="fa fa-spinner fa-spin text-white"></i>
                                    )}
                                </div>
                            </div>
                            <div className="text-[10px] mt-1 text-right text-zinc-400 italic">Sending...</div>
                        </div>
                    </div>
                ))}
                {selectedChat?.members?.some(m => m._id === typingData?.sender) && typing && (<div className="typing-indicator"> <i>Typing...</i> </div>)}
            </div>

            {/* <!--SEND MESSAGE--> */}
            {showEmoji && (
                <div className="emoji-picker-container">
                    <EmojiPicker onEmojiClick={(e) => setMessage(message + e.emoji)}
                        width="100%" height="400px" theme="auto" searchDisabled={false} skinTonesDisabled />
                </div>
            )}

            {selectedChat.isBlocked ? (
                <div className="w-full py-4 bg-zinc-200 text-center text-sm border-t border-white/5">
                    {selectedChat.blockedBy === user._id ? (
                        <span>You have blocked this user.
                            <button onClick={handleBlockAction} className="text-emerald-500 font-bold ml-1">Unblock</button>
                        </span>
                    ) : (
                        <span>You have been blocked by this user. You can no longer send messages.</span>
                    )}
                </div>
            ) : (
                <div className="send-message-div">
                    <textarea
                        ref={textareaRef}
                        className="send-message-input"
                        value={message}
                        onChange={handleTextareaChange}
                        placeholder="Type a message"
                        rows="1"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) { // Send on Enter, New line on Shift+Enter
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                    />
                    <label>
                        <button type="button" className={`img-btn fa fa-regular fa-image hidden sm:flex btn btn-circle text-emerald-500`}
                            onClick={() => fileInputRef.current?.click()}>
                        </button>
                        <input type="file" id="file" multiple style={{ display: 'none' }} accept="image/*,video/*"
                            onChange={handleFiles} ref={fileInputRef} />
                    </label>
                    <button className="fa fa-regular fa-face-smile send-emoji-btn" aria-hidden="true" onClick={() => { setShowEmoji(!showEmoji) }}></button>
                    <button disabled={!message.trim()} className="fa fa-paper-plane send-message-btn" onClick={() => sendMessage()}></button>
                </div>)}

        </div>}

        {/* PREVIEW MODAL */}
        {showMediaModal && (
            <div className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-zinc-900 w-full max-w-2xl rounded-2xl flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="text-white font-medium">Send {pendingFiles.length} media items</h3>
                        <button onClick={() => { setShowMediaModal(false); setPendingFiles([]) }} className="fa fa-times text-zinc-400 hover:text-white"></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4">
                        {pendingFiles.map((item, i) => (
                            <div key={i} className="relative group rounded-xl overflow-hidden border border-zinc-800">
                                {item.type === "video" ? (
                                    <video src={item.preview} className="w-full h-48 object-cover" />
                                ) : (
                                    <img src={item.preview} className="w-full h-48 object-cover" />
                                )}
                                <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white">
                                    {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-zinc-800/50 flex justify-end gap-3">
                        <button className="px-6 py-2 text-zinc-400 hover:text-white" onClick={() => setShowMediaModal(false)}>Cancel</button>
                        <button className="px-8 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-medium transition-colors"
                            onClick={handleModalSend}>
                            Send
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* FULL SCREEN GRID MODAL */}
        {previewIndex !== null && (
            <div className="fixed inset-0 z-[4000] bg-black/95 flex flex-col items-center justify-center">
                {/* Close Button */}
                <button
                    className="absolute top-6 right-8 text-white text-3xl hover:text-gray-300 z-50"
                    onClick={() => setPreviewIndex(null)}
                >
                    <i className="fa fa-times"></i>
                </button>

                {/* Navigation - Prev */}
                {previewIndex > 0 && (
                    <button
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                        onClick={() => setPreviewIndex(prev => prev - 1)}
                    >
                        <i className="fa fa-chevron-left text-xl"></i>
                    </button>
                )}

                {/* Media Content */}
                <div className="max-w-4xl max-h-[80vh] flex items-center justify-center p-4">
                    {activeMediaList[previewIndex].type === "video" ? (
                        <video
                            src={activeMediaList[previewIndex].url}
                            controls
                            autoPlay
                            className="max-w-full max-h-full rounded-lg shadow-2xl"
                        />
                    ) : (
                        <img
                            src={activeMediaList[previewIndex].url}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            alt="preview"
                        />
                    )}
                </div>

                {/* Navigation - Next */}
                {previewIndex < activeMediaList.length - 1 && (
                    <button
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                        onClick={() => setPreviewIndex(prev => prev + 1)}
                    >
                        <i className="fa fa-chevron-right text-xl"></i>
                    </button>
                )}

                {/* Counter Info */}
                <div className="absolute bottom-10 text-white/70 text-sm font-medium">
                    {previewIndex + 1} / {activeMediaList.length}
                </div>
            </div>
        )}
    </>)
}

export default ChatArea;