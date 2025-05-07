import ImageTransformer from "@/components/image-transformer"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-2 text-slate-800 dark:text-slate-100">
          AI Image Transformer <span className="text-sm md:text-lg font-medium">(by @wolfaidev - please subscribe)</span>
        </h1>
        <p className="text-center mb-8 text-slate-600 dark:text-slate-300">
          Transform your images using AI-powered style transfer
        </p>

        <ImageTransformer />
      </div>
    </main>
  )
}
