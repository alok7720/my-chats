import { createSlice } from '@reduxjs/toolkit';

const uploadSlice = createSlice({
    name: 'uploads',
    initialState: {  
        uploads : []
    },
    reducers: { 
        setUploads : (state, action) => {state.uploads = action.payload},
        cancelUpload: (state, action) => {
            const item = state.uploads.find(u => u.id === action.payload);
            if (item) {
                item.controller.abort();
                item.status = "canceled";
            }
        },
        addUploads: (state, action) => {
            const newUploads = action.payload.map(file => ({
                id: crypto.randomUUID(),
                file,
                preview: URL.createObjectURL(file),
                type: file.type.startsWith("video") ? "video" : "image",
                progress: 0,
                status: "queued",
                started: false,
                controller: new AbortController()
            }));
        state.uploads.push(...newUploads);
        },
        markUploading: (state, action) => {
            const item = state.uploads.find(u => u.id === action.payload);
            if (item) {
                item.status = "uploading";
                item.started = true;
            }
        },
        updateProgress: (state, action) => {
            const item = state.uploads.find(u => u.id === action.payload.id);
            if (item) item.progress = action.payload.progress;
        },
        markDone: (state, action) => {
            const item = state.uploads.find(u => u.id === action.payload.id);
            if (item) {
                item.status = "done";
                item.url = action.payload.url;
                item.type = action.payload.type;
            }
        },
        markError: (state, action) => {
            const item = state.uploads.find(u => u.id === action.payload);
            if (item) item.status = "error";
        },
        resetToQueue: (state, action) => {
            const item = state.uploads.find(u => u.id === action.payload);
            if (item) {
                item.status = "queued";
                item.progress = 0;
                item.controller = new AbortController();
            }
        }
    }
});

export const { setUploads, addUploads, cancelUpload,markUploading, updateProgress, markDone,  markError, resetToQueue}  = uploadSlice.actions;
export default uploadSlice.reducer;