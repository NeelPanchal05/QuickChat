import React, { useEffect, useRef, useState, useCallback } from "react";
import Peer from "simple-peer";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { toast } from "sonner";

export default function CallModal({ callData, socket, userId, onClose }) {
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
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
  }, [callType, otherUser, socket, onClose]);

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

  const displayUser = incoming ? caller : otherUser;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center">
      <div className="w-full max-w-6xl h-[80vh] bg-[#0A0A0A] rounded-2xl overflow-hidden flex flex-col border border-white/10">
        {/* Header */}
        <div className="p-4 backdrop-blur-xl bg-black/50 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="text-xl font-semibold text-white"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {incoming ? "Incoming" : "Outgoing"}{" "}
                {callType === "video" ? "Video" : "Voice"} Call
              </h3>
              <p className="text-[#A1A1AA]">
                {displayUser?.real_name || displayUser?.username}
              </p>
            </div>
            {!callActive && incoming && (
              <div className="flex gap-2">
                <Button
                  onClick={acceptCall}
                  data-testid="accept-call-button"
                  className="bg-[#10B981] hover:bg-[#0D9668] text-white rounded-full px-6"
                >
                  <Phone size={20} className="mr-2" />
                  Accept
                </Button>
                <Button
                  onClick={rejectCall}
                  data-testid="reject-call-button"
                  className="bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-full px-6"
                >
                  <PhoneOff size={20} className="mr-2" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 relative bg-black">
          {callType === "video" ? (
            <>
              {/* Remote Video */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                data-testid="remote-video"
              />

              {/* Local Video */}
              <div className="absolute bottom-4 right-4 w-64 h-48 bg-black rounded-lg overflow-hidden border-2 border-white/20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  data-testid="local-video"
                />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 bg-[#7000FF]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-16 w-16 text-[#7000FF]" />
                </div>
                <p className="text-2xl font-semibold text-white">
                  {displayUser?.real_name}
                </p>
                <p className="text-[#A1A1AA] mt-2">
                  {callActive
                    ? "Call in progress..."
                    : incoming
                    ? "Incoming call..."
                    : "Calling..."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        {callActive && (
          <div className="p-6 backdrop-blur-xl bg-black/50 border-t border-white/5 flex items-center justify-center gap-4">
            <Button
              onClick={toggleMute}
              data-testid="mute-button"
              variant={isMuted ? "destructive" : "default"}
              size="icon"
              className={`w-14 h-14 rounded-full ${
                isMuted
                  ? "bg-[#EF4444] hover:bg-[#DC2626]"
                  : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </Button>

            {callType === "video" && (
              <Button
                onClick={toggleVideo}
                data-testid="video-toggle-button"
                variant={isVideoOff ? "destructive" : "default"}
                size="icon"
                className={`w-14 h-14 rounded-full ${
                  isVideoOff
                    ? "bg-[#EF4444] hover:bg-[#DC2626]"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
              </Button>
            )}

            <Button
              onClick={endCall}
              data-testid="end-call-button"
              className="w-14 h-14 rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white"
            >
              <PhoneOff size={24} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
