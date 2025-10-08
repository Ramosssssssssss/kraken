"use client"

export default function PlaceholderSection({ title }: { title?: string }) {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="flex flex-col items-center gap-4">
        <img
          src="/4042.png"
          alt="Sección en construcción"
          className="w-[500px] h-auto opacity-80"
        />
        
      </div>
    </div>
  )
}
