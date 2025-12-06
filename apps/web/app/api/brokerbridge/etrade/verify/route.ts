/**
 * E*TRADE OAuth - Complete verification with manual verifier code
 * POST /api/brokerbridge/etrade/verify
 * Body: { verifier: string, state: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ETradeOAuth } from "@tiasas/core/src/brokerbridge/providers/etrade/oauth";
import { ETradeClient } from "@tiasas/core/src/brokerbridge/providers/etrade/client";
import { db as prisma } from '@/lib/db';
import { BrokerProvider, BrokerConnectionStatus } from '@prisma/client';
import crypto from 'crypto';

// Simple encryption for storing tokens (should use a proper KMS in production)
function encryptToken(token: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.NEXTAUTH_SECRET || 'fallback-secret', 'salt', 32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { verifier, state } = body;

    if (!verifier || !state) {
      return NextResponse.json(
        { error: 'Missing verifier or state' },
        { status: 400 }
      );
    }

    // Decode state to get token secret, orgId, and request token
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    const { tokenSecret: requestTokenSecret, orgId, requestToken } = decoded;

    const consumerKey = process.env.ETRADE_CONSUMER_KEY;
    const consumerSecret = process.env.ETRADE_CONSUMER_SECRET;
    const sandbox = process.env.ETRADE_SANDBOX === 'true';

    if (!consumerKey || !consumerSecret) {
      return NextResponse.json(
        { error: 'E*TRADE credentials not configured' },
        { status: 500 }
      );
    }

    console.log('Verifying E*TRADE OAuth:');
    console.log('- Request Token:', requestToken);
    console.log('- Verifier:', verifier);

    // Initialize OAuth client
    const oauth = new ETradeOAuth({
      consumerKey,
      consumerSecret,
      sandbox,
    });

    // Exchange request token for access token
    const { token: accessToken, tokenSecret: accessTokenSecret } =
      await oauth.getAccessToken(requestToken, requestTokenSecret, verifier);

    console.log('- Access Token received:', accessToken.substring(0, 10) + '...');

    // Initialize E*TRADE API client
    const client = new ETradeClient(
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret,
      sandbox
    );

    // Fetch accounts to verify connection
    const accounts = await client.getAccounts();
    console.log('- Accounts fetched:', accounts.length);

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: 'No accounts found in E*TRADE connection' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Store connection in database
    const encryptedAuth = encryptToken(
      JSON.stringify({
        accessToken,
        accessTokenSecret,
        consumerKey,
        consumerSecret,
      })
    );

    const connection = await prisma.brokerConnection.create({
      data: {
        orgId,
        userId: user.id,
        broker: BrokerProvider.ETRADE,
        status: BrokerConnectionStatus.ACTIVE,
        encryptedAuth,
        lastSyncedAt: new Date(),
      },
    });

    console.log('- Connection created:', connection.id);

    // Create account records
    for (const account of accounts) {
      await prisma.brokerAccount.create({
        data: {
          connectionId: connection.id,
          nickname: account.accountName || account.accountDesc,
          maskedNumber: account.accountId,
          accountType: account.accountType,
        },
      });
    }

    console.log('- Accounts created:', accounts.length);

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      accountsCount: accounts.length,
    });
  } catch (error) {
    console.error('E*TRADE verification error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    );
  }
}
