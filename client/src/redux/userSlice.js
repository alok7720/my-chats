import { createSlice } from '@reduxjs/toolkit';

const userSlice = createSlice({
    name: 'user',
    initialState: {
        user : null,
        allUsers:[],
        allChats : [],
        selectedChat : null,
        isAuthLoading:true,
        isChatLoading:true
    },
    reducers: {
        setUser: (state, action) => { state.user = action.payload; state.isAuthLoading=false},
        clearUser(state) { state.user = null; state.isAuthLoading = false;},
        setAllUsers: (state, action) => { state.allUsers = action.payload; },
        setAllChats: (state, action) => { state.allChats = action.payload; state.isChatLoading=false},
        setSelectedChat: (state, action) => { state.selectedChat = action.payload; }
    }
});

export const {setUser,clearUser, setAllUsers, setAllChats, setSelectedChat}  = userSlice.actions;
export default userSlice.reducer;