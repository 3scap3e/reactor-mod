export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 lg:px-6">
      <div>
        <h1 className="text-base font-semibold tracking-tight">
          FastH3 Studio
        </h1>
        <p className="text-xs text-zinc-500">
          Generate a video from a prompt and optional image.
        </p>
      </div>
    </header>
  );
}
