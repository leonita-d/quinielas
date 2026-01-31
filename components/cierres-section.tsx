export function CierresSection() {
  return (
    <div className="bg-linear-to-r from-slate-700 to-slate-800 p-4 border-t-2 border-emerald-500/30">
      <h3 className="font-black text-white mb-3 text-xl flex items-center gap-2">
        <span className="text-emerald-400 text-2xl">⏰</span> Cierres:
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-600/50 backdrop-blur p-3 rounded-lg border-l-4 border-red-500">
          <p className="text-red-400 font-black text-lg mb-1">QUINI 6</p>
          <p className="text-slate-300 text-sm">
            Miércoles 19 hs • Sábados 20 hs
          </p>
        </div>
        <div className="bg-slate-600/50 backdrop-blur p-3 rounded-lg border-l-4 border-orange-500">
          <p className="text-orange-400 font-black text-lg mb-1">LOTO PLUS</p>
          <p className="text-slate-300 text-sm">
            Miércoles 20:45 hs • Sábados 20:45 hs
          </p>
        </div>
        <div className="bg-slate-600/50 backdrop-blur p-3 rounded-lg border-l-4 border-yellow-500">
          <p className="text-yellow-400 font-black text-lg mb-1">TELEKINO</p>
          <p className="text-slate-300 text-sm">Sábados 20 hs</p>
        </div>
      </div>
    </div>
  );
}
