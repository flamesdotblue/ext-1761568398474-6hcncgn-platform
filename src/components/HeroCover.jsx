import Spline from '@splinetool/react-spline';

export default function HeroCover() {
  return (
    <section className="relative w-full" style={{ height: '300px' }}>
      <div className="absolute inset-0">
        <Spline scene="https://prod.spline.design/zhZFnwyOYLgqlLWk/scene.splinecode" style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/40 to-white pointer-events-none" />
      <div className="relative z-10 h-full max-w-6xl mx-auto flex flex-col justify-end px-6 pb-6">
        <h1 className="text-3xl md:text-4xl font-semibold text-gray-900">Collaborative Notes</h1>
        <p className="mt-2 text-gray-600 max-w-2xl">
          A clean, minimal editor with real-time collaboration, presence, and simple document organization.
        </p>
      </div>
    </section>
  );
}
