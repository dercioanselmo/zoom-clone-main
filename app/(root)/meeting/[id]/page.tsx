'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useParams } from 'next/navigation';
import Loader from '@/components/Loader';
import Alert from '@/components/Alert';
import MeetingSetup from '@/components/MeetingSetup';
import MeetingRoom from '@/components/MeetingRoom';

const fetchAgoraToken = async (channel: string, uid: string) => {
  const res = await fetch('/api/agora-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelName: channel, uid }),
  });
  if (!res.ok) throw new Error('Failed to get token');
  const data = await res.json();
  return data.token as string;
};

const MeetingPage = () => {
  const { id } = useParams();
  const { isLoaded, user } = useUser();
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;
    setTokenLoading(true);
    fetchAgoraToken(id as string, user.id)
      .then((tk) => {
        if (!cancelled) setToken(tk);
      })
      .catch(() => {
        if (!cancelled) setToken(null);
      })
      .finally(() => {
        if (!cancelled) setTokenLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  if (!isLoaded || tokenLoading) return <Loader />;

  if (!token) return (
    <p className="text-center text-3xl font-bold text-white">
      Failed to get token
    </p>
  );

  return (
    <main className="h-screen w-full">
      {!isSetupComplete ? (
        <MeetingSetup setIsSetupComplete={setIsSetupComplete} channel={id as string} token={token} />
      ) : (
        <MeetingRoom channel={id as string} token={token} />
      )}
    </main>
  );
};

export default MeetingPage;