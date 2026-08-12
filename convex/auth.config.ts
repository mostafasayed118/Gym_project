const authConfig = {
  providers: [
    {
      // Clerk instance the app actually uses (frontend publishable key in
      // Vercel/.env.local). Must be set on the Convex deployment:
      //   npx convex env set CLERK_JWT_ISSUER https://<instance>.clerk.accounts.dev
      domain: process.env.CLERK_JWT_ISSUER,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
