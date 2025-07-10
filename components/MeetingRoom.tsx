'use client';

import { useEffect, useRef, useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
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
  const [error, setError] = useState<string | null>(null);
  const joiningRef = useRef(false);

  useEffect(() => {
    if (!client || !user || joiningRef.current) return;

    let disposed = false;
    let localTracksInner: [any, any] = [null, null];
    let AgoraRTC: any;

    const join = async () => {
      if (client.connectionState === 'CONNECTED' || client.connectionState === 'CONNECTING') {
        console.log('Client already connected, skipping join');
        setJoined(true);
        return;
      }

      joiningRef.current = true;
      try {
        const mod = await import('agora-rtc-sdk-ng');
        AgoraRTC = mod.default;

        const savedState = JSON.parse(localStorage.getItem('meetingState') || '{}');
        const cameraOn = savedState.isCameraOn ?? true;
        const micOn = savedState.isMicOn ?? true;
        const cameraId = savedState.selectedCamera || null;
        const micId = savedState.selectedMicrophone || null;

        console.log('Initializing tracks with state:', { cameraOn, micOn, cameraId, micId });

        setIsCameraOn(cameraOn);
        setIsMicOn(micOn);
        setSelectedCamera(cameraId);
        setSelectedMicrophone(micId);

        localTracksInner = await Promise.all([
          micOn && micId ? AgoraRTC.createMicrophoneAudioTrack({ microphoneId: micId }) : null,
          cameraOn && cameraId ? AgoraRTC.createCameraVideoTrack({ cameraId: cameraId }) : null,
        ]);

        console.log('Tracks initialized:', localTracksInner);
        setLocalTracks(localTracksInner);

        // Use numeric ID if possible, otherwise string
        const userId = isNaN(Number(user.id)) ? user.id : Number(user.id);
        console.log('Joining with userId:', userId);

        await client.join(process.env.NEXT_PUBLIC_AGORA_APP_ID!, channel, token, userId);
        const tracksToPublish = localTracksInner.filter((track) => track !== null);
        if (tracksToPublish.length) {
          console.log('Publishing tracks:', tracksToPublish);
          await client.publish(tracksToPublish);
        }
        setJoined(true);
        setError(null);
      } catch (e: any) {
        console.error('Agora join error:', e);
        setError(`Failed to join meeting: ${e.message}`);
      } finally {
        joiningRef.current = false;
      }
    };

    join();

    const handleUserPublished = async (remoteUser: any, mediaType: 'audio' | 'video') => {
      try {
        await client.subscribe(remoteUser, mediaType);
        console.log('Subscribed to remote user:', remoteUser.uid, 'media:', mediaType);
        setRemoteUsers([...client.remoteUsers]);
      } catch (e) {
        console.error('Subscription error:', e);
      }
    };

    const handleUserLeft = () => {
      console.log('Remote user left');
      setRemoteUsers([...client.remoteUsers]);
    };

    client.on('user-published', handleUserPublished);
    client.on('user-left', handleUserLeft);

    return () => {
      disposed = true;
      if (localTracksInner) localTracksInner.forEach((track) => track && track.close());
      client.removeAllListeners();
      if (client.connectionState === 'CONNECTED') {
        client.leave().catch((e: any) => console.error('Leave error:', e));
      }
      setJoined(false);
      setLocalTracks(null);
      setRemoteUsers([]);
      joiningRef.current = false;
    };
  }, [client, channel, token, user]);

  useEffect(() => {
    if (joined && localTracks && user?.id && videoRefs.current[user.id] && isCameraOn && localTracks[1]) {
      console.log('Playing local video track for user:', user.id, 'on element:', videoRefs.current[user.id]);
      try {
        localTracks[1].play(videoRefs.current[user.id], { fit: 'contain' });
      } catch (e) {
        console.error('Error playing local video:', e);
        setError('Failed to play local video. Please check camera permissions.');
      }
    }
  }, [joined, localTracks, user?.id, isCameraOn]);

  useEffect(() => {
    if (joined) {
      remoteUsers.forEach((remoteUser) => {
        if (remoteUser.videoTrack && videoRefs.current[remoteUser.uid]) {
          console.log('Playing remote video for user:', remoteUser.uid, 'on element:', videoRefs.current[remoteUser.uid]);
          try {
            remoteUser.videoTrack.play(videoRefs.current[remoteUser.uid], { fit: 'contain' });
          } catch (e) {
            console.error('Error playing remote video:', e);
          }
        }
      });
    }
  }, [joined, remoteUsers]);

  if (!joined || !user) return <Loader />;
  if (error) return <div className="text-red-400 text-center min-h-screen flex items-center justify-center">{error}</div>;

  return (
    <section className="flex flex-col items-center justify-center gap-6 text-white bg-dark-2 min-h-screen pb-20">
      <h1 className="text-3xl font-bold">Meeting Room</h1>
      <div className="flex flex-wrap gap-4 justify-center max-w-[1200px]">
        <div className="relative w-[640px] h-[480px] bg-black rounded-xl overflow-hidden shadow-lg">
          <div
            ref={(el) => {
              videoRefs.current[user.id] = el;
              console.log('Set video ref for user:', user.id, el);
            }}
            className="w-full h-full"
          />
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
          <div
            key={remoteUser.uid}
            className="relative w-[640px] h-[480px] bg-black rounded-xl overflow-hidden shadow-lg"
          >
            <div
              ref={(el) => {
                videoRefs.current[remoteUser.uid] = el;
                console.log('Set video ref for remote user:', remoteUser.uid, el);
              }}
              className="w-full h-full"
            />
            <span className="absolute bottom-2 left-2 text-sm bg-dark-1 bg-opacity-70 px-2 py-1 rounded">
              User {remoteUser.uid}
            </span>
          </div>
        ))}
      </div>
      <div className={cn('absolute top-4 right-4 bg-dark-1 p-4 rounded hidden', { 'block': showParticipants })}>
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
      <div className="fixed bottom-0 left-0 flex w-full items-center justify-center gap-5 bg-dark-1 py-4">
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