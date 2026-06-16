"use client";

import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase";

type Aluno = {
  id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
};

type Ponto = {
  id: string;
  tipo: string;
  hora: string;
  created_at: string;
  criado_por_admin?: boolean;
  alunos: {
    id: string;
    nome: string;
    codigo: string;
  } | null;
};

export default function AdminPage() {
  const [logado, setLogado] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");

  const [novoUsuario, setNovoUsuario] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [historico, setHistorico] = useState<Ponto[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);

  const [alunoSelecionado, setAlunoSelecionado] = useState("");
  const [alunoHistorico, setAlunoHistorico] = useState<Aluno | null>(null);

  const [alunoEditando, setAlunoEditando] = useState<Aluno | null>(null);
  const [nomeEditando, setNomeEditando] = useState("");
  const [codigoEditando, setCodigoEditando] = useState("");

  const [horaEntrada, setHoraEntrada] = useState("");
  const [horaSaida, setHoraSaida] = useState("");
  const [nomeNovoAluno, setNomeNovoAluno] = useState("");
  const [codigoGerado, setCodigoGerado] = useState("");

  const [menuAberto, setMenuAberto] = useState(false);
  const [tela, setTela] = useState<
    | "hoje"
    | "manual"
    | "cadastro"
    | "alunos"
    | "historico"
    | "configuracoes"
  >("hoje");

  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<
    "sucesso" | "erro" | "aviso"
  >("sucesso");

  useEffect(() => {
    const adminLogado = localStorage.getItem("adminLogado");

    if (adminLogado === "true") {
      setLogado(true);
      carregarDados();
    } else {
      setCarregando(false);
    }
  }, []);

  function sucesso(texto: string) {
    setTipoMensagem("sucesso");
    setMensagem(texto);
    setTimeout(() => setMensagem(""), 4000);
  }

  function erro(texto: string) {
    setTipoMensagem("erro");
    setMensagem(texto);
    setTimeout(() => setMensagem(""), 5000);
  }

  function aviso(texto: string) {
    setTipoMensagem("aviso");
    setMensagem(texto);
    setTimeout(() => setMensagem(""), 4500);
  }

  async function entrarAdmin() {
    if (!usuario.trim() || !senha.trim()) {
      aviso("Digite usuário e senha.");
      return;
    }

    const { data, error } = await supabase
      .from("admins")
      .select("*")
      .eq("usuario", usuario.trim())
      .eq("senha", senha.trim())
      .single();

    if (error || !data) {
      erro("Usuário ou senha incorretos.");
      return;
    }

    localStorage.setItem("adminLogado", "true");
    setLogado(true);
    sucesso("Login realizado com sucesso!");
    carregarDados();
  }

  function sairAdmin() {
    localStorage.removeItem("adminLogado");
    setLogado(false);
    setUsuario("");
    setSenha("");
    setMensagem("");
  }

  async function carregarDados() {
    setCarregando(true);

    const hoje = new Date().toISOString().split("T")[0];

    const { data: alunosData } = await supabase
      .from("alunos")
      .select("*")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    const { data: pontosData, error } = await supabase
      .from("pontos")
      .select(`
        id,
        tipo,
        hora,
        created_at,
        criado_por_admin,
        alunos (
          id,
          nome,
          codigo
        )
      `)
      .gte("hora", `${hoje}T00:00:00`)
      .lte("hora", `${hoje}T23:59:59`)
      .order("created_at", { ascending: false });

    if (error) {
      erro("Erro ao carregar registros.");
      setCarregando(false);
      return;
    }

    setAlunos((alunosData as Aluno[]) || []);
    setPontos((pontosData as unknown as Ponto[]) || []);
    setCarregando(false);
  }

  function gerarCodigo() {
    const caracteres = "123456789jsc";
    let codigo = "";

    for (let i = 0; i < 6; i++) {
      codigo += caracteres[Math.floor(Math.random() * caracteres.length)];
    }

    return codigo;
  }

  async function criarAluno() {
    if (!nomeNovoAluno.trim()) {
      aviso("Digite o nome do aluno.");
      return;
    }

    const codigo = gerarCodigo();

    const { error } = await supabase.from("alunos").insert({
      nome: nomeNovoAluno.trim(),
      codigo,
      ativo: true,
    });

    if (error) {
      erro("Erro ao criar aluno. O código pode já estar em uso.");
      return;
    }

    setCodigoGerado(codigo);
    sucesso("Aluno criado com sucesso!");
    setNomeNovoAluno("");
    carregarDados();
  }

  function abrirEdicaoAluno(aluno: Aluno) {
    setAlunoEditando(aluno);
    setNomeEditando(aluno.nome);
    setCodigoEditando(aluno.codigo);
    setMensagem("");
  }

  function cancelarEdicaoAluno() {
    setAlunoEditando(null);
    setNomeEditando("");
    setCodigoEditando("");
  }

  async function salvarEdicaoAluno() {
    if (!alunoEditando) return;

    if (!nomeEditando.trim() || !codigoEditando.trim()) {
      aviso("Nome e código não podem ficar vazios.");
      return;
    }

    const { error } = await supabase
      .from("alunos")
      .update({
        nome: nomeEditando.trim(),
        codigo: codigoEditando.trim().toLowerCase(),
      })
      .eq("id", alunoEditando.id);

    if (error) {
      erro("Erro ao editar aluno. Código pode já estar em uso.");
      return;
    }

    sucesso("Aluno editado com sucesso!");
    cancelarEdicaoAluno();
    carregarDados();
  }

  async function registrarManual() {
    if (!alunoSelecionado) {
      aviso("Escolha um aluno.");
      return;
    }

    if (!horaEntrada && !horaSaida) {
      aviso("Coloque pelo menos o horário de entrada ou saída.");
      return;
    }

    const hoje = new Date().toISOString().split("T")[0];
    const registros = [];

    if (horaEntrada) {
      registros.push({
        aluno_id: alunoSelecionado,
        tipo: "entrada",
        hora: `${hoje}T${horaEntrada}:00`,
        criado_por_admin: true,
      });
    }

    if (horaSaida) {
      registros.push({
        aluno_id: alunoSelecionado,
        tipo: "saida",
        hora: `${hoje}T${horaSaida}:00`,
        criado_por_admin: true,
      });
    }

    const { error } = await supabase.from("pontos").insert(registros);

    if (error) {
      erro("Erro ao registrar ponto manual.");
      return;
    }

    sucesso("Ponto manual registrado com sucesso!");
    setAlunoSelecionado("");
    setHoraEntrada("");
    setHoraSaida("");
    carregarDados();
  }

  async function abrirHistorico(aluno: Aluno) {
    setMensagem("");
    setCarregando(true);
    setAlunoHistorico(aluno);
    setTela("historico");

    const { data, error } = await supabase
      .from("pontos")
      .select(`
        id,
        tipo,
        hora,
        created_at,
        criado_por_admin,
        alunos (
          id,
          nome,
          codigo
        )
      `)
      .eq("aluno_id", aluno.id)
      .order("hora", { ascending: true });

    if (error) {
      erro("Erro ao carregar histórico.");
      setHistorico([]);
      setCarregando(false);
      return;
    }

    setHistorico((data as unknown as Ponto[]) || []);
    setCarregando(false);
  }

  async function apagarPonto(id: string) {
    const confirmar = confirm("Tem certeza que deseja apagar esse ponto?");
    if (!confirmar) return;

    const { error } = await supabase.from("pontos").delete().eq("id", id);

    if (error) {
      erro("Erro ao apagar ponto.");
      return;
    }

    sucesso("Ponto apagado com sucesso.");
    carregarDados();

    if (alunoHistorico) abrirHistorico(alunoHistorico);
  }

  async function desativarAluno(id: string) {
    const confirmar = confirm("Deseja desativar esse aluno?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("alunos")
      .update({ ativo: false })
      .eq("id", id);

    if (error) {
      erro("Erro ao desativar aluno.");
      return;
    }

    sucesso("Aluno desativado.");
    carregarDados();
  }

  async function salvarConfiguracoes() {
    if (!novoUsuario.trim()) {
      aviso("Digite o novo usuário.");
      return;
    }

    if (!novaSenha.trim()) {
      aviso("Digite a nova senha.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      erro("As senhas não coincidem.");
      return;
    }

    const { error } = await supabase
      .from("admins")
      .update({
        usuario: novoUsuario.trim(),
        senha: novaSenha.trim(),
      })
      .eq("usuario", usuario.trim());

    if (error) {
      erro("Erro ao atualizar login.");
      return;
    }

    setUsuario(novoUsuario.trim());
    setSenha(novaSenha.trim());
    setNovoUsuario("");
    setNovaSenha("");
    setConfirmarSenha("");
    sucesso("Login atualizado com sucesso!");
  }

  function formatarHora(data: string) {
    return new Date(data).toLocaleTimeString("pt-BR");
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleDateString("pt-BR");
  }

  function nomeTipo(tipo: string) {
    return tipo === "entrada" ? "Entrada" : "Saída";
  }

  function pontosDoMes(lista: Ponto[]) {
    const agora = new Date();
    const mes = agora.getMonth();
    const ano = agora.getFullYear();

    return lista.filter((ponto) => {
      const data = new Date(ponto.hora);
      return data.getMonth() === mes && data.getFullYear() === ano;
    });
  }

  function calcularBancoHoras(lista: Ponto[]) {
    const porDia: Record<string, { entrada?: Date; saida?: Date }> = {};

    pontosDoMes(lista).forEach((ponto) => {
      const data = new Date(ponto.hora);
      const chave = data.toISOString().split("T")[0];

      if (!porDia[chave]) porDia[chave] = {};

      if (ponto.tipo === "entrada") porDia[chave].entrada = data;
      if (ponto.tipo === "saida") porDia[chave].saida = data;
    });

    let minutosTotais = 0;
    let diasTrabalhados = 0;
    let diasCompletos = 0;

    Object.values(porDia).forEach((dia) => {
      if (dia.entrada || dia.saida) diasTrabalhados++;

      if (dia.entrada && dia.saida) {
        const diff = dia.saida.getTime() - dia.entrada.getTime();

        if (diff > 0) {
          minutosTotais += Math.floor(diff / 60000);
          diasCompletos++;
        }
      }
    });

    return {
      horas: Math.floor(minutosTotais / 60),
      minutos: minutosTotais % 60,
      diasTrabalhados,
      diasCompletos,
    };
  }

  function baixarPDF() {
    if (!alunoHistorico) return;

    const banco = calcularBancoHoras(historico);
    const registrosMes = pontosDoMes(historico);
    const agora = new Date();

    const pdf = new jsPDF();

    pdf.setFillColor(24, 24, 27);
    pdf.rect(0, 0, 210, 35, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.text("Ponto Control", 14, 15);

    pdf.setFontSize(12);
    pdf.text("Relatório mensal de frequência", 14, 24);

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.text("Dados do aluno", 14, 48);

    pdf.setFontSize(11);
    pdf.text(`Nome: ${alunoHistorico.nome}`, 14, 58);
    pdf.text(`Código: ${alunoHistorico.codigo}`, 14, 66);
    pdf.text(
      `Mês: ${agora.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      })}`,
      14,
      74
    );
    pdf.text(`Gerado em: ${agora.toLocaleDateString("pt-BR")}`, 14, 82);

    pdf.setFillColor(245, 245, 245);
    pdf.roundedRect(14, 94, 85, 32, 3, 3, "F");
    pdf.roundedRect(111, 94, 85, 32, 3, 3, "F");

    pdf.setFontSize(10);
    pdf.text("Carga horária total", 20, 104);
    pdf.setFontSize(18);
    pdf.text(`${banco.horas}h ${banco.minutos}min`, 20, 117);

    pdf.setFontSize(10);
    pdf.text("Dias trabalhados", 117, 104);
    pdf.setFontSize(18);
    pdf.text(`${banco.diasTrabalhados}`, 117, 117);

    pdf.setFillColor(245, 245, 245);
    pdf.roundedRect(14, 134, 85, 32, 3, 3, "F");
    pdf.roundedRect(111, 134, 85, 32, 3, 3, "F");

    pdf.setFontSize(10);
    pdf.text("Dias completos", 20, 144);
    pdf.setFontSize(18);
    pdf.text(`${banco.diasCompletos}`, 20, 157);

    pdf.setFontSize(10);
    pdf.text("Registros no mês", 117, 144);
    pdf.setFontSize(18);
    pdf.text(`${registrosMes.length}`, 117, 157);

    let y = 185;

    pdf.setFontSize(14);
    pdf.text("Registros do mês", 14, y);
    y += 10;

    pdf.setFillColor(24, 24, 27);
    pdf.rect(14, y, 182, 10, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.text("Data", 18, y + 7);
    pdf.text("Horário", 65, y + 7);
    pdf.text("Tipo", 105, y + 7);
    pdf.text("Origem", 145, y + 7);

    y += 16;
    pdf.setTextColor(0, 0, 0);

    registrosMes.forEach((ponto, index) => {
      if (y > 275) {
        pdf.addPage();
        y = 20;
      }

      if (index % 2 === 0) {
        pdf.setFillColor(248, 248, 248);
        pdf.rect(14, y - 6, 182, 9, "F");
      }

      pdf.setFontSize(9);
      pdf.text(formatarData(ponto.hora), 18, y);
      pdf.text(formatarHora(ponto.hora), 65, y);
      pdf.text(nomeTipo(ponto.tipo), 105, y);
      pdf.text(ponto.criado_por_admin ? "Manual" : "Aluno", 145, y);

      y += 9;
    });

    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 120);
    pdf.text("Relatório gerado automaticamente pelo Ponto Control.", 14, 290);

    pdf.save(`relatorio-${alunoHistorico.nome}.pdf`);
  }

  const bancoHoras = calcularBancoHoras(historico);
  const entradasHoje = pontos.filter((ponto) => ponto.tipo === "entrada").length;
  const saidasHoje = pontos.filter((ponto) => ponto.tipo === "saida").length;
  const pontosManuais = pontos.filter((ponto) => ponto.criado_por_admin).length;
  const alunosPresentesHoje = new Set(
    pontos.map((ponto) => ponto.alunos?.id).filter(Boolean)
  ).size;

  const CaixaMensagem = () =>
    mensagem ? (
      <div
        className={`rounded-xl p-4 text-center mb-4 font-bold shadow-lg ${
          tipoMensagem === "sucesso"
            ? "bg-green-600"
            : tipoMensagem === "erro"
            ? "bg-red-600"
            : "bg-yellow-500 text-black"
        }`}
      >
        {tipoMensagem === "sucesso" && "✅ "}
        {tipoMensagem === "erro" && "❌ "}
        {tipoMensagem === "aviso" && "⚠️ "}
        {mensagem}
      </div>
    ) : null;

  if (!logado) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-zinc-900 rounded-3xl p-6 shadow-lg">
          <h1 className="text-3xl font-bold text-center mb-2">Ponto Control</h1>

          <p className="text-zinc-400 text-center mb-6">
            Login do administrador
          </p>

          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Usuário"
            className="w-full bg-zinc-800 rounded-xl p-3 mb-3 outline-none"
          />

          <input
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Senha"
            type="password"
            className="w-full bg-zinc-800 rounded-xl p-3 mb-3 outline-none"
          />

          <button
            onClick={entrarAdmin}
            className="w-full bg-green-600 rounded-xl py-3 font-bold"
          >
            Entrar
          </button>

          <div className="mt-4">
            <CaixaMensagem />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="bg-zinc-900 p-4 flex items-center justify-between sticky top-0 z-30">
        <div>
          <h1 className="text-xl font-bold">Ponto Control</h1>
          <p className="text-zinc-400 text-sm">Painel Admin</p>
        </div>

        <button
          onClick={() => setMenuAberto(true)}
          className="bg-zinc-800 rounded-xl px-4 py-2 text-2xl font-bold"
        >
          ☰
        </button>
      </header>

      {menuAberto && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setMenuAberto(false)}
          />

          <aside className="fixed top-0 right-0 h-full w-72 bg-zinc-900 z-50 p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Menu</h2>

              <button
                onClick={() => setMenuAberto(false)}
                className="bg-zinc-800 rounded-xl px-3 py-1 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-2">
              <button
                onClick={() => {
                  setTela("hoje");
                  setMenuAberto(false);
                }}
                className="bg-zinc-800 rounded-xl p-3 text-left font-bold"
              >
                📊 Dashboard
              </button>

              <button
                onClick={() => {
                  setTela("manual");
                  setMenuAberto(false);
                }}
                className="bg-zinc-800 rounded-xl p-3 text-left font-bold"
              >
                ➕ Criar ponto manual
              </button>

              <button
                onClick={() => {
                  setTela("cadastro");
                  setMenuAberto(false);
                }}
                className="bg-zinc-800 rounded-xl p-3 text-left font-bold"
              >
                👤 Cadastrar aluno
              </button>

              <button
                onClick={() => {
                  setTela("alunos");
                  setMenuAberto(false);
                }}
                className="bg-zinc-800 rounded-xl p-3 text-left font-bold"
              >
                👥 Ver alunos
              </button>

              <button
                onClick={() => {
                  setNovoUsuario(usuario);
                  setNovaSenha("");
                  setConfirmarSenha("");
                  setTela("configuracoes");
                  setMenuAberto(false);
                }}
                className="bg-zinc-800 rounded-xl p-3 text-left font-bold"
              >
                ⚙️ Configurações
              </button>

              <button
                onClick={sairAdmin}
                className="bg-red-600 rounded-xl p-3 text-left font-bold"
              >
                🚪 Sair
              </button>
            </div>
          </aside>
        </>
      )}

      <div className="p-4 max-w-5xl mx-auto">
        <CaixaMensagem />

        {tela !== "hoje" && (
          <button
            onClick={() => {
              setTela("hoje");
              setMensagem("");
            }}
            className="mb-4 bg-zinc-800 rounded-xl px-4 py-2 font-bold"
          >
            ← Voltar
          </button>
        )}

        {tela === "hoje" && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">Dashboard</h2>
                <p className="text-zinc-400 text-sm">
                  Resumo dos registros de hoje
                </p>
              </div>

              <button
                onClick={carregarDados}
                className="bg-zinc-800 rounded-xl px-4 py-2 font-bold"
              >
                Atualizar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-zinc-900 rounded-2xl p-4">
                <p className="text-zinc-400 text-sm">Alunos ativos</p>
                <p className="text-3xl font-bold">{alunos.length}</p>
              </div>

              <div className="bg-zinc-900 rounded-2xl p-4">
                <p className="text-zinc-400 text-sm">Presentes hoje</p>
                <p className="text-3xl font-bold">{alunosPresentesHoje}</p>
              </div>

              <div className="bg-zinc-900 rounded-2xl p-4">
                <p className="text-zinc-400 text-sm">Entradas hoje</p>
                <p className="text-3xl font-bold text-green-400">
                  {entradasHoje}
                </p>
              </div>

              <div className="bg-zinc-900 rounded-2xl p-4">
                <p className="text-zinc-400 text-sm">Saídas hoje</p>
                <p className="text-3xl font-bold text-blue-400">
                  {saidasHoje}
                </p>
              </div>

              <div className="bg-zinc-900 rounded-2xl p-4">
                <p className="text-zinc-400 text-sm">Pontos hoje</p>
                <p className="text-3xl font-bold">{pontos.length}</p>
              </div>

              <div className="bg-zinc-900 rounded-2xl p-4">
                <p className="text-zinc-400 text-sm">Manuais hoje</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {pontosManuais}
                </p>
              </div>
            </div>

            <h3 className="text-xl font-bold mb-3">Últimos registros</h3>

            {carregando && <p className="text-zinc-400">Carregando...</p>}

            <div className="grid gap-3">
              {pontos.map((ponto) => (
                <div key={ponto.id} className="bg-zinc-900 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">
                        {ponto.alunos?.nome || "Aluno não encontrado"}
                      </p>

                      <p className="text-zinc-400 text-sm">
                        Código: {ponto.alunos?.codigo || "---"}
                      </p>

                      <p className="text-zinc-400 text-sm">
                        {formatarData(ponto.hora)} às {formatarHora(ponto.hora)}
                      </p>

                      {ponto.criado_por_admin && (
                        <p className="text-yellow-400 text-sm">
                          Criado manualmente pelo admin
                        </p>
                      )}
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-sm font-bold ${
                        ponto.tipo === "entrada"
                          ? "bg-green-600"
                          : "bg-blue-600"
                      }`}
                    >
                      {nomeTipo(ponto.tipo)}
                    </span>
                  </div>

                  <button
                    onClick={() => apagarPonto(ponto.id)}
                    className="mt-3 w-full bg-red-600 rounded-xl py-2 font-bold"
                  >
                    Apagar ponto
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {tela === "manual" && (
          <section className="bg-zinc-900 rounded-2xl p-4">
            <h2 className="text-2xl font-bold mb-4">Criar ponto manual</h2>

            <select
              value={alunoSelecionado}
              onChange={(e) => setAlunoSelecionado(e.target.value)}
              className="w-full bg-zinc-800 rounded-xl p-3 mb-3"
            >
              <option value="">Escolha o aluno</option>
              {alunos.map((aluno) => (
                <option key={aluno.id} value={aluno.id}>
                  {aluno.nome} - {aluno.codigo}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-zinc-400 text-sm">Entrada</label>
                <input
                  type="time"
                  value={horaEntrada}
                  onChange={(e) => setHoraEntrada(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3 mt-1 outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-sm">Saída</label>
                <input
                  type="time"
                  value={horaSaida}
                  onChange={(e) => setHoraSaida(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3 mt-1 outline-none"
                />
              </div>
            </div>

            <button
              onClick={registrarManual}
              className="w-full bg-green-600 rounded-xl py-3 font-bold"
            >
              Registrar entrada e saída
            </button>
          </section>
        )}

        {tela === "cadastro" && (
          <section className="bg-zinc-900 rounded-2xl p-4">
            <h2 className="text-2xl font-bold mb-4">Cadastrar aluno</h2>

            <input
              value={nomeNovoAluno}
              onChange={(e) => setNomeNovoAluno(e.target.value)}
              placeholder="Nome completo do aluno"
              className="w-full bg-zinc-800 rounded-xl p-3 mb-3 outline-none"
            />

            <button
              onClick={criarAluno}
              className="w-full bg-green-600 rounded-xl py-3 font-bold"
            >
              Criar aluno e gerar código
            </button>

            {codigoGerado && (
              <div className="mt-4 bg-green-600 rounded-2xl p-4 text-center">
                <p className="text-sm font-bold">Código gerado:</p>
                <p className="text-4xl font-bold tracking-widest uppercase">
                  {codigoGerado}
                </p>
              </div>
            )}
          </section>
        )}

        {tela === "alunos" && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Alunos cadastrados</h2>

            {alunoEditando && (
              <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
                <h3 className="text-xl font-bold mb-3">Editar aluno</h3>

                <input
                  value={nomeEditando}
                  onChange={(e) => setNomeEditando(e.target.value)}
                  placeholder="Nome do aluno"
                  className="w-full bg-zinc-800 rounded-xl p-3 mb-3 outline-none"
                />

                <input
                  value={codigoEditando}
                  onChange={(e) => setCodigoEditando(e.target.value)}
                  placeholder="Código do aluno"
                  className="w-full bg-zinc-800 rounded-xl p-3 mb-3 outline-none lowercase"
                />

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={salvarEdicaoAluno}
                    className="bg-green-600 rounded-xl py-3 font-bold"
                  >
                    Salvar
                  </button>

                  <button
                    onClick={cancelarEdicaoAluno}
                    className="bg-red-600 rounded-xl py-3 font-bold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-3">
              {alunos.map((aluno) => (
                <div key={aluno.id} className="bg-zinc-900 rounded-2xl p-4">
                  <p className="font-bold">{aluno.nome}</p>

                  <p className="text-zinc-400 text-sm mb-3">
                    Código: {aluno.codigo}
                  </p>

                  <div className="grid gap-2">
                    <button
                      onClick={() => abrirHistorico(aluno)}
                      className="w-full bg-blue-600 rounded-xl py-2 font-bold"
                    >
                      Ver histórico e banco de horas
                    </button>

                    <button
                      onClick={() => abrirEdicaoAluno(aluno)}
                      className="w-full bg-yellow-600 rounded-xl py-2 font-bold"
                    >
                      Editar aluno
                    </button>

                    <button
                      onClick={() => desativarAluno(aluno.id)}
                      className="w-full bg-red-600 rounded-xl py-2 font-bold"
                    >
                      Desativar aluno
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tela === "historico" && alunoHistorico && (
          <section>
            <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
              <h2 className="text-2xl font-bold">{alunoHistorico.nome}</h2>
              <p className="text-zinc-400">Código: {alunoHistorico.codigo}</p>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-zinc-800 rounded-xl p-3">
                  <p className="text-zinc-400 text-sm">Banco de horas</p>
                  <p className="text-2xl font-bold">
                    {bancoHoras.horas}h {bancoHoras.minutos}min
                  </p>
                </div>

                <div className="bg-zinc-800 rounded-xl p-3">
                  <p className="text-zinc-400 text-sm">Dias trabalhados</p>
                  <p className="text-2xl font-bold">
                    {bancoHoras.diasTrabalhados}
                  </p>
                </div>
              </div>

              <button
                onClick={baixarPDF}
                className="mt-4 w-full rounded-xl py-3 font-bold bg-green-600"
              >
                Baixar relatório PDF
              </button>
            </div>

            <div className="grid gap-3">
              {[...historico].reverse().map((ponto) => (
                <div key={ponto.id} className="bg-zinc-900 rounded-2xl p-4">
                  <p className="font-bold">{nomeTipo(ponto.tipo)}</p>

                  <p className="text-zinc-400 text-sm">
                    {formatarData(ponto.hora)} às {formatarHora(ponto.hora)}
                  </p>

                  <button
                    onClick={() => apagarPonto(ponto.id)}
                    className="mt-3 w-full bg-red-600 rounded-xl py-2 font-bold"
                  >
                    Apagar registro
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {tela === "configuracoes" && (
          <section className="bg-zinc-900 rounded-2xl p-4">
            <h2 className="text-2xl font-bold mb-4">Configurações</h2>

            <p className="text-zinc-400 text-sm mb-3">
              Troque o usuário e a senha do administrador.
            </p>

            <input
              value={novoUsuario}
              onChange={(e) => setNovoUsuario(e.target.value)}
              placeholder="Novo usuário"
              className="w-full bg-zinc-800 rounded-xl p-3 mb-3 outline-none"
            />

            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Nova senha"
              className="w-full bg-zinc-800 rounded-xl p-3 mb-3 outline-none"
            />

            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Confirmar nova senha"
              className="w-full bg-zinc-800 rounded-xl p-3 mb-3 outline-none"
            />

            <button
              onClick={salvarConfiguracoes}
              className="w-full bg-green-600 rounded-xl py-3 font-bold"
            >
              Salvar alterações
            </button>
          </section>
        )}
      </div>
    </main>
  );
}