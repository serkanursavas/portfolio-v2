// V1'den uyarlanan LoadingSpinner component'ı
export default function LoadingSpinner({ height = "h-[500px]", size = "w-10 h-10" }) {
  return (
    <div className={`${height} flex items-center justify-center`}>
      <div className={`${size} border-4 border-grey border-l-primary rounded-full animate-spin`}></div>
    </div>
  )
}