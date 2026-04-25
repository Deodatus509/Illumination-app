import { AccessToken } from 'livekit-server-sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const room = req.query.room as string;
  const username = req.query.username as string;
  const role = req.query.role as string || 'spectator';

  if (!room) {
    return res.status(400).json({ error: 'Missing room name' });
  }

  // Ensure unique identity if username is missing or generic
  const identity = username || `guest-${Math.floor(Math.random() * 10000)}`;

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('LIVEKIT_API_KEY or LIVEKIT_API_SECRET is not set');
    return res.status(500).json({ error: 'LiveKit configuration missing on server' });
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: identity,
    });

    const isHost = role === 'host';

    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: isHost,
      canPublishData: isHost,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    
    return res.status(200).json({ token });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
}
