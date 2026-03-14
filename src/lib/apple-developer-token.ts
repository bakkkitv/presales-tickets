// src/lib/apple-developer-token.ts
// Generates a signed JWT (Developer Token) for Apple Music API access.
// Used server-side only (API route + edge function).

import * as jose from 'jose';

interface AppleTokenConfig {
	teamId: string;
	keyId: string;
	privateKey: string; // PEM-encoded .p8 key contents
}

/**
 * Generate an Apple Music Developer Token (JWT).
 * Valid for up to 6 months, but we set 30 days to rotate regularly.
 */
export async function generateDeveloperToken(config: AppleTokenConfig): Promise<string> {
	const { teamId, keyId, privateKey } = config;

	// Import the PKCS#8 private key
	const key = await jose.importPKCS8(privateKey, 'ES256');

	const now = Math.floor(Date.now() / 1000);

	const token = await new jose.SignJWT({})
		.setProtectedHeader({
			alg: 'ES256',
			kid: keyId
		})
		.setIssuer(teamId)
		.setIssuedAt(now)
		.setExpirationTime(now + 30 * 24 * 60 * 60) // 30 days
		.sign(key);

	return token;
}
