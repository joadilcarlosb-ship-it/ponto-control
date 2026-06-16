"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [codigo, setCodigo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [aluno, setAluno] = useState<any>(null);
  const [horaTexto, setHoraTexto] = useState("--:--:--");
  const [dataTexto, setDataTexto] = useState("--/--/----");

  useEffect(() => {
    function atualizarRelogio() {
      const agora = new Date();

      setHoraTexto(
        agora.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );

      setDataTexto(
        agora.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      );
    }

    atualizarRelogio();

    const timer = setInterval(atualizarRelogio, 1000);

    return () => clearInterval(timer);
  }, []);

  function digitar(valor: string) {
    if (codigo.length < 6) {
      setCodigo(codigo + valor.toLowerCase());
      setMensagem("");
    }
  }

  function apagar() {
    setCodigo(codigo.slice(0, -1));
    setMensagem("");
  }

  async function buscarAluno() {
    setMensagem("");

    if (!codigo.trim()) {
      setMensagem("Digite seu código.");
      return;
    }

    const { data, error } = await supabase
      .from("alunos")
      .select("*")
      .eq("codigo", codigo.toLowerCase())
      .eq("ativo", true)
      .single();

    if (error || !data) {
      setMensagem("Código não encontrado.");
      return;
    }

    setAluno(data);
  }

  async function confirmarPonto() {
    if (!aluno) return;

    const hoje = new Date().toISOString().split("T")[0];

    const { data: ultimoPonto } = await supabase
      .from("pontos")
      .select("tipo, hora")
      .eq("aluno_id", aluno.id)
      .gte("hora", `${hoje}T00:00:00`)
      .lte("hora", `${hoje}T23:59:59`)
      .order("hora", { ascending: false })
      .limit(1)
      .maybeSingle();

    const tipo = ultimoPonto?.tipo === "entrada" ? "saida" : "entrada";

    const { error } = await supabase.from("pontos").insert({
      aluno_id: aluno.id,
      tipo,
    });

    if (error) {
      setMensagem("Erro ao registrar ponto.");
      return;
    }

    const horaRegistro = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setMensagem(
      `${tipo === "entrada" ? "Entrada" : "Saída"} registrada com sucesso às ${horaRegistro}!`
    );

    setCodigo("");
    setAluno(null);
  }

  function cancelarAluno() {
    setAluno(null);
    setMensagem("");
  }

  const letras = ["j", "s", "c"];
  const numeros = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
      <a
        href="/admin"
        title="Login de admin"
        className="fixed top-4 right-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full w-11 h-11 flex items-center justify-center text-2xl font-bold shadow-lg z-50"
      >
        ⋯
      </a>

      <div className="w-full max-w-sm bg-zinc-900 rounded-3xl p-6 shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-2">Ponto Control</h1>

        <div className="bg-zinc-800 rounded-2xl p-4 text-center mb-5">
          <p className="text-4xl font-bold">{horaTexto}</p>
          <p className="text-zinc-400 text-sm mt-1">{dataTexto}</p>
        </div>

        {!aluno && (
          <>
            <p className="text-zinc-400 text-center mb-5">
              Digite seu código para bater ponto
            </p>

            <div className="bg-zinc-800 rounded-2xl p-4 text-center text-3xl tracking-widest mb-5 uppercase">
              {codigo || "------"}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4 place-items-center">
              {letras.map((tecla) => (
                <button
                  key={tecla}
                  onClick={() => digitar(tecla)}
                  className="w-20 h-20 rounded-full bg-zinc-700 hover:bg-zinc-600 text-2xl font-bold uppercase shadow"
                >
                  {tecla}
                </button>
              ))}

              {numeros.map((tecla) => (
                <button
                  key={tecla}
                  onClick={() => digitar(tecla)}
                  className="w-20 h-20 rounded-full bg-zinc-800 hover:bg-zinc-700 text-2xl font-bold shadow"
                >
                  {tecla}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={apagar}
                className="bg-red-600 hover:bg-red-700 rounded-xl py-4 text-lg font-bold"
              >
                Apagar
              </button>

              <button
                onClick={buscarAluno}
                className="bg-green-600 hover:bg-green-700 rounded-xl py-4 text-lg font-bold"
              >
                OK
              </button>
            </div>
          </>
        )}

        {aluno && (
          <div className="text-center bg-zinc-800 rounded-2xl p-4">
            <p className="text-zinc-400 text-sm mb-1">Esse é você?</p>

            <h2 className="text-xl font-bold mb-4">{aluno.nome}</h2>

            <button
              onClick={confirmarPonto}
              className="w-full bg-green-600 hover:bg-green-700 rounded-xl py-3 font-bold"
            >
              Sim, sou eu
            </button>

            <button
              onClick={cancelarAluno}
              className="w-full bg-red-600 hover:bg-red-700 rounded-xl py-3 font-bold mt-2"
            >
              Não sou eu
            </button>
          </div>
        )}

        {mensagem && (
          <p className="text-center text-sm bg-zinc-800 rounded-xl p-3 mt-4">
            {mensagem}
          </p>
        )}
      </div>
    </main>
  );
}