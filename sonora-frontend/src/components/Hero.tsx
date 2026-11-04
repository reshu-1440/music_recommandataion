import React from 'react';

export const Hero: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <section className={`mb-8 ${className}`}>
      <div className="inline-flex items-center gap-2 mb-3.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[11px] font-semibold tracking-widest uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
        Language-Steerable Discovery
      </div>

      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] mb-3">
        Music that gets <br className="hidden sm:inline" />
        <span className="text-zinc-400 font-normal italic">where you're at.</span>
      </h1>

      <p className="text-zinc-300 text-sm sm:text-base max-w-2xl leading-relaxed">
        Describe the moment, the mood, or the exact sound you want. Natural language turns into continuous semantic audio vectors with preference-tuned feedback.
      </p>
    </section>
  );
};

export default Hero;
