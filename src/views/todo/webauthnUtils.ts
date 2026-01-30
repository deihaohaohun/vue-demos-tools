/**
 * WebAuthn Utilities for Client-Side "Device Lock" Authentication
 * Note: This implements a client-side only check relying on the device's
 * platform authenticator (TouchID/FaceID). It does NOT verify the signature
 * on a server, so it is equivalent to a "local lock" rather than strict authentication.
 */

// Helper: Convert ArrayBuffer to Base64URL string
export function bufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let string = ''
  for (const b of bytes) {
    string += String.fromCharCode(b)
  }
  return btoa(string).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Helper: Convert Base64URL string to Uint8Array
export function base64URLToBuffer(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const binStr = atob(base64)
  const len = binStr.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binStr.charCodeAt(i)
  }
  return bytes
}

// Check if Platform Authenticator is available
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (
    !window.PublicKeyCredential ||
    !window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
  ) {
    return false
  }
  return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
}

// Register a new credential
export async function registerCredential(username: string): Promise<string | null> {
  if (!window.PublicKeyCredential) return null

  const userId = new Uint8Array(16)
  window.crypto.getRandomValues(userId)

  const challenge = new Uint8Array(32)
  window.crypto.getRandomValues(challenge)

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: 'Todo App Local Lock',
      // id: window.location.hostname, // Omit to allow localhost/any origin default
    },
    user: {
      id: userId,
      name: username,
      displayName: username,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' }, // ES256
      { alg: -257, type: 'public-key' }, // RS256
    ],
    timeout: 60000,
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Force TouchID/FaceID
      userVerification: 'preferred',
      requireResidentKey: false,
    },
    attestation: 'none',
  }

  try {
    const credential = (await navigator.credentials.create({
      publicKey,
    })) as PublicKeyCredential
    return bufferToBase64URL(credential.rawId)
  } catch (err) {
    console.error('WebAuthn registration failed:', err)
    return null
  }
}

// Verify a credential (Client-Side Assertion)
export async function verifyCredential(credentialIdBase64: string): Promise<boolean> {
  if (!window.PublicKeyCredential) return false

  console.log('Starting WebAuthn verification...', credentialIdBase64)

  const challenge = new Uint8Array(32)
  window.crypto.getRandomValues(challenge)

  // Try without transports first to be more inclusive
  const allowCredentials: PublicKeyCredentialDescriptor[] = [
    {
      type: 'public-key',
      id: base64URLToBuffer(credentialIdBase64) as unknown as BufferSource,
      // transports: ['internal'], // Removed strict transport check to compatibility
    },
  ]

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge,
    timeout: 60000,
    allowCredentials,
    userVerification: 'preferred',
    // rpId: window.location.hostname, // Removed to match registration default behavior
  }

  try {
    const assertion = await navigator.credentials.get({ publicKey })
    console.log('WebAuthn assertion received', assertion)
    return !!assertion
  } catch (err) {
    console.error('WebAuthn verification failed/cancelled:', err)
    return false
  }
}
