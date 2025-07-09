'use client';

import { useEffect, useRef, useState, useContext } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from './ui/button';
import { Users } from 'lucide-react';
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
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { client } = useContext(AgoraContext)!;
  const [joined, setJoined] = useState(false);
  const [localTracks, setLocalTracks] = useState<[any, any] | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const videoRefs = useRef<{ [uid: string]: HTMLDivElement | null }>({});
  const [showParticipants, setShowParticipants] = useState(false);

  useEffect(() => {
    if (!client || !user) return;

    let mounted = true;
    let localTracksInner: [any, any] = [null, null];

    const join = async () => {
      try {
        const [microphoneTrack, cameraTrack] = await Promise.all([
          await window.AgoraRTC.createMicrophoneAudioTrack(),
          await window.AgoraRTC.createCameraVideoTrack(),
        ]);
        localTracksInner = [microphoneTrack, cameraTrack];
        setLocalTracks(localTracksInner);

        await client.join(process.env.NEXT_PUBLIC_AGORA_APP_ID!, channel, token, user.id);
        await client.publish(localTracksInner);
        setJoined(true);
      } catch (e) {
        // Handle error
      }
    };

    join();

    // remote users events
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
      if (localTracksInner) localTracksInner.forEach((track) => track && track.close());
      client.removeAllListeners();
      client.leave();
      setJoined(false);
      setLocalTracks(null);
      setRemoteUsers([]);
    };
    // eslint-disable-next-line
  }, [client, channel, token, user?.id]);

  // Play local video
  useEffect(() => {
    if (localTracks && videoRefs.current[user?.id]) {
      localTracks[1].play(videoRefs.current[user.id]);
    }
    // eslint-disable-next-line
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
    // eslint-disable-next-line
  }, [remoteUsers]);

  if (!joined) return <Loader />;

  return (
    <section className="relative h-screen w-full overflow-hidden pt-4 text-white">
      <div className="relative flex size-full items-center justify-center">
        <div className="flex size-full max-w-[1000px] items-center gap-4">
          {/* Local Video */}
          <div
            ref={(el) => (videoRefs.current[user?.id as string] = el)}
            className="w-80 h-56 bg-black rounded-lg"
          />
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
      {/* video layout and call controls */}
      <div className="fixed bottom-0 flex w-full items-center justify-center gap-5">
        <Button onClick={() => router.push(`/`)} className="bg-dark-4">
          Leave Call
        </Button>
        <button onClick={() => setShowParticipants((prev) => !prev)}>
          <div className="cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b]">
            <Users size={20} className="text-white" />
          </div>
        </button>
      </div>
    </section>
  );
};

export default MeetingRoom;