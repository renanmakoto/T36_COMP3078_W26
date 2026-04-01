import { notFound } from 'next/navigation';
import { isLaneMatch, readPoster, readSigil } from '../components/keyframe';

export default async function LanePage({
  params,
}: {
  params: Promise<{ lane: string }>;
}) {
  const { lane } = await params;

  if (!isLaneMatch(lane)) {
    notFound();
  }

  return (
    <div className="fixed inset-0 z-[90] flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(96,76,149,0.3),_rgba(11,8,20,0.96)_52%)] px-6 py-10">
      <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-3 shadow-[0_30px_90px_rgba(0,0,0,0.48)] backdrop-blur">
          <div
            aria-label={readSigil()}
            role="img"
            className="h-[24rem] w-[min(78vw,24rem)] rounded-[1.4rem] bg-cover bg-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] sm:h-[28rem] sm:w-[24rem]"
            style={{ backgroundImage: `url(${readPoster()})` }}
          />
        </div>

        <p className="text-xl font-semibold tracking-[0.42em] text-white/92 sm:text-2xl">{readSigil()}</p>
      </div>
    </div>
  );
}
