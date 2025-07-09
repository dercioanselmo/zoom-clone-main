'use client';

import { useEffect, useRef, useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from './ui/button';
import { Video, VideoOff, Mic, MicOff, Settings, Users, LogOut } from 'lucide-react';
import { AgoraContext } from '@/providers/AgoraClientProvider';
import Loader from './Loader';
import { cn } from '@/lib/utils';

const MeetingRoom = ({
  channel,
  token,
}: {
  channel: string;
  token: string;
}) => {
  const router = useRouter();
  const { user } = useUser();
  const { client } = useContext(AgoraContext)!;
  const [joined, setJoined] = useState(false);
  const [localTracks, setLocalTracks] = useState<[any, any] | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [cameraDevices, setCameraDevices] = useState<any[]>([]);
  const [micDevices, setMicDevices] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(undefined);
  const [selectedMicId, setSelectedMicId] = useState<string | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  const videoRefs = useRef<{ [uid: string]: HTMLDivElement | null }>({});
  const localVideoRef = useRef<HTMLDivElement>(null);

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

  // Join and setup tracks - client-only!
  useEffect(() => {
    if (!client || !user) return;

    let disposed = false;
    let localTracksInner: [any, any] = [null, null];
    let AgoraRTC: any;

    const join = async () => {
      try {
        const mod = await import('agora-rtc-sdk-ng');
        AgoraRTC = mod.default;
        if (isCameraOn && selectedCameraId) {
          localTracksInner[1] = await AgoraRTC.createCameraVideoTrack({ cameraId: selectedCameraId });
        } else {
          localTracksInner[1] = null;
        }
        if (isMicOn && selectedMicId) {
          localTracksInner[0] = await AgoraRTC.createMicrophoneAudioTrack({ microphoneId: selectedMicId });
        } else {
          localTracksInner[0] = null;
        }
        // Remove nulls for publish
        const tracksToPublish = localTracksInner.filter(Boolean);
        setLocalTracks(localTracksInner);

        await client.join(process.env.NEXT_PUBLIC_AGORA_APP_ID!, channel, token, user.id);
        if (tracksToPublish.length) await client.publish(tracksToPublish);
        setJoined(true);
      } catch (e) {
        // Handle error (optionally show toast)
        console.error('Agora join error:', e);
      }
    };

    join();

    // remote user events
    const handleUserPublished = async (remoteUser: any, mediaType: any) => {
      await client.subscribe(remoteUser, mediaType);
      setRemoteUsers(Array.from(client.remoteUsers));
    };
    const handleUserLeft = () => {
      setRemoteUsers(Array.from(client.remoteUsers));
    };

    client.on('user-published', handleUserPublished);
    client.on('user-left', handleUserLeft);

    return () => {
      disposed = true;
      if (localTracksInner) localTracksInner.forEach((track) => track && track.close());
      client.removeAllListeners();
      client.leave();
      setJoined(false);
      setLocalTracks(null);
      setRemoteUsers([]);
    };
    // eslint-disable-next-line
  }, [client, channel, token, user?.id, isCameraOn, isMicOn, selectedCameraId, selectedMicId]);

  // Play local video
  useEffect(() => {
    if (localTracks && user?.id && videoRefs.current[user.id] && localTracks[1]) {
      localTracks[1].play(videoRefs.current[user.id]);
    }
  }, [localTracks, user?.id]);

  // Play remote videos
  useEffect(() => {
    remoteUsers.forEach((remoteUser) => {
      if (
        remoteUser.videoTrack &&
        videoRefs.current[remoteUser.uid]
      ) {
        remoteUser.videoTrack.play(videoRefs.current[remoteUser.uid]);
      }
    });
  }, [remoteUsers]);

  // Toggle camera (on/off)
  const handleCameraToggle = async () => {
    setIsCameraOn((prev) => !prev);
  };
  // Toggle mic (on/off)
  const handleMicToggle = async () => {
    setIsMicOn((prev) => !prev);
  };

  // Change camera device
  const handleCameraChange = (e: any) => {
    setSelectedCameraId(e.target.value);
  };
  // Change mic device
  const handleMicChange = (e: any) => {
    setSelectedMicId(e.target.value);
  };

  if (!joined) return <Loader />;

  return (
    <section className="relative h-screen w-full overflow-hidden pt-4 text-white">
      <div className="relative flex size-full items-center justify-center">
        <div className="flex size-full max-w-[1000px] items-center gap-4">
          {/* Local Video or Profile */}
          <div
            ref={(el) => user?.id && (videoRefs.current[user.id] = el)}
            className="w-80 h-56 bg-black rounded-lg flex items-center justify-center relative"
          >
            {(!isCameraOn || !localTracks?.[1]) && user?.imageUrl && (
              <img
                src={user.imageUrl}
                alt="profile"
                className="w-24 h-24 rounded-full object-cover"
                style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}
              />
            )}
          </div>
          {/* Remote Videos */}
          {remoteUsers.map((remoteUser) => (
            <div
              key={remoteUser.uid}
              ref={(el) => (videoRefs.current[remoteUser.uid] = el)}
              className="w-80 h-56 bg-black rounded-lg"
            />
          ))}
        </div>
        <div
          className={cn('h-[calc(100vh-86px)] hidden ml-2', {
            'show-block': showParticipants,
          })}
        >
          {/* Participants List */}
          <ul>
            <li className="text-lg font-bold mb-2">Participants</li>
            <li>{user?.username || user?.id} (You)</li>
            {remoteUsers.map((u) => (
              <li key={u.uid}>{u.uid}</li>
            ))}
          </ul>
        </div>
      </div>
      {/* Toolbar */}
      <div className="fixed bottom-0 flex w-full items-center justify-center gap-3 pb-4">
        <button
          onClick={handleCameraToggle}
          className={`p-3 rounded-full ${isCameraOn ? 'bg-green-700 hover:bg-green-800' : 'bg-dark-3 hover:bg-dark-4'}`}
          aria-label={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
        >
          {isCameraOn ? <Video size={24} /> : <VideoOff size={24} className="text-red-500" />}
        </button>
        <button
          onClick={handleMicToggle}
          className={`p-3 rounded-full ${isMicOn ? 'bg-green-700 hover:bg-green-800' : 'bg-dark-3 hover:bg-dark-4'}`}
          aria-label={isMicOn ? 'Turn mic off' : 'Turn mic on'}
        >
          {isMicOn ? <Mic size={24} /> : <MicOff size={24} className="text-red-500" />}
        </button>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="p-3 rounded-full bg-dark-3 hover:bg-dark-4"
          aria-label="Device settings"
        >
          <Settings size={24} />
        </button>
        <button onClick={() => setShowParticipants((prev) => !prev)} className="p-3 rounded-full bg-dark-3 hover:bg-dark-4">
          <Users size={24} />
        </button>
        <Button onClick={() => router.push(`/`)} className="rounded-full bg-red-600 p-3 ml-4">
          <LogOut size={24} />
        </Button>
      </div>
      {showSettings && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-dark-3 rounded p-4 flex flex-col gap-2 w-80 z-50">
          <label className="font-semibold">Camera:</label>
          <select
            className="bg-dark-4 py-1 px-2 rounded"
            value={selectedCameraId}
            onChange={handleCameraChange}
          >
            {cameraDevices.map((d: any) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId}`}</option>
            ))}
          </select>
          <label className="font-semibold mt-2">Microphone:</label>
          <select
            className="bg-dark-4 py-1 px-2 rounded"
            value={selectedMicId}
            onChange={handleMicChange}
          >
            {micDevices.map((d: any) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId}`}</option>
            ))}
          </select>
        </div>
      )}
    </section>
  );
};

export default MeetingRoom;