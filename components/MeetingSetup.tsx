'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';

const MeetingSetup = ({
  setIsSetupComplete,
  channel,
  token,
}: {
  setIsSetupComplete: (value: boolean) => void;
  channel: string;
  token: string;
}) => {
  const [loading, setLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);

  const videoRef = useRef<HTMLDivElement>(null);
  const cameraTrackRef = useRef<any>(null);
  const micTrackRef = useRef<any>(null);

  // Camera/mic effect
  useEffect(() => {
    let disposed = false;
    let AgoraRTC: any;

    const setupTracks = async () => {
      setLoading(true);
      try {
        // Import AgoraRTC dynamically
        const mod = await import('agora-rtc-sdk-ng');
        AgoraRTC = mod.default;
        // Create camera & mic tracks if enabled
        if (isCameraOn) {
          cameraTrackRef.current = await AgoraRTC.createCameraVideoTrack();
        } else {
          cameraTrackRef.current = null;
        }
        if (isMicOn) {
          micTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
        } else {
          micTrackRef.current = null;
        }
        // Play camera if on
        if (!disposed && isCameraOn && cameraTrackRef.current && videoRef.current) {
          cameraTrackRef.current.play(videoRef.current);
        }
        setPreviewError(null);
      } catch (err) {
        setPreviewError('Unable to access camera/mic. Please check permissions or connect a device.');
      }
      setLoading(false);
    };

    setupTracks();

    return () => {
      disposed = true;
      if (cameraTrackRef.current) {
        cameraTrackRef.current.close();
        cameraTrackRef.current = null;
      }
      if (micTrackRef.current) {
        micTrackRef.current.close();
        micTrackRef.current = null;
      }
    };
    // Re-run when toggling cam/mic
    // eslint-disable-next-line
  }, [isCameraOn, isMicOn]);

  // Toggle camera on/off
  const handleCameraToggle = () => {
    setIsCameraOn((prev) => !prev);
  };

  // Toggle mic on/off
  const handleMicToggle = () => {
    setIsMicOn((prev) => !prev);
  };

  const handleJoin = () => {
    // Optionally: Pass the status of camera/mic to the meeting room via context or URL params if you want
    setIsSetupComplete(true);
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 text-white">
      <h1 className="text-center text-2xl font-bold">Setup</h1>
      <div
        ref={videoRef}
        className="flex h-56 w-96 items-center justify-center bg-black rounded-xl mb-4 overflow-hidden"
      >
        {!isCameraOn && !loading && (
          <span className="text-sky-1">Camera is off</span>
        )}
        {loading && <span className="text-sky-1">Loading camera...</span>}
        {previewError && <span className="text-red-400">{previewError}</span>}
      </div>
      <div className="flex gap-8 mb-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isCameraOn}
            onChange={handleCameraToggle}
          />
          Camera
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isMicOn}
            onChange={handleMicToggle}
          />
          Microphone
        </label>
      </div>
      <Button
        className="rounded-md bg-green-500 px-4 py-2.5"
        onClick={handleJoin}
        disabled={loading || !!previewError}
      >
        Join meeting
      </Button>
    </div>
  );
};

export default MeetingSetup;