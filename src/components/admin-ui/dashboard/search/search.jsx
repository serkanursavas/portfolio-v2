'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MdSearch } from 'react-icons/md'
import { useDebouncedCallback } from 'use-debounce'

function Search({ placeholder }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  const handleSearch = useDebouncedCallback(e => {
    const params = new URLSearchParams(searchParams)

    params.set('page', 1)

    if (e.target.value) {
      e.target.value.length > 2 && params.set('q', e.target.value)
    } else {
      params.delete('q')
    }

    replace(`${pathname}?${params}`)
  }, 300)

  return (
    <div className="flex items-center space-x-2 bg-[#2e374a] rounded-[10px] p-2 w-max">
      <MdSearch />
      <input
        type="text"
        className="text-white bg-transparent border-none outline-none"
        onChange={handleSearch}
        placeholder={placeholder}
      />
    </div>
  )
}

export default Search
