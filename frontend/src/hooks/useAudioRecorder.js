import { useState, useRef } from "react";
import { toast } from "sonner";
import axios from "axios";

export const useAudioRecorder = (API, token, selectedConversation, addOptimisticMessage) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    if (!selectedConversation) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result;

          const tempId = addOptimisticMessage(base64data, "audio/webm", "voice_message.webm");

          try {
            await axios.post(
              `${API}/conversations/${selectedConversation.conversation_id}/messages`,
              {
                content: base64data,
                message_type: "audio/webm",
                file_name: "voice_message.webm",
                temp_id: tempId,
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch (error) {
            toast.error("Failed to send voice message");
          }
        };

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      toast.info("Recording started...");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return { isRecording, startRecording, stopRecording };
};
