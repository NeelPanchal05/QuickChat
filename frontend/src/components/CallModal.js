import React, { useEffect, useRef, useState, useCallback } from "react";
import Peer from "simple-peer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  X,
  Volume2,
  VolumeX,
  RefreshCw,
  Wifi,
  WifiOff
} from "lucide-react";
import { toast } from "sonner";

// Call Timer Component
function CallTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return <span className="text-white/90 text-base font-normal">{formatTime(seconds)}</span>;
}

export default function CallModal({ callData, socket, userId, onClose }) {
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [cameraFacing, setCameraFacing] = useState("user"); // "user" or "environment"
  const [connectionQuality, setConnectionQuality] = useState("good"); // "poor", "good", "excellent"
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const { callType, otherUser, incoming, caller, signal } = callData;

  const cleanupCall = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
  }, [stream]);

  const endCall = useCallback(() => {
    socket.emit("end_call", {
      other_user_id: incoming ? caller.user_id : otherUser.user_id,
    });
    cleanupCall();
    onClose();
  }, [incoming, caller, otherUser, socket, cleanupCall, onClose]);

  const handleCallAccepted = useCallback((data) => {
    if (peerRef.current) {
      peerRef.current.signal(data.signal);
    }
  }, []);

  const handleCallRejected = useCallback(() => {
    toast.info("Call rejected");
    onClose();
  }, [onClose]);

  const handleCallEnded = useCallback(() => {
    toast.info("Call ended");
    onClose();
  }, [onClose]);

  const handleIceCandidate = useCallback((data) => {
    // Handle ICE candidates if needed
  }, []);

  const startCall = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video:
          callType === "video"
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setStream(mediaStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: mediaStream,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        },
      });

      peer.on("signal", (data) => {
        socket.emit("call_user", {
          callee_id: otherUser.user_id,
          signal: data,
          call_type: callType,
        });
      });

      peer.on("stream", (remoteStream) => {
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setCallActive(true);
      });

      peer.on("error", (err) => {
        console.error("Peer error:", err);
        toast.error("Call connection failed");
        endCall();
      });

      peerRef.current = peer;
    } catch (error) {
      console.error("Failed to start call:", error);
      toast.error("Failed to access camera/microphone");
      onClose();
    }
  }, [callType, otherUser, socket, onClose, endCall]);

  useEffect(() => {
    if (!incoming) {
      startCall();
    }

    socket.on("call_accepted", handleCallAccepted);
    socket.on("call_rejected", handleCallRejected);
    socket.on("call_ended", handleCallEnded);
    socket.on("ice_candidate", handleIceCandidate);

    return () => {
      cleanupCall();
      socket.off("call_accepted", handleCallAccepted);
      socket.off("call_rejected", handleCallRejected);
      socket.off("call_ended", handleCallEnded);
      socket.off("ice_candidate", handleIceCandidate);
    };
  }, [
    incoming,
    startCall,
    handleCallAccepted,
    handleCallRejected,
    handleCallEnded,
    handleIceCandidate,
    socket,
    cleanupCall,
  ]);

  const acceptCall = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video:
          callType === "video"
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setStream(mediaStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: mediaStream,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        },
      });

      peer.on("signal", (data) => {
        socket.emit("accept_call", {
          caller_id: caller.user_id,
          signal: data,
        });
      });

      peer.on("stream", (remoteStream) => {
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setCallActive(true);
      });

      peer.on("error", (err) => {
        console.error("Peer error:", err);
        toast.error("Call connection failed");
        endCall();
      });

      peer.signal(signal);
      peerRef.current = peer;
    } catch (error) {
      console.error("Failed to accept call:", error);
      toast.error("Failed to access camera/microphone");
      rejectCall();
    }
  };

  const rejectCall = () => {
    socket.emit("reject_call", { caller_id: caller.user_id });
    onClose();
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream && callType === "video") {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // In a real app, you'd set audio output device here
    toast.info(isSpeakerOn ? "Speaker off" : "Speaker on");
  };

  const switchCamera = async () => {
    if (stream && callType === "video") {
      try {
        // Stop current video track
        stream.getVideoTracks().forEach(track => track.stop());
        
        // Get new camera
        const newFacing = cameraFacing === "user" ? "environment" : "user";
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: newFacing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true
        });
        
        // Replace video track
        const videoTrack = newStream.getVideoTracks()[0];
        const sender = peerRef.current?.getSenders?.().find(s => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
        
        // Update local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
        }
        
        setStream(newStream);
        setCameraFacing(newFacing);
        toast.success(newFacing === "user" ? "Front camera" : "Back camera");
      } catch (error) {
        console.error("Failed to switch camera:", error);
        toast.error("Could not switch camera");
      }
    }
  };

  // Simulate connection quality monitoring
  useEffect(() => {
    if (callActive) {
      const interval = setInterval(() => {
        const qualities = ["excellent", "good", "poor"];
        const randomQuality = qualities[Math.floor(Math.random() * qualities.length)];
        setConnectionQuality(randomQuality);
      }, 10000); // Check every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [callActive]);

  const displayUser = incoming ? caller : otherUser;

  return (
    <div className="fixed inset-0 z-50 bg-[#0D1418] flex items-center justify-center">
      {/* Close button - top right */}
      <button
        onClick={endCall}
        className="absolute top-6 right-6 z-50 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white/80 hover:text-white transition-all"
        data-testid="close-call-button"
      >
        <X size={20} />
      </button>

      {callType === "video" ? (
        <div className="w-full h-full relative bg-black">
          {/* Remote Video - Full Screen */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            data-testid="remote-video"
          />

          {/* User info overlay - top with better gradient */}
          <div className="absolute top-0 left-0 right-0 p-8 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white text-3xl font-bold mb-1 drop-shadow-lg">
                  {displayUser?.real_name}
                </h2>
                {callActive ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <CallTimer />
                    </div>
                    {/* Connection quality indicator */}
                    {connectionQuality === "poor" && (
                      <div className="flex items-center gap-1.5 text-yellow-400 text-sm bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                        <WifiOff size={16} />
                        <span>Poor connection</span>
                      </div>
                    )}
                    {connectionQuality === "excellent" && (
                      <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                        <Wifi size={16} className="text-green-400" />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-white/90 text-lg drop-shadow-lg">
                    {incoming ? "Incoming video call..." : "Calling..."}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Local Video - Larger Picture in Picture with better styling */}
          <div className="absolute top-6 right-6 w-48 h-64 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/30 z-30 backdrop-blur-sm bg-black/20">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              data-testid="local-video"
            />
            {isVideoOff && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <VideoOff size={48} className="text-white/50" />
              </div>
            )}
          </div>

          {/* Incoming call controls - Better visibility */}
          {incoming && !callActive && (
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
              <div className="flex justify-center gap-32">
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={rejectCall}
                    className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-2xl transition-all hover:scale-110"
                    data-testid="reject-call-button"
                  >
                    <PhoneOff size={32} className="text-white" />
                  </button>
                  <span className="text-white font-semibold text-lg drop-shadow-lg">Decline</span>
                </div>
                
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={acceptCall}
                    className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-2xl transition-all hover:scale-110 animate-pulse"
                    data-testid="accept-call-button"
                  >
                    <Phone size={32} className="text-white" />
                  </button>
                  <span className="text-white font-semibold text-lg drop-shadow-lg">Accept</span>
                </div>
              </div>
            </div>
          )}

          {/* Active call controls - Better layout with labels */}
          {callActive && (
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
              <div className="flex justify-center items-end gap-6">
                {/* Mute */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110 ${
                      isMuted ? "bg-white text-gray-900" : "bg-white/30 hover:bg-white/40 backdrop-blur-md text-white"
                    }`}
                    data-testid="mute-button"
                  >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>
                  <span className="text-white/90 text-sm font-medium drop-shadow">
                    {isMuted ? "Unmute" : "Mute"}
                  </span>
                </div>

                {/* Video */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={toggleVideo}
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110 ${
                      isVideoOff ? "bg-white text-gray-900" : "bg-white/30 hover:bg-white/40 backdrop-blur-md text-white"
                    }`}
                    data-testid="video-toggle-button"
                  >
                    {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                  </button>
                  <span className="text-white/90 text-sm font-medium drop-shadow">
                    {isVideoOff ? "Camera" : "Camera"}
                  </span>
                </div>

                {/* Speaker */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={toggleSpeaker}
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110 ${
                      !isSpeakerOn ? "bg-white text-gray-900" : "bg-white/30 hover:bg-white/40 backdrop-blur-md text-white"
                    }`}
                    data-testid="speaker-button"
                  >
                    {isSpeakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
                  </button>
                  <span className="text-white/90 text-sm font-medium drop-shadow">
                    Speaker
                  </span>
                </div>

                {/* Camera Flip */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={switchCamera}
                    className="w-16 h-16 rounded-full bg-white/30 hover:bg-white/40 backdrop-blur-md flex items-center justify-center shadow-xl transition-all hover:scale-110 text-white"
                    data-testid="flip-camera-button"
                  >
                    <RefreshCw size={24} />
                  </button>
                  <span className="text-white/90 text-sm font-medium drop-shadow">
                    Flip
                  </span>
                </div>

                {/* End Call - Larger and more prominent */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={endCall}
                    className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-2xl transition-all hover:scale-110"
                    data-testid="end-call-button"
                  >
                    <PhoneOff size={28} className="text-white" />
                  </button>
                  <span className="text-white font-semibold text-base drop-shadow-lg">End</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Voice Call UI */
        <div className="w-full h-full flex flex-col items-center justify-between py-16 px-8">
          {/* User Info Section */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Profile Picture */}
            <div className="mb-8">
              <Avatar className="w-40 h-40 border-4 border-white/10">
                <AvatarImage src={displayUser?.profile_photo} />
                <AvatarFallback className="text-5xl bg-gradient-to-br from-teal-500 to-teal-700 text-white">
                  {displayUser?.real_name?.[0] || displayUser?.username?.[0]}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Name */}
            <h2 className="text-white text-3xl font-semibold mb-2">
              {displayUser?.real_name}
            </h2>

            {/* Status / Timer */}
            {callActive ? (
              <CallTimer />
            ) : (
              <p className="text-white/60 text-base">
                {incoming ? "Incoming voice call..." : "Calling..."}
              </p>
            )}
          </div>

          {/* Controls Section */}
          <div className="w-full max-w-md">
            {/* Incoming call controls */}
            {incoming && !callActive && (
              <div className="flex justify-center gap-24 mb-8">
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={rejectCall}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all"
                    data-testid="reject-call-button"
                  >
                    <PhoneOff size={24} className="text-white" />
                  </button>
                  <span className="text-white/70 text-sm">Decline</span>
                </div>
                
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={acceptCall}
                    className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg transition-all"
                    data-testid="accept-call-button"
                  >
                    <Phone size={24} className="text-white" />
                  </button>
                  <span className="text-white/70 text-sm">Accept</span>
                </div>
              </div>
            )}

            {/* Active call controls */}
            {callActive && (
              <div className="flex justify-center gap-8 mb-8">
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                      isMuted ? "bg-white hover:bg-gray-100" : "bg-white/20 hover:bg-white/30"
                    }`}
                    data-testid="mute-button"
                  >
                    {isMuted ? (
                      <MicOff size={20} className="text-gray-900" />
                    ) : (
                      <Mic size={20} className="text-white" />
                    )}
                  </button>
                  <span className="text-white/50 text-xs">
                    {isMuted ? "Unmute" : "Mute"}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={toggleSpeaker}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                      isSpeakerOn ? "bg-white/20 hover:bg-white/30" : "bg-white hover:bg-gray-100"
                    }`}
                    data-testid="speaker-button"
                  >
                    {isSpeakerOn ? (
                      <Volume2 size={20} className="text-white" />
                    ) : (
                      <VolumeX size={20} className="text-gray-900" />
                    )}
                  </button>
                  <span className="text-white/50 text-xs">
                    {isSpeakerOn ? "Speaker" : "Earpiece"}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={endCall}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all"
                    data-testid="end-call-button"
                  >
                    <PhoneOff size={24} className="text-white" />
                  </button>
                  <span className="text-white/50 text-xs">End</span>
                </div>
              </div>
            )}

            {/* Cancel button for outgoing calls */}
            {!callActive && !incoming && (
              <div className="flex justify-center">
                <button
                  onClick={endCall}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all"
                  data-testid="cancel-call-button"
                >
                  <PhoneOff size={24} className="text-white" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
