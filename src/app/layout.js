import './globals.css'
import '@/lib/fontawesome'
import LayoutWrapper from '@/components/LayoutWrapper'

export const metadata = {
  title: 'Serkan Ursavaş',
  description: 'Frontend developer and web designer crafting responsive websites where technologies meet creativity'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  )
}
