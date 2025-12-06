/**
 * E*TRADE OAuth - Step 1: Initiate OAuth flow
 * GET /api/brokerbridge/etrade/auth?orgId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ETradeOAuth } from "@tiasas/core/src/brokerbridge/providers/etrade/oauth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

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

    // Construct callback URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:13000';
    const callbackUrl = `${baseUrl}/api/brokerbridge/etrade/callback`;

    console.log('E*TRADE auth initiated:');
    console.log('- Callback URL:', callbackUrl);
    console.log('- Consumer Key:', consumerKey);
    console.log('- Sandbox mode:', sandbox);

    // Step 1: Get request token
    // For sandbox, this uses 'oob' (out of band) callback
    const { token, tokenSecret } = await oauth.getRequestToken(callbackUrl);

    console.log('- Request Token:', token);
    console.log('- Token Secret:', tokenSecret.substring(0, 10) + '...');

    // Store request token in session/cookie temporarily
    // For now, we'll pass it as state in the authorization URL
    const state = Buffer.from(JSON.stringify({ tokenSecret, orgId, requestToken: token })).toString('base64');

    // Step 2: Get authorization URL
    const authUrl = oauth.getAuthorizationUrl(token);

    console.log('- Authorization URL:', authUrl);

    // Return authorization URL and indicate if this is sandbox (requires manual verifier entry)
    return NextResponse.json({
      authorizationUrl: authUrl,
      requestToken: token,
      requiresManualVerifier: sandbox, // In sandbox, user must manually enter verifier code
      state, // Pass state for completing auth later
    });
  } catch (error) {
    console.error('E*TRADE auth error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
