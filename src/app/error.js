'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import PageTransition from '@/components/PageTransition'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <PageTransition>
        <div className="min-h-[60vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-8">
              <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Something went wrong
              </h1>
              
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
                An unexpected error occurred. This could be a temporary issue.
              </p>

              {process.env.NODE_ENV === 'development' && error.message && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8 max-w-lg mx-auto">
                  <p className="text-sm text-red-800 dark:text-red-200 font-mono">
                    {error.message}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
              
              <Link
                href="/"
                className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </div>

            <div className="mt-12">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                If the problem persists, please{' '}
                <a
                  href="/contact"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                >
                  contact me
                </a>
                .
              </p>
            </div>
          </div>
        </div>
    </PageTransition>
  )
}