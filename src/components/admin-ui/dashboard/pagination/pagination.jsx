'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MdNavigateNext, MdNavigateBefore } from 'react-icons/md'

function Pagination({ count }) {
  const searchParams = useSearchParams()
  const { replace } = useRouter()
  const pathname = usePathname()

  const page = searchParams.get('page') || 1

  const params = new URLSearchParams(searchParams)
  const ITEM_PER_PAGE = 5

  const hasPrev = ITEM_PER_PAGE * (parseInt(page) - 1) > 0
  const hasNext = ITEM_PER_PAGE * (parseInt(page) - 1) + ITEM_PER_PAGE < count

  function handleChangePage(type) {
    type === 'prev'
      ? params.set('page', parseInt(page) - 1)
      : params.set('page', parseInt(page) + 1)
    replace(`${pathname}?${params}`)
  }

  if (!hasNext && !hasPrev) {
    return
  }

  return (
    <div className="flex justify-between pt-5 pb-2 mt-3 border-t border-gray-700">
      <button
        className="flex items-center justify-center px-2 py-1 text-black rounded-md cursor-pointer bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
        disabled={!hasPrev}
        onClick={() => handleChangePage('prev')}
      >
        <MdNavigateBefore size={24} />
        Prev
      </button>
      <button
        className="flex items-center justify-center px-2 py-1 text-black rounded-md cursor-pointer bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
        disabled={!hasNext}
        onClick={() => handleChangePage('next')}
      >
        Next
        <MdNavigateNext size={24} />
      </button>
    </div>
  )
}

export default Pagination
