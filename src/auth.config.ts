import type { NextAuthConfig } from "next-auth";

export const publicPaths = ["/", "/login", "/register", "/privacy", "/terms"];

function matchesPublicPath(pathname: string): boolean {
  return publicPaths.some(
    (path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`))
  );
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.sessionVersion = user.sessionVersion;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = String(token.id);
        session.user.sessionVersion = Number(token.sessionVersion);
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user?.id;
      const { pathname } = request.nextUrl;

      // APIs enforce authorization close to the database and must be able to
      // return a JSON 401 response instead of an HTML redirect from the proxy.
      if (pathname.startsWith("/api/")) return true;

      const isPublic = matchesPublicPath(pathname);

      if (isPublic) {
        return true;
      }

      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
