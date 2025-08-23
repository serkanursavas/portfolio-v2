import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { authConfig } from './authconfig'

const login = async credentials => {
  try {
    // Simple hardcoded authentication for now
    // TODO: Replace with Go API call for user authentication
    if (credentials.username === 'admin' && credentials.password === 'password123') {
      return {
        username: 'admin',
        img: '/pp.jpg'
      }
    }
    throw new Error('Wrong credentials')
  } catch (error) {
    throw new Error('Failed to login')
  }
}

export const { signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        try {
          const user = await login(credentials)
          return user
        } catch (error) {
          console.log(error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username
        token.img = user.img
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.username = token.username
        session.user.img = token.img
      }
      return session
    }
  }
})
