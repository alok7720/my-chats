import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import moment from "moment";

import { newChats } from "../APIs/chats.js";
import { setAllChats, setSelectedChat } from "../redux/userSlice.js";
import store from "../redux/store.js";
import "./css/userList.css";

function UserList({ searchKey, socket, onlineUsers}) {
  const { allUsers, allChats, user: currentUser, selectedChat } = useSelector((state) => state.userReducer);
  const dispatch = useDispatch();

  // PRECOMPUTED FAST LOOKUP: userId → chat
  const chatByUserIdMap = useMemo(() => {
    const map = {};
    allChats.forEach((chat) => {
      const other = chat.members.find((m) => m._id !== currentUser._id);
      if (other) map[other._id] = chat;
    });
    return map;
  }, [allChats, currentUser._id]);

  // CREATE CHAT
  const createNewChat = async (searchedUserId) => {
    try {
      const response = await newChats([currentUser._id, searchedUserId]);
      if (!response.success) return toast.error(response.message);
      toast.success(response.message);
      const newChat = response.data;

      // Avoid duplicates
      const exists = chatByUserIdMap[searchedUserId];
      if (!exists) {
        dispatch(setAllChats([...allChats, newChat]));
      }
      dispatch(setSelectedChat(newChat));
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Funtion to Open chat when a user is clicked
  const showChat = (userId) => {
    const chat = chatByUserIdMap[userId];
    if (chat) {
      dispatch(setSelectedChat(chat));
    }
  };

  const isSelectedChat = (user) => {
    return (
      selectedChat &&
      selectedChat.members.some((m) => m._id === user._id)
    );
  };

  // LAST MESSAGE + TIME + UNREAD
  const getLastMessage = (userId) => {
    const chat = chatByUserIdMap[userId];
    if (!chat?.lastMessage) return "";

    const lastMsg = chat.lastMessage;
    const prefix = lastMsg.sender === currentUser._id ? "You: " : "";
    
    // 1. Check if media exists and actually contains files
    if (lastMsg.media && lastMsg.media.length > 0) {
        const count = lastMsg.media.length;
        const fileText = count === 1 ? "media file" : "media files";
        return `${prefix}${count} ${fileText}`;
    }

    // 2. Fallback to text if no media or media length is 0
    if (lastMsg.text) {
        if (lastMsg.text.length < 25) {
            return prefix + lastMsg.text;
        } else {
            return prefix + lastMsg.text.substring(0, 25) + "...";
        }
    }
  };

  const getLastMessageTime = (userId) => {
    const chat = chatByUserIdMap[userId];
    return chat?.lastMessage ? moment(chat.lastMessage.createdAt).format("hh:mm A"): "";
  };

  const getUnreadCount = (userId) => {
    const chat = chatByUserIdMap[userId];
    if (!chat) return "";
    if (chat.lastMessage?.sender === currentUser._id) return "";

    if (chat.unreadMessageCount > 0) {
      return (
        <div className="unread-message-counter">
          {chat.unreadMessageCount}
        </div>
      );
    }
    return "";
  };

  // SOCKET: LISTEN FOR NEW MESSAGES → UPDATE CHATLIST
  useEffect(() => {
    socket.on("set-message-count", (message) => {
      let { selectedChat, allChats } = store.getState().userReducer;

      // Update unread count only if chat is NOT currently open
      if (selectedChat?._id !== message.chatId) {
        allChats = allChats.map((chat) =>
          chat._id === message.chatId
            ? {
                ...chat,
                unreadMessageCount: (chat.unreadMessageCount || 0) + 1,
                lastMessage: message,
              }
            : chat
        );
      }

      // Reorder chat to top
      const latest = allChats.find((c) => c._id === message.chatId);
      const others = allChats.filter((c) => c._id !== message.chatId);
      dispatch(setAllChats([latest, ...others]));
    });
  }, []);

  // SEARCH LOGIC
  const searchTerm = searchKey.trim().toLowerCase();

  const filteredList = useMemo(() => {
    // Case 1: No search → show chats
    if (!searchTerm) {
      return allChats.map((chat) => {
        const other = chat.members.find(
          (m) => m._id !== currentUser._id
        );
        return { user: other, chat };
      });
    }

    // Case 2: Searching → show users
    return allUsers
      .filter(
        (u) =>
          u.firstName.toLowerCase().includes(searchTerm) ||
          u.lastName.toLowerCase().includes(searchTerm)
      )
      .map((u) => ({
        user: u,
        chat: chatByUserIdMap[u._id] || null,
      }));
  }, [searchTerm, allChats, allUsers, chatByUserIdMap, currentUser._id]);

  // CLEAR UNREAD WHEN CHAT IS SELECTED
  useEffect(() => {
    if (!selectedChat) return;

    socket.emit("clear-unread-message", {
      chatId: selectedChat._id,
      members: selectedChat.members.map((m) => m._id),
    });

    // Update unread count locally
    const updated = allChats.map((chat) =>
      chat._id === selectedChat._id
        ? { ...chat, unreadMessageCount: 0 }
        : chat
    );

    dispatch(setAllChats(updated));
  }, [selectedChat]);

  // Show empty state message
  if (!allChats.length && !searchKey) {
      return (
          <div className="w-full h-70 flex fles-col items-center justify-center text-gray-500 bold p-4">
            <i className="fa fa-user-circle fa-2x"></i>
              Search for a user to get started
          </div>
      );
  }

  return (
    <div className="user-search-filter">
      {filteredList.map(({ user, chat }) => {
        const isOnline = onlineUsers.has(user._id);

        return (
          <div key={user._id} className="user-search-filter" onClick={() => showChat(user._id)}>
            <div className={ isSelectedChat(user) ? "selected-user": "filtered-user"}>
              <div className="filter-user-display">
                {/* Avatar */}
                {user.profilePic ? (<img src={user.profilePic} className="user-profile-image" style={ isOnline ? { border: "#00ff6eff 4px solid" } : {}}/>
                ) : (<div className={isSelectedChat(user) ? "user-selected-avatar" : "user-default-profile-pic"}
                    style={ isOnline ? { border: "#00ff6eff 4px solid" } : {}}>
                    {(user.firstName[0] + user.lastName[0]).toUpperCase()}
                    </div>
                )}

                {/* Details */}
                <div className="filter-user-details">
                  <div className="user-display-name">{(user.firstName + " " + user.lastName).toUpperCase()}</div>
                  <div className="user-display-email">{getLastMessage(user._id)}</div>
                </div>

                {/* unread + time */}
                <div className="flex flex-col items-end">{getUnreadCount(user._id)}
                  <div className="last-message-timestamp">{getLastMessageTime(user._id)}</div>
                </div>

                {/* Start Chat */}
                {!chat && (<button className="user-start-chat-btn" onClick={(e) => {e.stopPropagation(); createNewChat(user._id);}}>
                    Start Chat
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default UserList;