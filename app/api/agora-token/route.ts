import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const appCertificate = process.env.AGORA_APP_CERTIFICATE!;

export async function POST(req: NextRequest) {
  try {
    const { channelName, uid, role = 'publisher' } = await req.json();
    if (!channelName || !uid) {
      return NextResponse.json({ error: 'Missing channelName or uid' }, { status: 400 });
    }

    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      agoraRole,
      privilegeExpiredTs
    );

    return NextResponse.json({ token });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}