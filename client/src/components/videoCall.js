import { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import Peer from 'simple-peer';
import toast from "react-hot-toast";

export const VideoCall = ({ socket, mySocketId, selectedUser, isInitiator, incomingCallData, onEnd }) => {
    const { user } = useSelector(state => state.userReducer);

    const myVideo = useRef();
    const remoteVideo = useRef();
    const streamRef = useRef(null);
    const connectionRef = useRef(); // Logged-in user peer connection reference

    // States to manage the flow of call
    const [stream, setStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [incomingCall, setIncomingCall] = useState(false);
    const [caller, setCaller] = useState('');
    const [callerSignal, setCallerSignal] = useState();
    const [callAccepted, setCallAccepted] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [videoOff, setVideoOff] = useState(false);

    const hasSignaled = useRef(false);
    const isCleaningUp = useRef(false);

    // Function to call user
    const callToUser = (selectedUser, currentStream) => {

        if (!currentStream) return; // If currentStream isn't ready yet, don't start the peer
        // console.log("Call to user : ", selectedUser.firstName + " " + selectedUser.lastName, " | User Id : ", selectedUser._id);
        // console.log(`Logged-in user : ${user.firstName + " " + user.lastName} | Socket ID : ${mySocketId}`);

        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: currentStream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                    // Add a TURN server here for a 100% success rate
                ]
            }
        });

        hasSignaled.current = false;
        peer.on('signal', (data) => {
            if (!hasSignaled.current) {
                socket.emit('call-to-user', {
                    callerId: user._id, // or mySocketId
                    caller_name: user.firstName,
                    caller_socket: mySocketId,
                    calleeId: selectedUser._id,
                    callee_name: selectedUser.firstName,
                    signal: data,
                })
                hasSignaled.current = true;
            }
            // console.log("Call to user with signal event. Signal : ", data);
        });

        peer.on('stream', (remoteStream) => {
            // if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
            setRemoteStream(remoteStream);
        });

        socket.once('call-accepted', (data) => {
            setCallAccepted(true);
            setCaller(data.calleeId); // user._id or socket.id of call accepting user

            peer.signal(data.signal);
            // console.log("Call accepted. This is caller side. Callee signal : ", data.signal);
        });

        connectionRef.current = peer;
    }

    // Function to accept call
    const acceptCall = () => {
        if (!stream) {
            toast.error('Media stream is not ready. Please wait a moment');
            return;
        }
        setCallAccepted(true);
        hasSignaled.current = false;

        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                    // Add a TURN server here for a 100% success rate
                ]
            }
        });

        peer.on('signal', (data) => {
            if (!hasSignaled.current) {
                socket.emit('accept-call', {
                    signal: data,
                    callerId: caller,
                    calleeId: user._id,
                    callee_socket: mySocketId,
                    callee_name: user.firstName
                });

                hasSignaled.current = true;
            }
            // console.log('Callee signal : ', data);
        });

        peer.on('stream', (remoteStream) => {
            // console.log("Remote Audio Tracks:", remoteStream.getAudioTracks().length);
            // console.log("Audio Track Enabled:", remoteStream.getAudioTracks()[0]?.enabled);
            // if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
            setRemoteStream(remoteStream);
        })

        if (!callerSignal) {
            console.error('callerSignal is undefined');
            return;
        }
        peer.signal(callerSignal);
        connectionRef.current = peer;
        // console.log("Callee side. Caller Signal : ", callerSignal);
    }

    // Function to reject incoming call
    const rejectCall = () => {
        setIncomingCall(false);
        setCallAccepted(false);

        cleanup();
        socket.emit('reject-call', { to: caller, from_name: user.firstName });
    }

    // Function to end call
    const endCall = () => {
        setIncomingCall(false);
        setCallAccepted(false);
        // If we are the initiator and the call hasn't been accepted yet, it's a cancellation
        if (isInitiator && !callAccepted) {
            socket.emit('cancel-call', { to: selectedUser._id });
        }
        else {
            socket.emit('end-call', { to: caller, from_name: user.firstName, callerId: user._id, calleeId: caller });
            toast("Call Ended", { icon: '📞' });
        }
        cleanup();
    }

    // Function to toggle mic
    const toggleMute = () => {
        if (stream) { // Check if stream exists
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    // Function to toggle video
    const toggleVideo = () => {
        if (stream) { // Check if stream exists
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setVideoOff(!videoTrack.enabled);
            }
        }
    };

    // --- THE CLEANUP FUNCTION ---
    const cleanup = useCallback(() => {
        if (isCleaningUp.current) return;
        isCleaningUp.current = true;

        // Remove socket listeners first so no more signals are processed
        socket.off('call-accepted');
        socket.off('call-rejected');
        socket.off('call-ended');

        // Get the stream from the Ref or State
        const activeStream = streamRef.current || stream;

        // Explicitly stop ALL tracks to turn off the hardware light
        if (activeStream) {
            activeStream.getTracks().forEach(track => {
                track.stop(); // Stops the hardware (Camera/Mic)
                track.enabled = false; // Disables the track
            });
        }
        
        // Destroy Peer connection
        if (connectionRef.current) {
            // Remove peer internal listeners to prevent them firing during destruction
            connectionRef.current.removeAllListeners('signal');
            connectionRef.current.removeAllListeners('stream');

            if (!connectionRef.current.destroyed) connectionRef.current.destroy();
            connectionRef.current = null;
        }

        // Clear Video Elements
        if (myVideo.current) myVideo.current.srcObject = null;
        if (remoteVideo.current) remoteVideo.current.srcObject = null;

        // Reset states
        setStream(null);
        streamRef.current = null;
        setRemoteStream(null);

        // Notify Parent to unmount
        onEnd();
    }, [stream, onEnd]);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((currentStream) => {
                setStream(currentStream);
                streamRef.current = currentStream;

                if (myVideo.current) {
                    myVideo.current.srcObject = currentStream;
                }

                // If we are answering a call
                if (!incomingCall && incomingCallData) {
                    setIncomingCall(true);
                    setCaller(incomingCallData.callerId);
                    setCallerSignal(incomingCallData.signal);

                    // console.log('Incomming call data : ', incomingCallData);
                    // console.log(`Logged-in user : ${user.firstName + " " + user.lastName} | Socket ID : ${mySocketId}`);
                }

                // If we are starting a call
                if (isInitiator && selectedUser) {
                    callToUser(selectedUser, currentStream);
                }

            }).catch(err => {
                console.error("Access denied for camera/mic", err);
                toast.error("Please allow camera/microphone access");
                onEnd();
            });        

        socket.on('call-rejected', (data) => {
            toast.error(`Call rejected from , ${data.from}`);
            cleanup();
        })

        socket.on('call-ended', (data) => {
            // console.log(`Call ended from : ${data.from}`);
            toast(`Call ended from ${data.from}.`, { icon: '📞' });
            cleanup();
        });

        return () => {
            socket.off('call-rejected');
            socket.off('call-ended');
        }

    }, []);

    // When user refreshes page , end call
    useEffect(() => {
        socket.on('disconnect-user', (data) => {
            // console.log(`Disconnected User : ${data.user}`);
            if (caller === data.user) {
                // console.log('matched disconnected user');
                endCall();
            }
            // else {
            //     console.log('Not matched');
            // }
        });

        return () => {
            socket.off('disconnect-user');
        }
    }, [caller]);  

    useEffect(() => {
        // We check for remoteStream specifically because 'stream' is YOUR local camera
        if (callAccepted && remoteVideo.current && remoteStream) {
            remoteVideo.current.srcObject = remoteStream;

            // Auto-play safety check
            remoteVideo.current.play().catch(err => {
                console.error("Remote video play failed:", err);
            });
        }
    }, [callAccepted, remoteStream]);

    // Also ensure local video stays attached after re-renders
    useEffect(() => {
        if (stream && myVideo.current) {
            myVideo.current.srcObject = stream;
        }
    }, [stream, callAccepted]);
    
    useEffect(() => {
        return () => {
            // Fail-safe: stop tracks if component unmounts for any reason
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <>
            {/* If we have incoming data but haven't accepted yet, show Modal */}
            {incomingCall && !callAccepted && <IncomingCallModal callerName={incomingCallData.from_name} onAccept={acceptCall} onReject={rejectCall} />}

            {/* If call is accepted, show the Video Streams */}
            {(callAccepted || isInitiator) && <div className="fixed inset-0 z-[2000] bg-black flex flex-col items-center justify-center text-white">
                <div className="relative w-full h-full flex flex-col md:flex-row items-center justify-around p-4">

                    {/* Remote Video (Full Screen or Large) */}
                    <div className="relative bg-zinc-900 w-full h-1/2 md:h-3/4 rounded-xl overflow-hidden border border-zinc-700">
                        <video ref={remoteVideo} autoPlay playsInline className="w-full h-full object-cover" />
                        {!callAccepted && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <p className="animate-pulse text-xl">Calling {selectedUser?.firstName}...</p>
                            </div>
                        )}
                    </div>

                    {/* Local Video (Small Overlay) */}
                    <div className="absolute bottom-24 right-8 w-32 h-48 md:w-48 md:h-64 bg-zinc-800 rounded-lg overflow-hidden border-2 border-emerald-500 shadow-2xl">
                        <video ref={myVideo} autoPlay muted playsInline className="w-full h-full object-cover" />
                    </div>

                    {/* Controls */}
                    <div className="absolute bottom-8 flex gap-6 items-center">
                        <button onClick={toggleMute} className={`p-4 rounded-full ${isMuted ? 'bg-red-500' : 'bg-zinc-700'}`}>
                            <i className={`fa ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`} />
                        </button>

                        <button onClick={endCall} className="p-4 bg-red-600 rounded-full w-16 h-16 flex items-center justify-center text-2xl">
                            <i className="fa fa-phone" style={{ transform: 'rotate(135deg)' }} />
                        </button>

                        <button onClick={toggleVideo} className={`p-4 rounded-full ${videoOff ? 'bg-red-500' : 'bg-zinc-700'}`}>
                            <i className={`fa ${videoOff ? 'fa-solid fa-video-slash' : 'fa-video-camera'}`} />
                        </button>
                    </div>
                </div>
            </div>}
        </>
    )

}

export const IncomingCallModal = ({ callerName, onAccept, onReject }) => {
    return (
        <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-zinc-800 p-8 rounded-2xl text-center border border-zinc-700 shadow-2xl">
                <div className="animate-bounce mb-4">
                    <i className="fa fa-phone-square text-emerald-500 text-5xl"></i>
                </div>
                <h2 className="text-white text-xl font-semibold mb-2">Incoming Call</h2>
                <p className="text-zinc-400 mb-6">{callerName} is calling you...</p>
                <div className="flex gap-4 justify-center">
                    <button onClick={onAccept}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-2 rounded-full font-bold transition-all"
                    >
                        Accept
                    </button>
                    <button onClick={onReject}
                        className="bg-red-500 hover:bg-red-600 text-white px-8 py-2 rounded-full font-bold transition-all"
                    >
                        Reject
                    </button>
                </div>
            </div>
        </div>
    );
};