function Input({ placeholder, name, editPage, type, value, onChange, required, ...props }) {
  return (
    <input
      className={`p-7 outline-none bg-bgPrimary text-white border-2 border-[#2e374a] rounded-md mb-7  ${
        editPage === true ? 'w-[100%]' : 'w-[45%]'
      }`}
      type={type || 'text'}
      placeholder={placeholder}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      {...props}
    />
  )
}

export default Input
