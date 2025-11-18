import Search from "./search";
import { useState } from "react";
import {useSelector} from 'react-redux';

import UserList from "./userList.js";
import SidebarSkeleton from './SidebarSkeleton.js'
import "./sidebar.css";

function Sidebar({socket, onlineUsers}){
    const { isChatLoading } = useSelector(state => state.userReducer);
    const [searchKey, setSearchKey] = useState('');

    return (<div className="app-sidebar">
                {/* <!--SEARCH USER--> */}
                <Search searchKey={searchKey} setSearchKey={setSearchKey}/>

                {/* <!--USER LIST--> */}
                {(isChatLoading)?<SidebarSkeleton/>:<UserList searchKey = {searchKey} socket={socket} onlineUsers={onlineUsers}/>}
            </div>);
}

export default Sidebar;