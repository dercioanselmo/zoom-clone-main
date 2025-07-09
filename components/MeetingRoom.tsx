// components/MeetingRoom.tsx
'use client';

import { useEffect, useRef, useState, useContext } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from './ui/button';
import { Users, Video, VideoOff, Mic, MicOff, Settings } from 'lucide-react';
import { AgoraContext } from '@/providers/AgoraClientProvider';
import Loader from './Loader';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

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
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [devices, setDevices] = useState<{ cameras: MediaDeviceInfo[]; microphones: MediaDeviceInfo[] }>({
    cameras: [],
    microphones: [],
  });
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string | null>(null);
  const videoRefs = useRef<{ [uid: string]: HTMLDivElement | null }>({});
  const [showParticipants, setShowParticipants] = useState(false);

  useEffect(() => {
    if (!client || !user) return;

    let disposed = false;
    let localTracksInner: [any, any] = [null, null];
    let AgoraRTC: any;

    const setupDevices = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach((track) => track.stop());
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === 'videoinput');
        const microphones = devices.filter((device) => device.kind === 'audioinput');
        setDevices({ cameras, microphones });
      } catch (err) {
        console.error('Device enumeration failed:', err);
      }
    };

    const join = async () => {
      try {
        const mod = await import('agora-rtc-sdk-ng');
        AgoraRTC = mod.default;

        // Load state from localStorage
        const savedState = JSON.parse(localStorage.getItem('meetingState') || '{}');
        setIsCameraOn(savedState.isCameraOn ?? true);
        setIsMicOn(savedState.isMicOn ?? true);
        setSelectedCamera(savedState.selectedCamera || devices.cameras[0]?.deviceId || null);
        setSelectedMicrophone(savedState.selectedMicrophone || devices.microphones[0]?.deviceId || null);

        localTracksInner = await Promise.all([
          savedState.isMicOn ? AgoraRTC.createMicrophoneAudioTrack({ microphoneId: savedState.selectedMicrophone }) : null,
          savedState.isCameraOn ? AgoraRTC.createCameraVideoTrack({ cameraId: savedState.selectedCamera }) : null,
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

    setupDevices().then(() => {
      if (devices.cameras.length && devices.microphones.length) {
        setSelectedCamera(devices.cameras[0]?.deviceId || null);
        setSelectedMicrophone(devices.microphones[0]?.deviceId || null);
      }
      join();
    });

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

  const handleCameraToggle = async () => {
    if (!localTracks) return;
    const newCameraOn = !isCameraOn;
    setIsCameraOn(newCameraOn);
    if (newCameraOn && !localTracks[1] && selectedCamera) {
      const cameraTrack = await (await import('agora-rtc-sdk-ng')).default.createCameraVideoTrack({
        cameraId: selectedCamera,
      });
      localTracks[1] = cameraTrack;
      setLocalTracks([...localTracks]);
      await client.publish(cameraTrack);
      if (videoRefs.current[user?.id!]) cameraTrack.play(videoRefs.current[user?.id!]);
    } else if (!newCameraOn && localTracks[1]) {
      await client.unpublish(localTracks[1]);
      localTracks[1].close();
      localTracks[1] = null;
      setLocalTracks([...localTracks]);
    }
  };

  const handleMicToggle = async () => {
    if (!localTracks) return;
    const newMicOn = !isMicOn;
    setIsMicOn(newMicOn);
    if (newMicOn && !localTracks[0] && selectedMicrophone) {
      const micTrack = await (await import('agora-rtc-sdk-ng')).default.createMicrophoneAudioTrack({
        microphoneId: selectedMicrophone,
      });
      localTracks[0] = micTrack;
      setLocalTracks([...localTracks]);
      await client.publish(micTrack);
    } else if (!newMicOn && localTracks[0]) {
      await client.unpublish(localTracks[0]);
      localTracks[0].close();
      localTracks[0] = null;
      setLocalTracks([...localTracks]);
    }
  };

  if (!joined || !user) return <Loader />;

  return (
    <section className="relative h-screen w-full overflow-hidden pt-4 text-white bg-dark-2">
      <div className="relative flex size-full items-center justify-center">
        <div className="flex size-full max-w-[1000px] items-center gap-4 flex-wrap">
          {/* Local Video */}
          <div className="relative w-80 h-56 bg-black rounded-lg overflow-hidden">
            <div
              ref={(el) => (videoRefs.current[user.id] = el)}
              className="w-full h-full"
            />
            {!isCameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-3">
                <img
                  src={user.imageUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full mb-2"
                />
                <span className="text-white">{user.username || user.id} (You)</span>
                <span className="text-xs bg-green-500 text-white px-2 py-1 rounded mt-1">Host</span>
              </div>
            )}
            <span className="absolute bottom-2 left-2 text-sm bg-dark-1 bg-opacity-70 px-2 py-1 rounded">
              {user.username || user.id} (You)
            </span>
          </div>
          {/* Remote Videos */}
          {remoteUsers.map((remoteUser) => (
            <div
              key={remoteUser.uid}
              className="relative w-80 h-56 bg-black rounded-lg overflow-hidden"
            >
              <div
                ref={(el) => (videoRefs.current[remoteUser.uid] = el)}
                className="w-full h-full"
              />
              <span className="absolute bottom-2 left-2 text-sm bg-dark-1 bg-opacity-70 px-2 py-1 rounded">
                User {remoteUser.uid}
              </span>
            </div>
          ))}
        </div>
        <div
          className={cn('h-[calc(100vh-86px)] hidden ml-2', {
            'show-block': showParticipants,
          })}
        >
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
        <button
          onClick={handleCameraToggle}
          className={cn(
            'p-3 rounded-full transition',
            isCameraOn ? 'bg-green-700 hover:bg-green-800' : 'bg-dark-3 hover:bg-dark-4'
          )}
        >
          {isCameraOn ? <Video className="text-white" size={24} /> : <VideoOff className="text-red-500" size={24} />}
        </button>
        <button
          onClick={handleMicToggle}
          className={cn(
            'p-3 rounded-full transition',
            isMicOn ? 'bg-green-700 hover:bg-green-800' : 'bg-dark-3 hover:bg-dark-4'
          )}
        >
          {isMicOn ? <Mic className="text-white" size={24} /> : <MicOff className="text-red-500" size={24} />}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-3 rounded-full bg-dark-3 hover:bg-dark-4 transition">
              <Settings className="text-white" size={24} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-dark-1 text-white border-dark-3">
            <div className="p-2">
              <label className="block text-sm font-medium mb-1">Camera</label>
              {devices.cameras.map((camera) => (
                <DropdownMenuItem
                  key={camera.deviceId}
                  onClick={async () => {
                    setSelectedCamera(camera.deviceId);
                    if (isCameraOn && localTracks && localTracks[1]) {
                      await client.unpublish(localTracks[1]);
                      localTracks[1].close();
                      const newCameraTrack = await (await import('agora-rtc-sdk-ng')).default.createCameraVideoTrack({
                        cameraId: camera.deviceId,
                      });
                      localTracks[1] = newCameraTrack;
                      setLocalTracks([...localTracks]);
                      await client.publish(newCameraTrack);
                      if (videoRefs.current[user.id]) newCameraTrack.play(videoRefs.current[user.id]);
                    }
                  }}
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
                  onClick={async () => {
                    setSelectedMicrophone(mic.deviceId);
                    if (isMicOn && localTracks && localTracks[0]) {
                      await client.unpublish(localTracks[0]);
                      localTracks[0].close();
                      const newMicTrack = await (await import('agora-rtc-sdk-ng')).default.createMicrophoneAudioTrack({
                        microphoneId: mic.deviceId,
                      });
                      localTracks[0] = newMicTrack;
                      setLocalTracks([...localTracks]);
                      await client.publish(newMicTrack);
                    }
                  }}
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