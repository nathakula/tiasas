/**
 * E*TRADE OAuth 1.0a Implementation
 * https://apisb.etrade.com/docs/api/authorization/request_token.html
 */

import crypto from 'crypto';

interface OAuthConfig {
  consumerKey: string;
  consumerSecret: string;
  sandbox?: boolean;
}

interface OAuthTokens {
  token: string;
  tokenSecret: string;
  verifier?: string;
}

export class ETradeOAuth {
  private consumerKey: string;
  private consumerSecret: string;
  private baseUrl: string;

  constructor(config: OAuthConfig) {
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.baseUrl = config.sandbox
      ? 'https://apisb.etrade.com'
      : 'https://api.etrade.com';
  }

  /**
   * Generate OAuth 1.0a signature
   */
  private generateSignature(
    method: string,
    url: string,
    params: Record<string, string>,
    tokenSecret?: string
  ): string {
    // Sort parameters
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    // Create signature base string
    const signatureBaseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(sortedParams),
    ].join('&');

    // Create signing key
    const signingKey = `${encodeURIComponent(this.consumerSecret)}&${tokenSecret ? encodeURIComponent(tokenSecret) : ''}`;

    // Generate HMAC-SHA1 signature
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(signatureBaseString)
      .digest('base64');

    return signature;
  }

  /**
   * Generate OAuth header
   */
  private generateOAuthHeader(
    method: string,
    url: string,
    params: Record<string, string>,
    tokenSecret?: string
  ): string {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.consumerKey,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0',
      ...params,
    };

    // Generate signature
    const signature = this.generateSignature(method, url, oauthParams, tokenSecret);
    oauthParams.oauth_signature = signature;

    // Build OAuth header
    const headerParts = Object.keys(oauthParams)
      .sort()
      .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
      .join(', ');

    return `OAuth ${headerParts}`;
  }

  /**
   * Step 1: Get request token
   * For sandbox, use 'oob' (out of band) as callback
   * For production, use actual callback URL
   */
  async getRequestToken(callbackUrl?: string): Promise<OAuthTokens> {
    const url = `${this.baseUrl}/oauth/request_token`;

    // Sandbox requires 'oob' (out of band) callback
    const callback = this.baseUrl.includes('apisb') ? 'oob' : (callbackUrl || 'oob');
    const urlWithCallback = `${url}?oauth_callback=${encodeURIComponent(callback)}`;

    const params = {
      oauth_callback: callback,
    };

    const authHeader = this.generateOAuthHeader('GET', url, params);

    console.log('Request Token URL:', urlWithCallback);
    console.log('Authorization Header:', authHeader);
    console.log('Using callback:', callback);

    const response = await fetch(urlWithCallback, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('E*TRADE request token error:', response.status, text);
      throw new Error(`Failed to get request token: ${response.status} ${text}`);
    }

    const body = await response.text();
    console.log('Request token response:', body);
    const parsed = new URLSearchParams(body);

    const token = parsed.get('oauth_token');
    const tokenSecret = parsed.get('oauth_token_secret');

    if (!token || !tokenSecret) {
      throw new Error('Invalid response from E*TRADE: missing token or secret');
    }

    return {
      token,
      tokenSecret,
    };
  }

  /**
   * Step 2: Get authorization URL
   */
  getAuthorizationUrl(requestToken: string): string {
    return `${this.baseUrl}/e/t/etws/authorize?key=${encodeURIComponent(this.consumerKey)}&token=${encodeURIComponent(requestToken)}`;
  }

  /**
   * Step 3: Exchange request token for access token
   */
  async getAccessToken(requestToken: string, requestTokenSecret: string, verifier: string): Promise<OAuthTokens> {
    const url = `${this.baseUrl}/oauth/access_token`;
    const params = {
      oauth_token: requestToken,
      oauth_verifier: verifier,
    };

    const authHeader = this.generateOAuthHeader('GET', url, params, requestTokenSecret);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to get access token: ${response.status} ${text}`);
    }

    const body = await response.text();
    const parsed = new URLSearchParams(body);

    const token = parsed.get('oauth_token');
    const tokenSecret = parsed.get('oauth_token_secret');

    if (!token || !tokenSecret) {
      throw new Error('Invalid response from E*TRADE: missing access token or secret');
    }

    return {
      token,
      tokenSecret,
    };
  }

  /**
   * Make authenticated API request
   */
  async makeAuthenticatedRequest(
    method: string,
    endpoint: string,
    accessToken: string,
    accessTokenSecret: string,
    queryParams?: Record<string, string>
  ): Promise<any> {
    let url = `${this.baseUrl}${endpoint}`;

    // Add query parameters to URL if present
    if (queryParams && Object.keys(queryParams).length > 0) {
      const query = new URLSearchParams(queryParams).toString();
      url += `?${query}`;
    }

    const params = {
      oauth_token: accessToken,
    };

    const authHeader = this.generateOAuthHeader(method, url, params, accessTokenSecret);

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API request failed: ${response.status} ${text}`);
    }

    return response.json();
  }
}
