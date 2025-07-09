'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Video, VideoOff, Mic, MicOff, Settings } from 'lucide-react';

const MeetingSetup = ({
  setIsSetupComplete,
  channel,
  token,
  user,
}: {
  setIsSetupComplete: (value: boolean) => void;
  channel: string;
  token: string;
  user: any;
}) => {
  const [loading, setLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [cameraDevices, setCameraDevices] = useState<any[]>([]);
  const [micDevices, setMicDevices] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(undefined);
  const [selectedMicId, setSelectedMicId] = useState<string | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(false);

  const videoRef = useRef<HTMLDivElement>(null);
  const cameraTrackRef = useRef<any>(null);
  const micTrackRef = useRef<any>(null);

  // Device enumeration
  useEffect(() => {
    let AgoraRTC: any;
    const fetchDevices = async () => {
      try {
        const mod = await import('agora-rtc-sdk-ng');
        AgoraRTC = mod.default;
        const devices = await AgoraRTC.getDevices();
        setCameraDevices(devices.filter((d: any) => d.kind === 'videoinput'));
        setMicDevices(devices.filter((d: any) => d.kind === 'audioinput'));
        if (!selectedCameraId && devices.find((d: any) => d.kind === 'videoinput')) {
          setSelectedCameraId(devices.find((d: any) => d.kind === 'videoinput').deviceId);
        }
        if (!selectedMicId && devices.find((d: any) => d.kind === 'audioinput')) {
          setSelectedMicId(devices.find((d: any) => d.kind === 'audioinput').deviceId);
        }
      } catch {}
    };
    fetchDevices();
    // eslint-disable-next-line
  }, []);

  // Camera/mic preview effect
  useEffect(() => {
    let disposed = false;
    let AgoraRTC: any;
    const setupTracks = async () => {
      setLoading(true);
      try {
        const mod = await import('agora-rtc-sdk-ng');
        AgoraRTC = mod.default;
        if (isCameraOn && selectedCameraId) {
          cameraTrackRef.current = await AgoraRTC.createCameraVideoTrack({ cameraId: selectedCameraId });
        } else {
          if (cameraTrackRef.current) { cameraTrackRef.current.close(); cameraTrackRef.current = null; }
        }
        if (isMicOn && selectedMicId) {
          micTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack({ microphoneId: selectedMicId });
        } else {
          if (micTrackRef.current) { micTrackRef.current.close(); micTrackRef.current = null; }
        }
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
      if (cameraTrackRef.current) { cameraTrackRef.current.close(); cameraTrackRef.current = null; }
      if (micTrackRef.current) { micTrackRef.current.close(); micTrackRef.current = null; }
    };
    // eslint-disable-next-line
  }, [isCameraOn, isMicOn, selectedCameraId, selectedMicId]);

  const handleCameraToggle = () => setIsCameraOn((prev) => !prev);
  const handleMicToggle = () => setIsMicOn((prev) => !prev);

  const handleJoin = () => {
    // You could pass isCameraOn/isMicOn/selectedCameraId/selectedMicId to context or url if you want.
    setIsSetupComplete({
      camera: isCameraOn,
      mic: isMicOn,
      cameraId: selectedCameraId,
      micId: selectedMicId,
    } as any);
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 text-white">
      <h1 className="text-center text-2xl font-bold">Setup</h1>
      <div
        ref={videoRef}
        className="flex h-56 w-96 items-center justify-center bg-black rounded-xl mb-4 overflow-hidden relative"
      >
        {!isCameraOn && !loading && (
          user?.imageUrl ? (
            <img src={user.imageUrl} alt="profile" className="w-24 h-24 rounded-full object-cover" />
          ) : (
            <span className="text-sky-1">Camera is off</span>
          )
        )}
        {loading && <span className="text-sky-1">Loading camera...</span>}
        {previewError && <span className="text-red-400">{previewError}</span>}
      </div>
      <div className="flex gap-8 mb-2">
        <button
          type="button"
          onClick={handleCameraToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded transition 
            ${isCameraOn ? 'bg-green-700 hover:bg-green-800' : 'bg-dark-3 hover:bg-dark-4'}
          `}
          aria-label={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
        >
          {isCameraOn ? (
            <Video className="text-white" size={24} />
          ) : (
            <VideoOff className="text-red-500" size={24} />
          )}
        </button>
        <button
          type="button"
          onClick={handleMicToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded transition 
            ${isMicOn ? 'bg-green-700 hover:bg-green-800' : 'bg-dark-3 hover:bg-dark-4'}
          `}
          aria-label={isMicOn ? 'Turn mic off' : 'Turn mic on'}
        >
          {isMicOn ? (
            <Mic className="text-white" size={24} />
          ) : (
            <MicOff className="text-red-500" size={24} />
          )}
        </button>
        <button
          type="button"
          onClick={() => setShowSettings((p) => !p)}
          className="flex items-center gap-2 px-4 py-2 rounded bg-dark-3 hover:bg-dark-4"
          aria-label="Device settings"
        >
          <Settings className="text-white" size={24} />
        </button>
      </div>
      {showSettings && (
        <div className="bg-dark-3 rounded p-4 mb-2 flex flex-col gap-2 w-80">
          <label className="font-semibold">Camera:</label>
          <select
            className="bg-dark-4 py-1 px-2 rounded"
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
          >
            {cameraDevices.map((d: any) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId}`}</option>
            ))}
          </select>
          <label className="font-semibold mt-2">Microphone:</label>
          <select
            className="bg-dark-4 py-1 px-2 rounded"
            value={selectedMicId}
            onChange={(e) => setSelectedMicId(e.target.value)}
          >
            {micDevices.map((d: any) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId}`}</option>
            ))}
          </select>
        </div>
      )}
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