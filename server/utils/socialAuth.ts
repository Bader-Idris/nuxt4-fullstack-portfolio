import { User } from '../models/mongo';

interface SocialProfile {
  name: string;
  email: string;
  id: string;
  avatar?: string;
}

export const validateGoogleToken = async (accessToken: string, idToken?: string): Promise<SocialProfile> => {
  console.log('Validating Google token...');
  let googleUser: any = null;

  if (idToken) {
    const idTokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (idTokenRes.status === 200) {
      googleUser = await idTokenRes.json();
    }
  }

  if (!googleUser && accessToken) {
    const accessTokenRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`);
    if (accessTokenRes.status === 200) {
      googleUser = await accessTokenRes.json();
    }
  }

  if (!googleUser || !googleUser.email) {
    throw new Error('Google could not verify identity');
  }

  return {
    name: googleUser.name || googleUser.displayName || googleUser.email.split('@')[0],
    email: googleUser.email,
    id: googleUser.sub || googleUser.id,
    avatar: googleUser.picture,
  };
};

export const validateFacebookToken = async (accessToken: string): Promise<SocialProfile> => {
  console.log('Validating Facebook token...');
  const fbRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`);
  
  if (!fbRes.ok) {
    throw new Error('Facebook could not verify identity');
  }

  const fbUser = await fbRes.json();
  if (!fbUser || !fbUser.email) {
    throw new Error('Facebook could not verify identity (missing email)');
  }

  return {
    name: fbUser.name,
    email: fbUser.email,
    id: fbUser.id,
    avatar: fbUser.picture?.data?.url,
  };
};

export const findOrCreateSocialUser = async (profile: SocialProfile, provider: string) => {
  let user = await User.findOne({ email: profile.email });

  if (!user) {
    console.log(`Creating new ${provider} user:`, profile.email);
    user = await User.create({
      name: profile.name,
      email: profile.email,
      isVerified: true,
      provider,
      providerAccountId: profile.id,
      avatar: profile.avatar,
    });
  } else {
    console.log(`Updating existing user for ${provider}:`, profile.email);
    user.provider = provider;
    user.providerAccountId = profile.id;
    user.name = profile.name || user.name;
    user.avatar = profile.avatar || user.avatar;
    user.isVerified = true;
    // Clear password if they are switching to social login
    user.password = undefined; 
    await user.save();
  }

  return user;
};
