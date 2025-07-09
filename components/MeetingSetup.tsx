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
  const videoRef = useRef<HTMLDivElement>(null);
  const cameraTrackRef = useRef<any>(null);

  useEffect(() => {
    let disposed = false;
    // Dynamically import AgoraRTC only on client
    import('agora-rtc-sdk-ng').then(({ default: AgoraRTC }) => {
      AgoraRTC.createCameraVideoTrack()
        .then((track) => {
          if (disposed) {
            track.close();
            return;
          }
          cameraTrackRef.current = track;
          if (videoRef.current) {
            track.play(videoRef.current);
          }
          setLoading(false);
        })
        // eslint-disable-next-line n/handle-callback-err
        .catch((err) => {
          setPreviewError('Unable to access camera. Please check permissions or connect a camera.');
          setLoading(false);
        });
    });

    return () => {
      disposed = true;
      if (cameraTrackRef.current) {
        cameraTrackRef.current.close();
        cameraTrackRef.current = null;
      }
    };
  }, []);

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
        {loading && <span className="text-sky-1">Loading camera...</span>}
        {previewError && <span className="text-red-400">{previewError}</span>}
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