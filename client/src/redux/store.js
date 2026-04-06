import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice.js";
import uploadReducer from "./uploadSlice.js"

const store = configureStore({
    reducer: { userReducer, uploadReducer },
    middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these paths in the state and actions
        ignoredActions: ['uploads/addUploads', 'uploads/setUploads'],
        ignoredPaths: ['uploadReducer.uploads'], 
      },
    }),
});

export default store;