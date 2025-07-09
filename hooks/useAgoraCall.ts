import { useContext, useEffect, useState, useRef } from 'react';
import { AgoraContext } from '@/providers/AgoraClientProvider';
import { useUser } from '@clerk/nextjs';

type UseAgoraCallParams = {
  channel: string;
  token: string;
  onJoined?: () => void;
};

export const useAgoraCall = ({ channel, token, onJoined }: UseAgoraCallParams) => {
  const { client, appId } = useContext(AgoraContext)!;
  const { user } = useUser();
  const [joined, setJoined] = useState(false);
  const [localTracks, setLocalTracks] = useState<[any, any] | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Join the channel and setup tracks
  useEffect(() => {
    if (!client || !user) return;
    let isMounted = true;
    let localTracksRef: [any, any] | null = null;

    const joinChannel = async () => {
      try {
        const [microphoneTrack, cameraTrack] = await Promise.all([
          AgoraRTC.createMicrophoneAudioTrack(),
          AgoraRTC.createCameraVideoTrack(),
        ]);
        localTracksRef = [microphoneTrack, cameraTrack];
        if (!isMounted) return;

        setLocalTracks(localTracksRef);

        await client.join(appId, channel, token, user.id);
        await client.publish(localTracksRef);

        setJoined(true);
        onJoined?.();
      } catch (err) {
        setError((err as Error).message);
      }
    };

    joinChannel();

    // handle remote users
    const handleUserPublished = async (user: any, mediaType: any) => {
      await client.subscribe(user, mediaType);
      setRemoteUsers(Array.from(client.remoteUsers));
    };
    const handleUserUnpublished = (user: any) => {
      setRemoteUsers(Array.from(client.remoteUsers));
    };
    const handleUserJoined = (user: any) => {
      setRemoteUsers(Array.from(client.remoteUsers));
    };
    const handleUserLeft = (user: any) => {
      setRemoteUsers(Array.from(client.remoteUsers));
    };

    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnpublished);
    client.on('user-joined', handleUserJoined);
    client.on('user-left', handleUserLeft);

    return () => {
      isMounted = false;
      if (localTracksRef) {
        localTracksRef.forEach((track) => track.close());
      }
      client.removeAllListeners();
      client.leave();
      setJoined(false);
      setLocalTracks(null);
      setRemoteUsers([]);
    };
    // eslint-disable-next-line
  }, [client, channel, token, user?.id]);

  return { joined, localTracks, remoteUsers, error };
};