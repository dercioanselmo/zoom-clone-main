'use client';

import { useState, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface DeviceControlsProps {
  isCameraOn: boolean;
  isMicOn: boolean;
  setIsCameraOn: (value: boolean) => void;
  setIsMicOn: (value: boolean) => void;
  selectedCamera: string | null;
  selectedMicrophone: string | null;
  setSelectedCamera: (value: string) => void;
  setSelectedMicrophone: (value: string) => void;
  cameraTrack: any;
  micTrack: any;
  client?: any; // AgoraRTC client, optional for MeetingRoom
  videoRef?: React.RefObject<HTMLDivElement>; // For MeetingSetup preview
}

export const DeviceControls = ({
  isCameraOn,
  isMicOn,
  setIsCameraOn,
  setIsMicOn,
  selectedCamera,
  selectedMicrophone,
  setSelectedCamera,
  setSelectedMicrophone,
  cameraTrack,
  micTrack,
  client,
  videoRef,
}: DeviceControlsProps) => {
  const [devices, setDevices] = useState<{ cameras: MediaDeviceInfo[]; microphones: MediaDeviceInfo[] }>({
    cameras: [],
    microphones: [],
  });

  useEffect(() => {
    const setupDevices = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach((track) => track.stop());
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === 'videoinput');
        const microphones = devices.filter((device) => device.kind === 'audioinput');
        setDevices({ cameras, microphones });
        if (!selectedCamera && cameras[0]) setSelectedCamera(cameras[0].deviceId);
        if (!selectedMicrophone && microphones[0]) setSelectedMicrophone(microphones[0].deviceId);
      } catch (err) {
        console.error('Device enumeration failed:', err);
      }
    };
    setupDevices();
  }, [selectedCamera, selectedMicrophone, setSelectedCamera, setSelectedMicrophone]);

  const handleCameraToggle = async () => {
    const newCameraOn = !isCameraOn;
    setIsCameraOn(newCameraOn);
    if (!newCameraOn && cameraTrack) {
      if (client) await client.unpublish(cameraTrack);
      cameraTrack.close();
    } else if (newCameraOn && selectedCamera && videoRef?.current) {
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      const newCameraTrack = await AgoraRTC.createCameraVideoTrack({ cameraId: selectedCamera });
      if (client) await client.publish(newCameraTrack);
      newCameraTrack.play(videoRef.current);
    }
  };

  const handleMicToggle = async () => {
    const newMicOn = !isMicOn;
    setIsMicOn(newMicOn);
    if (!newMicOn && micTrack) {
      if (client) await client.unpublish(micTrack);
      micTrack.close();
    } else if (newMicOn && selectedMicrophone) {
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      const newMicTrack = await AgoraRTC.createMicrophoneAudioTrack({ microphoneId: selectedMicrophone });
      if (client) await client.publish(newMicTrack);
    }
  };

  const handleCameraChange = async (deviceId: string) => {
    setSelectedCamera(deviceId);
    if (isCameraOn && cameraTrack && videoRef?.current) {
      if (client) await client.unpublish(cameraTrack);
      cameraTrack.close();
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      const newCameraTrack = await AgoraRTC.createCameraVideoTrack({ cameraId: deviceId });
      if (client) await client.publish(newCameraTrack);
      newCameraTrack.play(videoRef.current);
    }
  };

  const handleMicrophoneChange = async (deviceId: string) => {
    setSelectedMicrophone(deviceId);
    if (isMicOn && micTrack) {
      if (client) await client.unpublish(micTrack);
      micTrack.close();
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      const newMicTrack = await AgoraRTC.createMicrophoneAudioTrack({ microphoneId: deviceId });
      if (client) await client.publish(newMicTrack);
    }
  };

  return (
    <div className="flex gap-6">
      <button
        onClick={handleCameraToggle}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg transition',
          isCameraOn ? 'bg-green-700 hover:bg-green-800' : 'bg-dark-3 hover:bg-dark-4'
        )}
        aria-label={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
      >
        {isCameraOn ? <Video className="text-white" size={24} /> : <VideoOff className="text-red-500" size={24} />}
        <span className="hidden sm:inline">{isCameraOn ? 'Camera On' : 'Camera Off'}</span>
      </button>
      <button
        onClick={handleMicToggle}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg transition',
          isMicOn ? 'bg-green-700 hover:bg-green-800' : 'bg-dark-3 hover:bg-dark-4'
        )}
        aria-label={isMicOn ? 'Turn mic off' : 'Turn mic on'}
      >
        {isMicOn ? <Mic className="text-white" size={24} /> : <MicOff className="text-red-500" size={24} />}
        <span className="hidden sm:inline">{isMicOn ? 'Mic On' : 'Mic Off'}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-3 hover:bg-dark-4 transition" aria-label="Settings">
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
                onClick={() => handleCameraChange(camera.deviceId)}
                className={cn('cursor-pointer', selectedCamera === camera.deviceId && 'bg-dark-3')}
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
                onClick={() => handleMicrophoneChange(mic.deviceId)}
                className={cn('cursor-pointer', selectedMicrophone === mic.deviceId && 'bg-dark-3')}
              >
                {mic.label || `Microphone ${mic.deviceId}`}
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};