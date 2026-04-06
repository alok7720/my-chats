import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import http from 'http';
import { Server } from 'socket.io';

// ----- For deployment -----
import path from 'path';
const __dirname = path.resolve();
// --------------------------

dotenv.config();

import { connectDB } from './lib/connectDB.js';
import authRouter from './controllers/authController.js';
import userRouter from './controllers/userController.js';
import chatRouter from './controllers/chatController.js';
import messageRouter from './controllers/messageController.js';

connectDB();

const app = express();

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(cookieParser());
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
app.use(express.json());

//Use  router controllers, API endpoints
app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/chat', chatRouter);
app.use('/message', messageRouter);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] } });
const port = process.env.PORT;

// ------ For Deployment ------
if (process.env.MODE === "production") {
    app.use(express.static(path.join(__dirname, "../client/build")));

    app.get(/.*/, (req, res) => {
        res.sendFile(path.join(__dirname, "../client", "build", "index.html"));
    });
}
// ----------------------------

server.listen(port, () => { console.log("Server running on port : " + port) });

//Test Socket connetion from client
// Key: userId (String), Value: Set of socketIds
let onlineUsers = new Map();
// Key: socketId (String), Value: userId (String) - The Reverse Map
let socketToUser = new Map();

// Set to store userIds currently in a call
const onCall = new Set();

io.on('connection', socket => {

    socket.once('user-logged-in', (userId) => {
        socket.join(userId);

        // 1. Map UserId to Socket
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        // 2. Map Socket back to UserId (Reverse Map for O(1) disconnect)
        socketToUser.set(socket.id, userId);

        // Broadcast unique user IDs only
        io.emit('online-users', Array.from(onlineUsers.keys()));

        //send user socket id
        io.to(userId).emit('user-socket-id', socket.id);
        // console.log(`socket id : ${socket.id} sent to userId : ${userId}`);

    });

    // socket.on('send-message',(message)=>{
    //     // console.log(message);
    //     io.to(message.members[0]).to(message.members[1]).emit('receive-message', message);
    //     io.to(message.members[0]).to(message.members[1]).emit('set-message-count', message);
    // });

    socket.on("send-message", (message) => {
        const members = message.members;

        // emit once to each user
        members.forEach((memberId) => {
            io.to(memberId).emit("receive-message", message);
            io.to(memberId).emit("set-message-count", message);
        });
    });

    socket.on('clear-unread-message', (data) => {
        // console.log("Event : clear-unread-message | ",data);
        io.to(data.members[0]).to(data.members[1]).emit('message-count-cleared', data);
    });

    socket.on('user-typing', (data) => {
        // console.log("Event : user-typing | ", data);
        io.to(data.members[0]).to(data.members[1]).emit('started-typing', data);
    });

    socket.on("block-chat", (data) => {
        // Notify both members so their UI hides/shows the input area instantly
        data.members.forEach(memberId => {
            io.to(memberId).emit("chat-blocked-status", {
                chatId: data.chatId,
                isBlocked: true,
                blockedBy: data.blockedBy
            });
        });
    });

    socket.on("unblock-chat", (data) => {
        data.members.forEach(memberId => {
            io.to(memberId).emit("chat-blocked-status", {
                chatId: data.chatId,
                isBlocked: false,
                blockedBy: null
            });
        });
    });

    // ---- Video call events ----
    socket.on('call-to-user', (data) => {
        // Check if the recipient is already in another call
        if (onCall.has(data.calleeId)) {
            return socket.emit('user-busy', { userId: data.calleeId });
        }
        const recipientSockets = onlineUsers.get(data.calleeId);
        if (recipientSockets && recipientSockets.size > 0) {
            // Pick the first available socket for the recipient
            const targetSocketId = Array.from(recipientSockets)[0];
            io.to(targetSocketId).emit('incoming-call', data);
        }
        // console.log('Incoming call from User : ', data.caller_name, " -to- ", data.callee_name);
    });

    socket.on('reject-call', (data) => {
        // console.log(`Call rejected from : ${data.from_name}`);
        io.to(data.to).emit('call-rejected', { from: data.from_name });
    });

    // When the callee accepts, mark both as 'onCall'
    socket.on('accept-call', (data) => {
        onCall.add(data.callerId);   // Caller
        onCall.add(data.calleeId); // Callee (self)

        // console.log(`Call accepted from : ${data.callee_name}`);
        io.to(data.callerId).emit('call-accepted', data);
    });

    // When call initiator cancels call before callee accepts or reject it
    socket.on('cancel-call', (data) => {
        const recipientSockets = onlineUsers.get(data.to);
        if (recipientSockets) {
            recipientSockets.forEach(socketId => {
                io.to(socketId).emit('call-cancelled');
            });
        }
    });

    // When call ends, remove both from the set
    socket.on('end-call', (data) => {
        onCall.delete(data.callerId);
        onCall.delete(data.calleeId);

        // Notify the other party
        const otherUserSockets = onlineUsers.get(data.to);
        if (otherUserSockets) {
            otherUserSockets.forEach(id => io.to(id).emit('call-ended', { from: data.from_name }));
        }
        // console.log(`Call ended from : ${data.from_name}`);
    })
    // ------------------------------

    // Event for log out
    socket.on('user-logged-out', (userId) => {
        
        const userSockets = onlineUsers.get(userId); // Get the sockets associated with this user

        if (userSockets) {
            // Remove every socket of this user from the reverse map
            userSockets.forEach(socketId => {
                socketToUser.delete(socketId);
            });
        }
        onlineUsers.delete(userId);
        io.emit('online-users', Array.from(onlineUsers.keys()));
    });

    socket.on('disconnect', () => {

        // Instant lookup using reverse map
        const userId = socketToUser.get(socket.id);

        if (userId) {
            // Safety: Remove user from onCall if they crash/disconnect
            onCall.delete(userId);

            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id); // Remove this specific tab

                // Only broadcast if the user has NO more tabs open
                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);
                    io.emit('online-users', Array.from(onlineUsers.keys()));
                }
            }
            socketToUser.delete(socket.id); // Clean up reverse map

        }

        // console.log("A user disconnected :", socket.id);
        socket.broadcast.emit('disconnect-user', { user: userId });
    });

});
