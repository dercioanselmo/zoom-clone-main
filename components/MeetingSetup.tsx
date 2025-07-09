// components/MeetingSetup.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Video, VideoOff, Mic, MicOff, Settings } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

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
  const [devices, setDevices] = useState<{ cameras: MediaDeviceInfo[]; microphones: MediaDeviceInfo[] }>({
    cameras: [],
    microphones: [],
  });
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string | null>(null);

  const videoRef = useRef<HTMLDivElement>(null);
  const cameraTrackRef = useRef<any>(null);
  const micTrackRef = useRef<any>(null);
  const { user } = useUser();

  useEffect(() => {
    let disposed = false;
    let AgoraRTC: any;

    const setupDevices = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach((track) => track.stop());
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === 'videoinput');
        const microphones = devices.filter((device) => device.kind === 'audioinput');
        setDevices({ cameras, microphones });
        setSelectedCamera(cameras[0]?.deviceId || null);
        setSelectedMicrophone(microphones[0]?.deviceId || null);
      } catch (err) {
        console.error('Device enumeration failed:', err);
        setPreviewError('Unable to access devices. Please check permissions or connect a device.');
      }
    };

    const setupTracks = async () => {
      setLoading(true);
      try {
        const mod = await import('agora-rtc-sdk-ng');
        AgoraRTC = mod.default;
        if (isCameraOn && selectedCamera) {
          cameraTrackRef.current = await AgoraRTC.createCameraVideoTrack({
            cameraId: selectedCamera,
          });
        }
        if (isMicOn && selectedMicrophone) {
          micTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack({
            microphoneId: selectedMicrophone,
          });
        }
        if (!disposed && isCameraOn && cameraTrackRef.current && videoRef.current) {
          cameraTrackRef.current.play(videoRef.current);
        }
        setPreviewError(null);
      } catch (err) {
        console.error('Track setup error:', err);
        setPreviewError('Unable to access camera/mic. Please check permissions or connect a device.');
      } finally {
        setLoading(false);
      }
    };

    setupDevices().then(setupTracks);

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
  }, [isCameraOn, isMicOn, selectedCamera, selectedMicrophone]);

  const handleCameraToggle = () => {
    setIsCameraOn((prev) => {
      const newState = !prev;
      if (!newState && cameraTrackRef.current) {
        cameraTrackRef.current.close();
        cameraTrackRef.current = null;
      }
      return newState;
    });
  };

  const handleMicToggle = () => {
    setIsMicOn((prev) => {
      const newState = !prev;
      if (!newState && micTrackRef.current) {
        micTrackRef.current.close();
        micTrackRef.current = null;
      }
      return newState;
    });
  };

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
            <img
              src={user?.imageUrl}
              alt="Profile"
              className="w-16 h-16 rounded-full mb-2"
            />
            <span className="text-sky-1 text-lg">{user?.username || user?.id} (Camera Off)</span>
          </div>
        )}
        {loading && <span className="text-sky-1 text-lg">Loading camera...</span>}
        {previewError && <span className="text-red-400 text-lg">{previewError}</span>}
      </div>
      <div className="flex gap-6 mb-2">
        <button
          type="button"
          onClick={handleCameraToggle}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition',
            isCameraOn ? 'bg-green-700 hover:bg-green-800' : 'bg-dark-3 hover:bg-dark-4'
          )}
          aria-label={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
        >
          {isCameraOn ? (
            <Video className="text-white" size={24} />
          ) : (
            <VideoOff className="text-red-500" size={24} />
          )}
          <span className="hidden sm:inline">{isCameraOn ? 'Camera On' : 'Camera Off'}</span>
        </button>
        <button
          type="button"
          onClick={handleMicToggle}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition',
            isMicOn ? 'bg-green-700 hover:bg-green-800' : 'bg-dark-3 hover:bg-dark-4'
          )}
          aria-label={isMicOn ? 'Turn mic off' : 'Turn mic on'}
        >
          {isMicOn ? (
            <Mic className="text-white" size={24} />
          ) : (
            <MicOff className="text-red-500" size={24} />
          )}
          <span className="hidden sm:inline">{isMicOn ? 'Mic On' : 'Mic Off'}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-3 hover:bg-dark-4 transition"
              aria-label="Settings"
            >
              <Settings className="text-white" size={24} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-dark-1 text-white border-dark-3">
            <div className="p-2">
              <label className="block text-sm font-medium mb-1">Camera</label>
              {devices.cameras.map((camera) => (
                <DropdownMenuItem
                  key={camera.deviceId}
                  onClick={() => setSelectedCamera(camera.deviceId)}
                  className={cn(
                    'cursor-pointer',
                    selectedCamera === camera.deviceId && 'bg-dark-3'
                  )}
                >
                  {camera.label || `Camera ${camera.deviceId}`}
                </DropdownMenuItem>
              ))}
            </div>
            <div className="p-2">
              <label className="block text-sm font-medium mb-1">Microphone</label>
              {devices.microphones.map((mic) => (
                <DropdownMenuItem
                  key={mic.deviceId}
                  onClick={() => setSelectedMicrophone(mic.deviceId)}
                  className={cn(
                    'cursor-pointer',
                    selectedMicrophone === mic.deviceId && 'bg-dark-3'
                  )}
                >
                  {mic.label || `Microphone ${mic.deviceId}`}
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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