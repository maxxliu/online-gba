import { PixelBackground } from '@/components/background/PixelBackground';

export default function Home() {
  return (
    <>
      <PixelBackground />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center">
        <h1 className="font-pixel text-2xl text-retro-blue">RetroPlay</h1>
        <p className="mt-4 text-sm text-retro-text-secondary">
          Online GBA Emulator
        </p>
      </div>
    </>
  );
}
