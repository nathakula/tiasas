/**
 * E*TRADE OAuth - Step 3: Handle OAuth callback
 * GET /api/brokerbridge/etrade/callback?oauth_token=xxx&oauth_verifier=xxx&state=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ETradeOAuth } from "@tiasas/core/src/brokerbridge/providers/etrade/oauth";
import { ETradeClient } from "@tiasas/core/src/brokerbridge/providers/etrade/client";
import { db as prisma } from "@/lib/db";
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/signin', request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');
    const state = searchParams.get('state');

    if (!oauthToken || !oauthVerifier || !state) {
      return NextResponse.json(
        { error: 'Missing OAuth parameters' },
        { status: 400 }
      );
    }

    // Decode state to get token secret and orgId
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    const { tokenSecret: requestTokenSecret, orgId } = decoded;

    const consumerKey = process.env.ETRADE_CONSUMER_KEY;
    const consumerSecret = process.env.ETRADE_CONSUMER_SECRET;
    const sandbox = process.env.ETRADE_SANDBOX === 'true';

    if (!consumerKey || !consumerSecret) {
      return NextResponse.json(
        { error: 'E*TRADE credentials not configured' },
        { status: 500 }
      );
    }

    // Initialize OAuth client
    const oauth = new ETradeOAuth({
      consumerKey,
      consumerSecret,
      sandbox,
    });

    // Step 3: Exchange request token for access token
    const { token: accessToken, tokenSecret: accessTokenSecret } =
      await oauth.getAccessToken(oauthToken, requestTokenSecret, oauthVerifier);

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

    // Redirect back to connections page
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:13000';
    return NextResponse.redirect(
      new URL(`/market-desk/connections?success=etrade`, baseUrl)
    );
  } catch (error) {
    console.error('E*TRADE callback error:', error);
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:13000';
    const errorMessage = error instanceof Error ? error.message : 'OAuth callback failed';
    return NextResponse.redirect(
      new URL(`/market-desk/connections?error=${encodeURIComponent(errorMessage)}`, baseUrl)
    );
  }
}
