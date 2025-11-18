import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import moment from 'moment';
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";

import { newMessage, getMessages } from "../APIs/message.js";
import { clearUnreadMessageCount } from "../APIs/chats.js";
import store from '../redux/store.js';
import { setAllChats, setSelectedChat } from "../redux/userSlice.js";
import './chatArea.css';

function ChatArea({socket, onlineUsers}) {
    const { selectedChat, user, allChats } = useSelector(state => state.userReducer);
    const dispatch = useDispatch();
    const fileInputRef = useRef(null);

    const [message, setMessage] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [allMsgs, setAllMsgs] = useState([]);
    const [typing, setTyping] = useState(false);
    const[showEmoji, setShowEmoji] = useState(false);
    const [typingData, setTypingData] = useState(null);

    //Function to send message
    const sendMessage = async () => {
        try {
            const msg = {
                chatId : selectedChat._id,
                sender: user._id,
                text : message.trim(),
                image: imagePreview || null
            }

            socket.emit('send-message', {
                ...msg,
                members : selectedChat.members.map(m=>m._id),
                read : false,
                createdAt : Date.now()
            });
            const response = await newMessage(msg);
            if(response.success){
                setMessage('');
                setImagePreview(null);
                setShowEmoji(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    //Function to get message of the selected user
    const getAllMsg = async ()=>{
        if (!selectedChat) return; 
        try {
            const response  = await getMessages(selectedChat._id);
            if(response.success){
                setAllMsgs(response.data);
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    // Function to clear unread message when a user is selected
    const clearUnreadMessage = async ()=>{
        if (!selectedChat) return; 
        try {
            socket.emit('clear-unread-message',{
                chatId : selectedChat?._id,
                members : selectedChat?.members?.map(m=>m._id)
            });

            const response  = await clearUnreadMessageCount(selectedChat?._id);
            if(response.success){
                allChats.map(chat=>{
                    if(chat._id===selectedChat?._id)return response.data;
                    return chat;
                })
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    useEffect(()=>{
        getAllMsg();
        if(selectedChat?.lastMessage?.sender !== user?._id) {clearUnreadMessage();}

        socket.off('receive-message').on('receive-message', (message)=>{
            // console.log(message);
            const selectedChat = store.getState().userReducer.selectedChat;
            if (!selectedChat) return; 
            if(selectedChat?._id === message.chatId) {
                setAllMsgs(prevMsg =>[...prevMsg, message]);
                if(message.sender !== user._id){
                    clearUnreadMessage();
                }
            }
        });

        socket.on('message-count-cleared', data=>{
            const {selectedChat, allChats} = store.getState().userReducer;
            if (!selectedChat) return; 
            if(selectedChat?._id === data.chatId){
                //Update the unread message count
                const updatedChats = allChats.map(chat=>{
                    if(chat._id === data.chatId){
                        return {...chat, unreadMessageCount : 0}
                    }
                    return chat;
                })
                dispatch(setAllChats(updatedChats));

                //update the read property of the message
                setAllMsgs(prevMsgs =>{
                    return prevMsgs.map(msg =>{
                        return {...msg, read:true}
                    })
                })
            }
        });

        socket.on('started-typing', (data)=>{
            setTypingData(data);
            if (!selectedChat) return; 
            if(selectedChat?._id === data.chatId && data.sender !== user?._id){
                setTyping(true);
                setTimeout(()=>{
                    setTyping(false);
                },2000)
            }
        });

    },[selectedChat]);

    let selectedUser;
    if (selectedChat) {
        selectedUser = selectedChat.members.find(u => u._id !== user._id);
    }

    const formatTime = (timestamp)=>{
        const diff = moment().diff(moment(timestamp), 'days');
        if(diff<1){
            return `Today ${moment(timestamp).format('hh:mm A')}`
        }
        else if(diff === 1){
            return `Yesterday ${moment(timestamp).format('hh:mm A')}`
        }
        else{
            return moment(timestamp).format('MMM D,hh:mm A')
        }
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file?.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
        setImagePreview(reader.result);
        };
    };

    const removeImage = () => {
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    useEffect(()=>{
        const msgContainer = document.getElementById('main-chat-area');
        if(msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
    },[allMsgs, typing]);

    const [open, setOpen] = useState(true);

    return (<>{
        <div className="app-chat-area" style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}>
            {/* Chat Header */}
            <div className="app-chat-area-header flex items-center gap-3">
                {/* Back Button */}
                <button className="fa fa-arrow-left m-[10px]" onClick={() => {setOpen(false);dispatch(setSelectedChat(null))}}> 
                </button>

                {/* Avatar */}
                <div className="avatar">
                <div className="logged-user-profile-pic">
                {selectedUser?.profilePic ? (
                <img className="rounded-full" src={selectedUser?.profilePic} />
                ) : ((selectedUser?.firstName?.[0] || "") +(selectedUser?.lastName?.[0] || ""))}
                </div>
                </div>

                {/* Name + Status */}
                <div className="flex flex-col justify-center leading-tight">
                    <span className="font-medium text-[16px]">{selectedUser.firstName + " " + selectedUser.lastName}</span>
                    <span className="text-sm text-gray-500">{onlineUsers?.includes(selectedUser._id) ? "Online" : "Offline"}</span>
                </div>   
            </div>

            {/* <!--Chat Area--> */}
            <div className="main-chat-area" id="main-chat-area">
                {allMsgs.map((msg)=>{
                    let isSender = msg.sender === user._id;
                return <div key={msg._id}className ="message-container" style={isSender?{justifyContent:'end'}:{justifyContent:'start'}}>
                    <div>
                        <div className={isSender?"send-message":"received-message"}>
                            <div>{msg.image && <img src = {msg.image} alt="image" height='150' width='150'/>}</div>
                            <div>{msg.text}</div>
                        </div>
                        <div className="message-timestamp" style={isSender?{float:'right'}:{float:'left'}}>
                            {formatTime(msg.createdAt)}{isSender && msg.read && <i className="fa fa-check-circle" aria-hidden='true' style = {{color :'#e74c3c'}}></i>}
                        </div>
                    </div>
                </div>})}
                {selectedChat?.members.map(m=>m._id).includes(typingData?.sender) && typing && <div className = "typing-indicator"><i>typing...</i></div>}
            </div>
                    
            {/* <!--SEND MESSAGE--> */}
            {showEmoji && <span><EmojiPicker onEmojiClick={(e)=>setMessage(message+e.emoji)}></EmojiPicker></span>}
            {imagePreview && (
                <div className="mb-3">
                    <div className="relative inline-block rounded-lg ">
                    {/* Close button */}
                    <img src='x-solid-full.svg' onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-black/60 text-white w-6 h-6 flex items-center justify-center rounded-full shadow "/>
                    
                    {/* Image */}
                    <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg border border-zinc-800"/>
                    </div>
                </div>
            )}

            <div className="send-message-div">
                <input type="text" className="send-message-input" value = {message} 
                onChange={(e)=>{
                    setMessage(e.target.value); 
                    socket.emit('user-typing',{
                        chatId : selectedChat._id, 
                        members : selectedChat.members.map(m=>m._id),
                        sender : user._id
                    })
                }}
                placeholder="Type a message" onKeyDown={(e) => {if (e.key === "Enter") {e.preventDefault();sendMessage();}}}/>
                
                <label>
                    <button type="button" className={`img-btn fa fa-picture-o hidden sm:flex btn btn-circle ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
                        onClick={() => fileInputRef.current?.click()}>
                    </button>
                    <input type="file" id="file" style={{display:'none'}} accept="image/*" onChange={handleImageChange} ref={fileInputRef}/>
                </label>
                <button className="fa fa-smile-o send-emoji-btn" aria-hidden="true" onClick={()=>{setShowEmoji(!showEmoji)}}></button>
                <button disabled={!message.trim() && !imagePreview} className="fa fa-paper-plane send-message-btn" onClick={()=>sendMessage()}></button>
            </div>
        </div>}
    </>)
}

export default ChatArea;