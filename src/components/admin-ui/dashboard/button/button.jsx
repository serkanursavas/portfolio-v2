import React from 'react'

function Button({ bgColor, children, onClick, type, disabled, ...props }) {
  return (
    <button 
      className={`p-2 ${bgColor} border-none rounded-md cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
