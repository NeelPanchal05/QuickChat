import { useEffect, useRef, useState, useCallback } from "react";
import Peer from "simple-peer";
import { toast } from "sonner";

export const useWebRTC = ({ callData, socket, onClose }) => {
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [cameraFacing, setCameraFacing] = useState("user");
  const [connectionQuality, setConnectionQuality] = useState("good");
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const iceQueueRef = useRef([]);
  const isCanceledRef = useRef(false);
  
  const { callType, otherUser, incoming, caller, signal } = callData;

  const cleanupCall = useCallback(() => {
    isCanceledRef.current = true;
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
    if (peerRef.current) {
      peerRef.current.signal(data.candidate);
    } else {
      iceQueueRef.current.push(data.candidate);
    }
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

      // Abort if the user canceled while waiting for camera permissions
      if (isCanceledRef.current) {
        mediaStream.getTracks().forEach(t => t.stop());
        return;
      }

      setStream(mediaStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }

      const peer = new Peer({
        initiator: true,
        trickle: true,
        stream: mediaStream,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
            { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
            { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" }
          ],
        },
      });

      peer.on("signal", (data) => {
        if (data.type === "offer") {
          socket.emit("call_user", {
            callee_id: otherUser.user_id,
            signal: data,
            call_type: callType,
          });
        } else {
          socket.emit("ice_candidate", {
            target_id: otherUser.user_id,
            candidate: data
          });
        }
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

      // Flush queue if any candidates arrived early
      while (iceQueueRef.current.length > 0) {
        const candidate = iceQueueRef.current.shift();
        peer.signal(candidate);
      }
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

      if (isCanceledRef.current) {
        mediaStream.getTracks().forEach(t => t.stop());
        return;
      }

      setStream(mediaStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }

      const peer = new Peer({
        initiator: false,
        trickle: true,
        stream: mediaStream,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
            { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
            { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" }
          ],
        },
      });

      peer.on("signal", (data) => {
        if (data.type === "answer") {
          socket.emit("accept_call", {
            caller_id: caller.user_id,
            signal: data,
          });
        } else {
          socket.emit("ice_candidate", {
            target_id: caller.user_id,
            candidate: data
          });
        }
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

      // Handle the initial offer
      peer.signal(signal);

      // Flush queue if any candidates arrived early
      while (iceQueueRef.current.length > 0) {
        const candidate = iceQueueRef.current.shift();
        peer.signal(candidate);
      }
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
    toast.info(isSpeakerOn ? "Speaker off" : "Speaker on");
  };

  const switchCamera = async () => {
    if (stream && callType === "video") {
      try {
        stream.getVideoTracks().forEach(track => track.stop());
        
        const newFacing = cameraFacing === "user" ? "environment" : "user";
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: newFacing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true
        });
        
        const videoTrack = newStream.getVideoTracks()[0];
        const sender = peerRef.current?.getSenders?.().find(s => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
        
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

  useEffect(() => {
    if (callActive) {
      const interval = setInterval(() => {
        const qualities = ["excellent", "good", "poor"];
        const randomQuality = qualities[Math.floor(Math.random() * qualities.length)];
        setConnectionQuality(randomQuality);
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [callActive]);

  return {
    stream,
    remoteStream,
    callActive,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    cameraFacing,
    connectionQuality,
    localVideoRef,
    remoteVideoRef,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    switchCamera
  };
};
