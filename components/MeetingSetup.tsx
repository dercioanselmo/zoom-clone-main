'use client';

import { useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from './ui/button';
import { DeviceControls } from './DeviceControls';

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
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string | null>(null);
  const [cameraTrack, setCameraTrack] = useState<any>(null);
  const [micTrack, setMicTrack] = useState<any>(null);

  const videoRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();

  useEffect(() => {
    let disposed = false;
    let AgoraRTC: any;

    const setupTracks = async () => {
      setLoading(true);
      try {
        const mod = await import('agora-rtc-sdk-ng');
        AgoraRTC = mod.default;
        if (isCameraOn && selectedCamera) {
          const newCameraTrack = await AgoraRTC.createCameraVideoTrack({ cameraId: selectedCamera });
          if (!disposed) {
            setCameraTrack(newCameraTrack);
            if (videoRef.current) newCameraTrack.play(videoRef.current);
          }
        }
        if (isMicOn && selectedMicrophone) {
          const newMicTrack = await AgoraRTC.createMicrophoneAudioTrack({ microphoneId: selectedMicrophone });
          if (!disposed) setMicTrack(newMicTrack);
        }
        setPreviewError(null);
      } catch (err) {
        console.error('Track setup error:', err);
        setPreviewError('Unable to access camera/mic. Please check permissions or connect a device.');
      } finally {
        setLoading(false);
      }
    };

    if (selectedCamera && selectedMicrophone) setupTracks();

    return () => {
      disposed = true;
      cameraTrack?.close();
      micTrack?.close();
    };
  }, [isCameraOn, isMicOn, selectedCamera, selectedMicrophone]);

  const handleJoin = () => {
    localStorage.setItem('meetingState', JSON.stringify({
      isCameraOn,
      isMicOn,
      selectedCamera,
      selectedMicrophone,
    }));
    setIsSetupComplete(true);
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-6 text-white bg-dark-2">
      <h1 className="text-3xl font-bold">Meeting Setup</h1>
      <div
        ref={videoRef}
        className="flex h-[480px] w-[640px] items-center justify-center bg-black rounded-xl mb-4 overflow-hidden shadow-lg"
      >
        {!isCameraOn && !loading && (
          <div className="flex flex-col items-center">
            <img src={user?.imageUrl} alt="Profile" className="w-16 h-16 rounded-full mb-2" />
            <span className="text-sky-1 text-lg">{user?.username || user?.id} (Camera Off)</span>
          </div>
        )}
        {loading && <span className="text-sky-1 text-lg">Loading camera...</span>}
        {previewError && <span className="text-red-400 text-lg">{previewError}</span>}
      </div>
      <DeviceControls
        isCameraOn={isCameraOn}
        isMicOn={isMicOn}
        setIsCameraOn={setIsCameraOn}
        setIsMicOn={setIsMicOn}
        selectedCamera={selectedCamera}
        selectedMicrophone={selectedMicrophone}
        setSelectedCamera={setSelectedCamera}
        setSelectedMicrophone={setSelectedMicrophone}
        cameraTrack={cameraTrack}
        micTrack={micTrack}
        videoRef={videoRef}
      />
      <Button
        className="rounded-md bg-green-500 px-6 py-3 text-lg font-semibold hover:bg-green-600 transition-colors"
        onClick={handleJoin}
        disabled={loading || !!previewError}
      >
        Join Meeting
      </Button>
    </div>
  );
};

export default MeetingSetup;