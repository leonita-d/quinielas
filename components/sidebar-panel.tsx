"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface SidebarPanelProps {
  fecha: string;
}

// Componente del reloj digital
function DigitalClock() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    // Establecer hora inicial
    const updateTime = () => {
      const now = new Date(
        new Date().toLocaleString("en-US", {
          timeZone: "America/Argentina/Buenos_Aires",
        })
      );
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setTime(`${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-blue-950 border-4 border-blue-900 rounded-xl px-4 md:px-6 py-2 md:py-3 shadow-2xl">
      <div className="text-blue-100 font-black text-3xl md:text-4xl drop-shadow-lg font-mono tracking-wider">
        {time || "00:00:00"}
      </div>
    </div>
  );
}

export function SidebarPanel({ fecha }: SidebarPanelProps) {
  // Variables editables para el panel
  const [numerazo, setNumerazo] = useState("");
  const [laFija, setLaFija] = useState("");
  const [elEspecial, setElEspecial] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Cargar valores del localStorage al montar el componente
  useEffect(() => {
    const numerazoGuardado = localStorage.getItem("numerazo") || "";
    const laFijaGuardada = localStorage.getItem("laFija") || "";
    const elEspecialGuardado = localStorage.getItem("elEspecial") || "";

    setNumerazo(numerazoGuardado);
    setLaFija(laFijaGuardada);
    setElEspecial(elEspecialGuardado);
  }, []);

  // Guardar numerazo en localStorage
  const handleNumerazoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setNumerazo(valor);
    localStorage.setItem("numerazo", valor);
  };

  // Guardar la fija en localStorage
  const handleLaFijaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setLaFija(valor);
    localStorage.setItem("laFija", valor);
  };

  // Guardar el especial en localStorage
  const handleElEspecialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setElEspecial(valor);
    localStorage.setItem("elEspecial", valor);
  };

  return (
    <div className="relative h-full rounded-2xl overflow-hidden flex flex-col items-center justify-start pt-4 px-4 shadow-2xl border-4 border-emerald-300 bg-linear-to-b from-emerald-50 via-green-100 to-emerald-200">
      {/* Imagen de fondo del grillo */}
      <div className="absolute inset-0 opacity-60 rounded-2xl overflow-hidden">
        <Image
          src="/grillo.png"
          alt="Grillo de la suerte"
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="relative z-10 text-center w-full">
        <div className="flex flex-col items-center gap-1 mb-4">
          <h2 className="text-xl md:text-2xl font-black text-emerald-900 drop-shadow">
            Cabezas del día
          </h2>
          <DigitalClock />
        </div>

        <div className="space-y-4">
          <div>
            <p
              style={{
                textShadow:
                  "0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.5), 0 0 30px rgba(255,255,255,0.3)",
              }}
              className="text-emerald-900 font-black text-3xl md:text-4xl mb-1 tracking-wider drop-shadow"
            >
              EL NUMERAZO
            </p>
            <input
              type="text"
              value={numerazo}
              onChange={handleNumerazoChange}
              onFocus={() => setFocusedInput("numerazo")}
              onBlur={() => setFocusedInput(null)}
              placeholder="-"
              style={{
                textShadow:
                  "0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.5), 0 0 30px rgba(255,255,255,0.3)",
                caretColor:
                  focusedInput === "numerazo" ? "auto" : "transparent",
              }}
              className="text-5xl md:text-6xl font-black text-blue-950 drop-shadow-2xl bg-transparent border-none text-center w-full outline-none px-2 py-1"
            />
          </div>

          <div>
            <p
              style={{
                textShadow:
                  "0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.5), 0 0 30px rgba(255,255,255,0.3)",
              }}
              className="text-emerald-900 font-black text-3xl md:text-4xl mb-1 tracking-wider drop-shadow"
            >
              LA FIJA
            </p>
            <input
              type="text"
              value={laFija}
              onChange={handleLaFijaChange}
              onFocus={() => setFocusedInput("laFija")}
              onBlur={() => setFocusedInput(null)}
              placeholder="-"
              style={{
                textShadow:
                  "0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.5), 0 0 30px rgba(255,255,255,0.3)",
                caretColor: focusedInput === "laFija" ? "auto" : "transparent",
              }}
              className="text-4xl md:text-5xl font-black text-blue-950 drop-shadow-2xl bg-transparent border-none text-center w-full outline-none px-2 py-1"
            />
          </div>

          <div>
            <p
              style={{
                textShadow:
                  "0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.5), 0 0 30px rgba(255,255,255,0.3)",
              }}
              className="text-emerald-900 font-black text-3xl md:text-4xl mb-1 tracking-wider drop-shadow"
            >
              EL ESPECIAL
            </p>
            <input
              type="text"
              value={elEspecial}
              onChange={handleElEspecialChange}
              onFocus={() => setFocusedInput("elEspecial")}
              onBlur={() => setFocusedInput(null)}
              placeholder="-"
              style={{
                textShadow:
                  "0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.5), 0 0 30px rgba(255,255,255,0.3)",
                caretColor:
                  focusedInput === "elEspecial" ? "auto" : "transparent",
              }}
              className="text-4xl md:text-5xl font-black text-blue-950 drop-shadow-2xl bg-transparent border-none text-center w-full outline-none px-2 py-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
