// Itens do checklist, organizados por periodicidade e grupo.
const CHECKLIST = [
  {
    id: "diaria",
    titulo: "Diária",
    grupos: [
      {
        titulo: "Começo do dia",
        itens: [
          ["Ver a fila de tickets", "Quantos estão abertos, quais são novos e quais estão parados há mais de 24h"],
          ["Separar os tickets críticos", "Sistema fora, financeiro, diploma, matrícula: esses vêm primeiro"],
          ["Ver os tickets perto de estourar o SLA", "Redistribuir se for preciso"],
          ["Conferir quem está escalado", "Redistribuir a carga se faltar alguém"],
        ],
      },
      {
        titulo: "Durante o dia",
        itens: [
          ["Acompanhar o que foi escalado para o dev", "Cobrar retorno dos bugs bloqueantes"],
          ["Responder ou destravar o que o time não conseguiu resolver"],
          ["Conferir se os tickets estão sendo atualizados", "Resposta ao cliente e registro do que foi feito"],
          ["Ver se algum cliente reclamou duas vezes ou mandou mensagem fora do canal"],
        ],
      },
      {
        titulo: "Fim do dia",
        itens: [
          ["Revisar o que entrou e o que foi resolvido no dia"],
          ["Deixar marcado o que fica pendente para amanhã"],
        ],
      },
    ],
  },
  {
    id: "semanal",
    titulo: "Semanal",
    grupos: [
      {
        titulo: "Qualidade e time",
        itens: [
          ["Ler atendimentos por amostragem", "5 a 10 por pessoa: clareza, tom e se resolveu de verdade"],
          ["Dar feedback individual ao time", "Curto e com exemplo concreto"],
          ["Revisar os tickets reabertos", "Mostram onde a solução não ficou boa"],
        ],
      },
      {
        titulo: "Causas e melhorias",
        itens: [
          ["Levantar os assuntos que mais geraram ticket", "Se o mesmo problema se repete, ou falta um roteiro ou é bug"],
          ["Criar ou atualizar roteiros de atendimento", "Para as dúvidas mais repetidas"],
          ["Fazer o alinhamento com dev", "Lista de bugs priorizados pelo impacto no cliente"],
          ["Acompanhar os clientes em implantação", "Ver se algum está travado"],
        ],
      },
    ],
  },
  {
    id: "mensal",
    titulo: "Mensal",
    grupos: [
      {
        titulo: "Indicadores",
        itens: [
          ["Fechar os indicadores", "Volume, 1ª resposta, tempo de resolução, % no SLA, reabertura e satisfação"],
          ["Ranking de clientes por volume de tickets", "Quem está em risco e quem precisa de treinamento"],
          ["Ranking de funções ou telas que mais geram chamado", "Mandar para o produto"],
          ["Mandar relatório curto para a diretoria", "Números, principais problemas e plano de ação"],
        ],
      },
      {
        titulo: "Pessoas e conhecimento",
        itens: [
          ["Revisar a base de conhecimento", "O que ficou desatualizado depois das últimas versões"],
          ["Fazer 1:1 com cada pessoa do time", "Desenvolvimento, dificuldades e metas"],
          ["Planejar treinamento interno", "Módulos com mais dúvidas (financeiro, diploma digital, certificados)"],
        ],
      },
    ],
  },
  {
    id: "continuo",
    titulo: "Contínuo",
    grupos: [
      {
        titulo: "Período letivo e releases",
        itens: [
          ["Antecipar os picos do calendário", "Matrícula, rematrícula, fechamento de notas, diplomas e boletos"],
          ["Antes de cada release, ler o que mudou e avisar o time"],
          ["Depois de cada release, monitorar os tickets novos ligados ao que mudou"],
          ["Manter atualizada a lista de contatos-chave por cliente"],
        ],
      },
    ],
  },
];

const PREFIXO = "checklist-gestor-suporte";

// Chave do período atual: as marcações de um dia/semana/mês não valem no seguinte.
function chavePeriodo(periodo, data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  switch (periodo) {
    case "diaria":
      return `${ano}-${mes}-${dia}`;
    case "semanal":
      return semanaIso(data);
    case "mensal":
      return `${ano}-${mes}`;
    default:
      return "sempre";
  }
}

