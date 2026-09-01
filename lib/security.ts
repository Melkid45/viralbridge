import {
    createHmac,
    randomBytes,
    scrypt,
    timingSafeEqual,
} from 'node:crypto';

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;

function getSessionSecret() {
    const secret = process.env.SESSION_SECRET?.trim();
    if (!secret || secret.length < 32) {
        throw new Error('SESSION_SECRET must contain at least 32 characters');
    }
    return secret;
}

export function createOpaqueToken() {
    return randomBytes(32).toString('base64url');
}

export function hashSecretToken(
    token: string,
    purpose: 'activation' | 'session' | 'onboarding',
) {
    return createHmac('sha256', getSessionSecret())
        .update(`${purpose}:${token}`)
        .digest('hex');
}

function derivePasswordKey(
    password: string,
    salt: Buffer,
    parameters = { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P },
) {
    return new Promise<Buffer>((resolve, reject) => {
        scrypt(
            password,
            salt,
            SCRYPT_KEY_LENGTH,
            { ...parameters, maxmem: 64 * 1024 * 1024 },
            (error, derivedKey) => {
                if (error) reject(error);
                else resolve(derivedKey);
            },
        );
    });
}

export async function hashPassword(password: string) {
    const salt = randomBytes(16);
    const derivedKey = await derivePasswordKey(password, salt);

    return [
        'scrypt',
        SCRYPT_N,
        SCRYPT_R,
        SCRYPT_P,
        salt.toString('base64url'),
        derivedKey.toString('base64url'),
    ].join(':');
}

export async function verifyPassword(password: string, encodedHash: string) {
    const [algorithm, n, r, p, saltValue, hashValue] = encodedHash.split(':');
    if (
        algorithm !== 'scrypt' ||
        !n ||
        !r ||
        !p ||
        !saltValue ||
        !hashValue
    ) {
        return false;
    }

    const expected = Buffer.from(hashValue, 'base64url');
    const actual = await derivePasswordKey(
        password,
        Buffer.from(saltValue, 'base64url'),
        { N: Number(n), r: Number(r), p: Number(p) },
    );

    return expected.length === actual.length && timingSafeEqual(expected, actual);
}
