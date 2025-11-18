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

import {connectDB} from './lib/connectDB.js';
import authRouter from './controllers/authController.js';
import userRouter from './controllers/userController.js';
import chatRouter  from './controllers/chatController.js';
import messageRouter from './controllers/messageController.js';

connectDB();

const app = express();

app.use(cors({
    origin : 'http://localhost:3000',
    credentials:true}));
app.use(cookieParser());
app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({limit: '5mb', extended: true}));
app.use(express.json());

//Use  router controllers, API endpoints
app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/chat', chatRouter);
app.use('/message', messageRouter);

const server = http.createServer(app);
const io = new Server(server, {cors : {origin : 'http://localhost:3000', methods : ['GET', 'POST']}});
const port = process.env.PORT;

// ------ For Deployment ------
if (process.env.MODE === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));

  app.get("/*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client", "build", "index.html"));
  });
}
// ----------------------------

server.listen(port, ()=>{console.log("Server running on port : "+ port)});

//Test Socket connetion from client
const onlineUsers = [];

io.on('connection', socket=>{
    // console.log('A user connected with Socket Id : '+ socket.id);

    socket.on('join-room', userId=>{
        socket.join(userId);
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
    
    socket.on('clear-unread-message',(data)=>{
        // console.log(message);
        io.to(data.members[0]).to(data.members[1]).emit('message-count-cleared', data);
    });
    socket.on('user-typing',(data)=>{
        // console.log(message);
        io.to(data.members[0]).to(data.members[1]).emit('started-typing', data);
    });
    socket.on('user-logged-in',(userId)=>{
        // console.log(message);
        if(!onlineUsers.includes(userId)) onlineUsers.push(userId);
        io.emit('online-users', onlineUsers);
    });
    socket.on('user-logged-out', (userId)=>{
        onlineUsers.splice(onlineUsers.indexOf(userId), 1);
        io.emit('online-users', onlineUsers);
    });

});
