// Import openid-client using dynamic import since it's an ES module
let client;
let Strategy;

async function loadOpenIdClient() {
  if (!client) {
    try {
      const openidClient = await import("openid-client");
      client = openidClient.default || openidClient;
      Strategy = openidClient.Strategy || openidClient.default.Strategy;
    } catch (error) {
      console.error('Failed to load openid-client:', error);
      // Fallback for development without auth
      client = { discovery: () => ({}), buildEndSessionUrl: () => ({ href: '/' }) };
      Strategy = class MockStrategy {};
    }
  }
  return { client, Strategy };
}
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
const memoize = require("memoizee");
const connectPg = require("connect-pg-simple");
const { storage } = require("./storage");

// Skip REPLIT_DOMAINS check for development
if (!process.env.REPLIT_DOMAINS && process.env.NODE_ENV === 'production') {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    const { client } = await loadOpenIdClient();
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID || 'fallback-client-id'
    );
  },
  { maxAge: 3600 * 1000 }
);

function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-dev',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(user, tokens) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

async function setupAuth(app) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  try {
    const { client, Strategy } = await loadOpenIdClient();
    
    // Only setup real auth if we have the required environment
    if (process.env.REPL_ID && process.env.REPLIT_DOMAINS && Strategy.name !== 'MockStrategy') {
      const config = await getOidcConfig();

      const verify = async (tokens, verified) => {
        const user = {};
        updateUserSession(user, tokens);
        await upsertUser(tokens.claims());
        verified(null, user);
      };

      const domains = process.env.REPLIT_DOMAINS.split(",");

      for (const domain of domains) {
        const strategy = new Strategy(
          {
            name: `replitauth:${domain}`,
            config,
            scope: "openid email profile offline_access",
            callbackURL: `https://${domain}/api/callback`,
          },
          verify,
        );
        passport.use(strategy);
      }

      app.get("/api/login", (req, res, next) => {
        passport.authenticate(`replitauth:${req.hostname}`, {
          prompt: "login consent",
          scope: ["openid", "email", "profile", "offline_access"],
        })(req, res, next);
      });

      app.get("/api/callback", (req, res, next) => {
        passport.authenticate(`replitauth:${req.hostname}`, {
          successReturnToOrRedirect: "/",
          failureRedirect: "/api/login",
        })(req, res, next);
      });

      app.get("/api/logout", (req, res) => {
        req.logout(() => {
          res.redirect(
            client.buildEndSessionUrl(config, {
              client_id: process.env.REPL_ID,
              post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
            }).href
          );
        });
      });
    } else {
      // Setup Google OAuth as fallback
      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        passport.use(new GoogleStrategy({
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback"
        }, async (accessToken, refreshToken, profile, done) => {
          try {
            const user = {
              id: profile.id,
              email: profile.emails[0].value,
              firstName: profile.name.givenName,
              lastName: profile.name.familyName,
              profileImageUrl: profile.photos[0].value
            };
            
            // Save to database
            await storage.upsertUser(user);
            return done(null, user);
          } catch (error) {
            return done(error, null);
          }
        }));

        app.get("/api/login", passport.authenticate("google", {
          scope: ["profile", "email"]
        }));

        app.get("/api/auth/google/callback", 
          passport.authenticate("google", { failureRedirect: "/" }),
          (req, res) => {
            res.redirect("/");
          }
        );

        app.get("/api/logout", (req, res) => {
          req.logout((err) => {
            if (err) console.error('Logout error:', err);
            res.redirect('/');
          });
        });
      } else {
        // Demo mode - simplified auth for development
        app.get("/api/login", (req, res) => {
          req.session.user = {
            id: 'demo-user',
            email: 'demo@example.com',
            firstName: 'Demo',
            lastName: 'User'
          };
          res.redirect('/');
        });

        app.get("/api/logout", (req, res) => {
          req.session.destroy(() => {
            res.redirect('/');
          });
        });
      }
    }

    passport.serializeUser((user, cb) => cb(null, user));
    passport.deserializeUser((user, cb) => cb(null, user));

  } catch (error) {
    console.error('Auth setup error:', error);
    // Fallback to demo mode
    app.get("/api/login", (req, res) => {
      req.session.user = {
        id: 'demo-user-' + Date.now(),
        email: 'demo@example.com',
        firstName: 'Demo',
        lastName: 'User'
      };
      res.redirect('/');
    });

    app.get("/api/logout", (req, res) => {
      req.session.destroy();
      res.redirect('/');
    });
  }
}

const isAuthenticated = async (req, res, next) => {
  const user = req.user;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const { client } = await loadOpenIdClient();
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

module.exports = { setupAuth, isAuthenticated };