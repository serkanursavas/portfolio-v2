import React from 'react'

function ContentWrapper({ children }) {
  return <div className="mt-5 bg-bgSoft rounded-[10px] p-6 border border-primary/20 hover:border-primary/40 transition-all duration-300">{children}</div>
}

export default ContentWrapper
