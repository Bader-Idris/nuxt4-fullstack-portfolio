import jwt, { type SignOptions } from "jsonwebtoken";
import { setCookie } from "h3";

const config = useRuntimeConfig();

// Define the structure of your payload
interface JWTCreateParams {
  payload: TokenPayload; // Adjust this based on your actual TokenPayload type
}

export const createJWT = ({ payload }: JWTCreateParams, signOptions?: SignOptions): string => {
  const token = jwt.sign(payload, config.jwtSecret, signOptions);
  return token;
};
export const isTokenValid = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
};

export const attachCookiesToResponse = (
  event: any,
  user: TokenUser,
  refreshToken: string
) => {
  const accessTokenJWT = createJWT(
    { payload: { user } },
    {
      expiresIn: config.jwtLifetime,
    }
  );

  const refreshTokenJWT = createJWT({ payload: { user, refreshToken } });
  const oneDay = 1000 * 60 * 60 * 24;
  const longerExp = 1000 * 60 * 60 * 24 * 30;

  setCookie(event, "accessToken", accessTokenJWT, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: config.nodeEnv === "production",
    expires: new Date(Date.now() + oneDay),
    // signed: true is not needed as cookies are signed by default in Nitro 2
    sameSite: "lax",// more flexable with 3rd party redirection than "strict"
  });

  setCookie(event, "refreshToken", refreshTokenJWT, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: config.nodeEnv === "production",
    expires: new Date(Date.now() + longerExp),
    sameSite: "lax",
  });
};
