"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

// Funcion para obtener la hora de Argentina
function getArgentinaTimeParts(): {
  hours: string;
  minutes: string;
  seconds: string;
} {
  const now = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
    })
  );
  return {
    hours: String(now.getHours()).padStart(2, "0"),
    minutes: String(now.getMinutes()).padStart(2, "0"),
    seconds: String(now.getSeconds()).padStart(2, "0"),
  };
}

// Componente del reloj digital
function DigitalClock() {
  const initial = getArgentinaTimeParts();
  const hoursRef = useRef<HTMLSpanElement>(null);
  const minutesRef = useRef<HTMLSpanElement>(null);
  const secondsRef = useRef<HTMLSpanElement>(null);
  const lastTimeRef = useRef(initial);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const next = getArgentinaTimeParts();
      const prev = lastTimeRef.current;

      // Actualizar solo el nodo que cambia minimiza repaints en TVs.
      if (next.hours !== prev.hours && hoursRef.current) {
        hoursRef.current.textContent = next.hours;
      }
      if (next.minutes !== prev.minutes && minutesRef.current) {
        minutesRef.current.textContent = next.minutes;
      }
      if (next.seconds !== prev.seconds && secondsRef.current) {
        secondsRef.current.textContent = next.seconds;
      }
      lastTimeRef.current = next;

      // Reprogramar cerca del siguiente segundo reduce jitter en navegadores lentos.
      const msToNextSecond = 1000 - (Date.now() % 1000);
      timeoutId = setTimeout(tick, msToNextSecond + 10);
    };

    tick();

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="bg-blue-950 border border-blue-800 rounded-lg px-4 md:px-6 py-2 md:py-3">
      {/* Contenedor con dimensiones fijas para evitar reflow */}
      <div
        className="text-blue-100 font-black text-3xl md:text-4xl font-mono tracking-wider tabular-nums leading-none"
        style={{
          minWidth: "8ch",
          textAlign: "center",
          textShadow: "none",
          contain: "paint",
        }}
      >
        <span ref={hoursRef}>{initial.hours}</span>:
        <span ref={minutesRef}>{initial.minutes}</span>:
        <span ref={secondsRef}>{initial.seconds}</span>
      </div>
    </div>
  );
}

export function SidebarPanel() {
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
      <div className="absolute inset-0 bg-linear-to-b from-emerald-900/28 via-emerald-900/22 to-emerald-950/30 rounded-2xl" />

      <div className="relative z-10 text-center w-full">
        <div className="flex flex-col items-center gap-1 mb-4">
          <h2
            className="text-xl md:text-2xl font-black text-emerald-50"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
          >
            Cabezas del día
          </h2>
          <DigitalClock />
        </div>

        <div className="space-y-4">
          <div>
            <p
              className="text-emerald-50 font-black text-3xl md:text-4xl mb-1 tracking-wider"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
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
                caretColor:
                  focusedInput === "numerazo" ? "auto" : "transparent",
                textShadow: "0 1px 2px rgba(0,0,0,0.35)",
              }}
              className="text-5xl md:text-6xl font-black text-blue-950 bg-transparent border-none text-center w-full outline-none px-2 py-1"
            />
          </div>

          <div>
            <p
              className="text-emerald-50 font-black text-3xl md:text-4xl mb-1 tracking-wider"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
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
                caretColor: focusedInput === "laFija" ? "auto" : "transparent",
                textShadow: "0 1px 2px rgba(0,0,0,0.35)",
              }}
              className="text-4xl md:text-5xl font-black text-blue-950 bg-transparent border-none text-center w-full outline-none px-2 py-1"
            />
          </div>

          <div>
            <p
              className="text-emerald-50 font-black text-3xl md:text-4xl mb-1 tracking-wider"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
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
                caretColor:
                  focusedInput === "elEspecial" ? "auto" : "transparent",
                textShadow: "0 1px 2px rgba(0,0,0,0.35)",
              }}
              className="text-4xl md:text-5xl font-black text-blue-950 bg-transparent border-none text-center w-full outline-none px-2 py-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
