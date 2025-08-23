/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#C778DD',
        grey: '#ABB2BF',
        background: '#282C33',
        // Admin Panel Colors
        bgPrimary: '#151c2c',
        bgSoft: '#182034',
        textSoft: '#b7bac1'
      }
    },
    screens: {
      lg: '1200px',
      md: '750px',
      sm: '640px'
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
  ]
}