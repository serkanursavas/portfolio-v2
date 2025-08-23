
export async function generateMetadata() {
  return {
    title: 'Blog | Serkan Ursavaş',
    description: 'Thoughts on technology, development, and learning. Articles about Go, Redis, Next.js, Docker, and modern web development.',
    keywords: ['blog', 'technology', 'programming', 'Go', 'Redis', 'Next.js', 'Docker', 'web development'],
    authors: [{ name: 'Serkan Ursavaş' }],
    openGraph: {
      title: 'Blog | Serkan Ursavaş',
      description: 'Thoughts on technology, development, and learning',
      type: 'website',
      locale: 'en_US',
      siteName: 'Serkan Ursavaş Portfolio',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Blog | Serkan Ursavaş',
      description: 'Thoughts on technology, development, and learning',
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default function BlogLayout({ children }) {
  return children
}