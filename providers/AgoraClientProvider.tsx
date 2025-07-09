'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
// DON'T import AgoraRTC here!

export const AgoraContext = React.createContext<{
  client: any | null;
  appId: string;
} | null>(null);

const AgoraClientProvider = ({ children }: { children: ReactNode }) => {
  const [client, setClient] = useState<any | null>(null);
  const { user, isLoaded } = useUser();
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

  useEffect(() => {
    if (!isLoaded || !user) return;
    if (!appId) throw new Error('Agora App ID is missing');

    // Only import AgoraRTC on the client
    let rtcClient: any;
    import('agora-rtc-sdk-ng').then(({ default: AgoraRTC }) => {
      rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      setClient(rtcClient);
    });

    return () => {
      if (rtcClient) rtcClient.leave();
      setClient(null);
    };
    // eslint-disable-next-line
  }, [isLoaded, user, appId]);

  if (!client) return <div className="flex-center h-screen w-full text-white">Loading...</div>;

  return (
    <AgoraContext.Provider value={{ client, appId }}>
      {children}
    </AgoraContext.Provider>
  );
};

export default AgoraClientProvider;