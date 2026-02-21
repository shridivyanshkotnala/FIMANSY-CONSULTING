import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/userModel.js";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Google OAuth environment variables not configured");
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: false,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Validate email existence
        if (!profile.emails || profile.emails.length === 0) {
          return done(new Error("Google account has no email associated"), null);
        }

        const email = profile.emails[0].value.toLowerCase().trim();
        const googleId = profile.id;

        let user = await User.findOne({ email });

        if (user) {
          // Link Google account if not already linked
          if (!user.googleId) {
            user.googleId = googleId;
            user.authProvider = "google";
            user.emailVerified = true;

            await user.save({ validateBeforeSave: false });
          }
        } else {
          // Create new user
          user = await User.create({
            email,
            fullName: profile.displayName,
            googleId,
            authProvider: "google",
            emailVerified: true,
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);
//Newly added serialize and deserialize methods for passport session management. Even though we are using JWTs, these are required by passport.session() to function properly. We don't actually store user data in the session, but we need to implement these methods to satisfy passport's requirements.
// passport.session() requires serialize/deserialize even when JWTs are used.
// We don't actually store users in session — auth is handled via JWT cookies.
// passport.serializeUser((user, done) => done(null, user._id));
// passport.deserializeUser(async (id, done) => {
//   try {
//     const user = await User.findById(id).select("-password -refreshToken");
//     done(null, user);
//   } catch (err) {
//     done(err, null);
//   }


export default passport;
