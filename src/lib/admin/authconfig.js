export const authConfig = {
  providers: [],
  pages: {
    signIn: '/login'
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = auth?.user
      const isOnDashboard = request.nextUrl.pathname.startsWith('/admin')

      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false
      } else if (isLoggedIn) {
        return Response.redirect(
          new URL('/admin', 'https://portfolio-panel-lac.vercel.app')
        )
      } else if (request.nextUrl.pathname === '/') {
        return Response.redirect(
          new URL('/admin', 'https://portfolio-panel-lac.vercel.app')
        )
      }
      return true
    }
  }
}