function semanaIso(data) {
  const d = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
  const diaSemana = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - diaSemana);
  const inicioAno = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((d - inicioAno) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-S${String(semana).padStart(2, "0")}`;
}

function chaveStorage(periodo) {
  return `${PREFIXO}:${periodo}:${chavePeriodo(periodo)}`;
}

function lerMarcados(periodo) {
  try {
    const valor = localStorage.getItem(chaveStorage(periodo));
    return new Set(valor ? JSON.parse(valor) : []);
  } catch {
    return new Set();
  }
}

function salvarMarcados(periodo, marcados) {
  try {
    localStorage.setItem(chaveStorage(periodo), JSON.stringify([...marcados]));
  } catch {
    // Sem storage (aba anônima, bloqueio): o checklist funciona só na sessão.
  }
}

function lerAbaAtiva() {
  try {
    return localStorage.getItem(`${PREFIXO}:aba`) || CHECKLIST[0].id;
  } catch {
    return CHECKLIST[0].id;
  }
}

function salvarAbaAtiva(id) {
  try {
    localStorage.setItem(`${PREFIXO}:aba`, id);
  } catch {}
}

const estado = {
  aba: lerAbaAtiva(),
  marcados: Object.fromEntries(CHECKLIST.map((p) => [p.id, lerMarcados(p.id)])),
};

function totalItens(periodo) {
  return periodo.grupos.reduce((soma, g) => soma + g.itens.length, 0);
}

function renderAbas() {
  const nav = document.getElementById("abas");
  nav.innerHTML = "";
  for (const periodo of CHECKLIST) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "aba";
    botao.setAttribute("role", "tab");
    botao.setAttribute("aria-selected", String(periodo.id === estado.aba));
    botao.innerHTML = `${periodo.titulo}<span class="contador">${estado.marcados[periodo.id].size}/${totalItens(periodo)}</span>`;
    botao.addEventListener("click", () => {
      estado.aba = periodo.id;
      salvarAbaAtiva(periodo.id);
      render();
    });
    nav.appendChild(botao);
  }
}

function renderPainel(periodo) {
  const marcados = estado.marcados[periodo.id];
  const total = totalItens(periodo);
  const pct = total ? Math.round((marcados.size / total) * 100) : 0;

  const painel = document.createElement("section");
  painel.className = "painel";
  painel.style.display = periodo.id === estado.aba ? "block" : "none";

  painel.innerHTML = `
    <h2 class="painel-titulo">${periodo.titulo}</h2>
    <div class="painel-topo">
      <div class="barra"><div class="barra-preenchida" style="width:${pct}%"></div></div>
      <span class="percentual">${marcados.size} de ${total} · ${pct}%</span>
    </div>`;

  periodo.grupos.forEach((grupo, gi) => {
    const bloco = document.createElement("div");
    bloco.className = "grupo";
    bloco.innerHTML = `<h2>${grupo.titulo}</h2>`;
    const lista = document.createElement("ul");

    grupo.itens.forEach(([texto, detalhe], ii) => {
      const id = `${gi}-${ii}`;
      const feito = marcados.has(id);
      const li = document.createElement("li");
      li.innerHTML = `
        <label class="item${feito ? " feito" : ""}">
          <input type="checkbox" ${feito ? "checked" : ""}>
          <span class="texto">${texto}${detalhe ? `<small>${detalhe}</small>` : ""}</span>
        </label>`;
      li.querySelector("input").addEventListener("change", (e) => {
        if (e.target.checked) marcados.add(id);
        else marcados.delete(id);
        salvarMarcados(periodo.id, marcados);
        render();
      });
      lista.appendChild(li);
    });

    bloco.appendChild(lista);
    painel.appendChild(bloco);
  });

  return painel;
}

function render() {
  renderAbas();
  const main = document.getElementById("conteudo");
  main.innerHTML = "";
  for (const periodo of CHECKLIST) main.appendChild(renderPainel(periodo));
}

document.getElementById("data-hoje").textContent = new Date().toLocaleDateString("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

document.getElementById("btn-imprimir").addEventListener("click", () => window.print());

document.getElementById("btn-limpar").addEventListener("click", () => {
  if (!confirm("Desmarcar todos os itens de todas as abas?")) return;
  for (const periodo of CHECKLIST) {
    estado.marcados[periodo.id].clear();
    salvarMarcados(periodo.id, estado.marcados[periodo.id]);
  }
  render();
});

render();
