'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';

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

  useEffect(() => {
    let disposed = false;
    let AgoraRTC: any;

    const setupTracks = async () => {
      setLoading(true);
      try {
        const mod = await import('agora-rtc-sdk-ng');
        AgoraRTC = mod.default;
        if (isCameraOn) {
          cameraTrackRef.current = await AgoraRTC.createCameraVideoTrack();
        } else {
          if (cameraTrackRef.current) {
            cameraTrackRef.current.close();
            cameraTrackRef.current = null;
          }
        }
        if (isMicOn) {
          micTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
        } else {
          if (micTrackRef.current) {
            micTrackRef.current.close();
            micTrackRef.current = null;
          }
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
      if (cameraTrackRef.current) {
        cameraTrackRef.current.close();
        cameraTrackRef.current = null;
      }
      if (micTrackRef.current) {
        micTrackRef.current.close();
        micTrackRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, [isCameraOn, isMicOn]);

  const handleCameraToggle = () => {
    setIsCameraOn((prev) => !prev);
  };

  const handleMicToggle = () => {
    setIsMicOn((prev) => !prev);
  };

  const handleJoin = () => {
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
          <span className="hidden sm:inline">{isCameraOn ? 'Camera On' : 'Camera Off'}</span>
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
          <span className="hidden sm:inline">{isMicOn ? 'Mic On' : 'Mic Off'}</span>
        </button>
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