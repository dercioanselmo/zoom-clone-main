// components/MeetingRoom.tsx
'use client';

import { useEffect, useRef, useState, useContext } from 'react';
import { useRouter } from 'next/navigation'; // Correct import for useRouter
import { useUser } from '@clerk/nextjs';
import { Button } from './ui/button';
import { Users } from 'lucide-react';
import { AgoraContext } from '@/providers/AgoraClientProvider';
import Loader from './Loader';
import { cn } from '@/lib/utils';
import { DeviceControls } from './DeviceControls';

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
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string | null>(null);
  const videoRefs = useRef<{ [uid: string]: HTMLDivElement | null }>({});
  const [showParticipants, setShowParticipants] = useState(false);

  useEffect(() => {
    if (!client || !user) return;

    let disposed = false;
    let localTracksInner: [any, any] = [null, null];
    let AgoraRTC: any;

    const join = async () => {
      try {
        const mod = await import('agora-rtc-sdk-ng');
        AgoraRTC = mod.default;

        const savedState = JSON.parse(localStorage.getItem('meetingState') || '{}');
        setIsCameraOn(savedState.isCameraOn ?? true);
        setIsMicOn(savedState.isMicOn ?? true);
        setSelectedCamera(savedState.selectedCamera || null);
        setSelectedMicrophone(savedState.selectedMicrophone || null);

        localTracksInner = await Promise.all([
          savedState.isMicOn && savedState.selectedMicrophone
            ? AgoraRTC.createMicrophoneAudioTrack({ microphoneId: savedState.selectedMicrophone })
            : null,
          savedState.isCameraOn && savedState.selectedCamera
            ? AgoraRTC.createCameraVideoTrack({ cameraId: savedState.selectedCamera })
            : null,
        ]);
        setLocalTracks(localTracksInner);

        await client.join(process.env.NEXT_PUBLIC_AGORA_APP_ID!, channel, token, user.id);
        const tracksToPublish = localTracksInner.filter((track) => track !== null);
        if (tracksToPublish.length) await client.publish(tracksToPublish);
        setJoined(true);
      } catch (e) {
        console.error('Agora join error:', e);
      }
    };

    join();

    const handleUserPublished = async (remoteUser: any, mediaType: 'audio' | 'video') => {
      await client.subscribe(remoteUser, mediaType);
      setRemoteUsers([...client.remoteUsers]);
    };
    const handleUserLeft = () => {
      setRemoteUsers([...client.remoteUsers]);
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
  }, [client, channel, token, user?.id]);

  useEffect(() => {
    if (localTracks && user?.id && videoRefs.current[user.id] && isCameraOn && localTracks[1]) {
      localTracks[1].play(videoRefs.current[user.id]);
    }
  }, [localTracks, user?.id, isCameraOn]);

  useEffect(() => {
    remoteUsers.forEach((remoteUser) => {
      if (remoteUser.videoTrack && videoRefs.current[remoteUser.uid]) {
        remoteUser.videoTrack.play(videoRefs.current[remoteUser.uid]);
      }
    });
  }, [remoteUsers]);

  if (!joined || !user) return <Loader />;

  return (
    <section className="relative h-screen w-full overflow-hidden pt-4 text-white bg-dark-2">
      <div className="relative flex size-full items-center justify-center">
        <div className="flex size-full max-w-[1000px] items-center gap-4 flex-wrap">
          <div className="relative w-80 h-56 bg-black rounded-lg overflow-hidden">
            <div ref={(el) => (videoRefs.current[user.id] = el)} className="w-full h-full" />
            {!isCameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-3">
                <img src={user.imageUrl} alt="Profile" className="w-16 h-16 rounded-full mb-2" />
                <span className="text-white">{user.username || user.id} (You)</span>
                <span className="text-xs bg-green-500 text-white px-2 py-1 rounded mt-1">Host</span>
              </div>
            )}
            <span className="absolute bottom-2 left-2 text-sm bg-dark-1 bg-opacity-70 px-2 py-1 rounded">
              {user.username || user.id} (You)
            </span>
          </div>
          {remoteUsers.map((remoteUser) => (
            <div key={remoteUser.uid} className="relative w-80 h-56 bg-black rounded-lg overflow-hidden">
              <div ref={(el) => (videoRefs.current[remoteUser.uid] = el)} className="w-full h-full" />
              <span className="absolute bottom-2 left-2 text-sm bg-dark-1 bg-opacity-70 px-2 py-1 rounded">
                User {remoteUser.uid}
              </span>
            </div>
          ))}
        </div>
        <div className={cn('h-[calc(100vh-86px)] hidden ml-2', { 'show-block': showParticipants })}>
          <div className="bg-dark-1 p-4 rounded h-full overflow-y-auto">
            <ul>
              <li className="text-lg font-bold mb-2">Participants</li>
              <li className="flex items-center gap-2">
                <img src={user.imageUrl} alt="Profile" className="w-8 h-8 rounded-full" />
                {user.username || user.id} (You, Host)
              </li>
              {remoteUsers.map((u) => (
                <li key={u.uid}>User {u.uid}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 flex w-full items-center justify-center gap-5 bg-dark-1 py-4">
        <DeviceControls
          isCameraOn={isCameraOn}
          isMicOn={isMicOn}
          setIsCameraOn={setIsCameraOn}
          setIsMicOn={setIsMicOn}
          selectedCamera={selectedCamera}
          selectedMicrophone={selectedMicrophone}
          setSelectedCamera={setSelectedCamera}
          setSelectedMicrophone={setSelectedMicrophone}
          cameraTrack={localTracks ? localTracks[1] : null}
          micTrack={localTracks ? localTracks[0] : null}
          client={client}
        />
        <Button onClick={() => router.push('/')} className="bg-red-500 hover:bg-red-600">
          Leave Call
        </Button>
        <button
          onClick={() => setShowParticipants((prev) => !prev)}
          className="p-3 rounded-full bg-dark-3 hover:bg-dark-4 transition"
        >
          <Users className="text-white" size={24} />
        </button>
      </div>
    </section>
  );
};

export default MeetingRoom;