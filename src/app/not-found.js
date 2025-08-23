import Link from 'next/link'
import PageTransition from '@/components/PageTransition'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <PageTransition>
        <div className="min-h-[60vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-8">
              <h1 className="text-9xl font-bold text-gray-200 dark:text-gray-700 mb-4">
                404
              </h1>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Page Not Found
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Link>
              
              <Link
                href="/"
                className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Link>
            </div>

            <div className="mt-12">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Popular pages:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Link
                  href="/about"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm underline"
                >
                  About
                </Link>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <Link
                  href="/works"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm underline"
                >
                  Works
                </Link>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <Link
                  href="/blog"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm underline"
                >
                  Blog
                </Link>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <Link
                  href="/contact"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm underline"
                >
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </div>
    </PageTransition>
  )
}