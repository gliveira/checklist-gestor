(function () {
  // Os dados vêm da planilha do Google (compartilhada como "qualquer pessoa com o link").
  const PLANILHA_ID = "1WQSTiDi-i93JcPGNNVFsY5lxHDTRycua";
  const URL_CSV = `https://docs.google.com/spreadsheets/d/${PLANILHA_ID}/gviz/tq?tqx=out:csv`;
  const URL_PLANILHA = `https://docs.google.com/spreadsheets/d/${PLANILHA_ID}/edit`;
  const CHAVE_CACHE = "status-implantacoes-eduq-cache";

  const ITENS = ["Conta ASAAS", "Liberações ASAAS", "Plano de contas", "Emissão nota", "Matriz", "Turmas", "EAD"];
  // Posição de cada coluna na planilha: A=Etapa, B=Cliente, C–F financeiro, G vazia, H–J acadêmico, K=Mês, L=Tipo.
  const COL = { etapa: 0, cliente: 1, itens: [2, 3, 4, 5, 7, 8, 9], mes: 10, tipo: 11 };
  const ETAPAS = { T: "Treinamento", A: "Acompanhamento", F: "Finalizado", P: "A iniciar" };
  const MES_NOME = { JAN: "Janeiro", FEV: "Fevereiro", MAR: "Março", ABR: "Abril", MAI: "Maio", JUN: "Junho",
    JUL: "Julho", AGO: "Agosto", SET: "Setembro", OUT: "Outubro", NOV: "Novembro", DEZ: "Dezembro" };

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const dataHora = d => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  let clientes = [];

  function mensagem(texto, erro) {
    $("status").textContent = texto;
    $("status").classList.toggle("erro", !!erro);
  }

  function parseCSV(texto) {
    const linhas = [];
    let linha = [], campo = "", aspas = false;
    for (let i = 0; i < texto.length; i++) {
      const ch = texto[i];
      if (aspas) {
        if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
        else if (ch === '"') aspas = false;
        else campo += ch;
      } else if (ch === '"') aspas = true;
      else if (ch === ",") { linha.push(campo); campo = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && texto[i + 1] === "\n") i++;
        linha.push(campo); linhas.push(linha); linha = []; campo = "";
      } else campo += ch;
    }
    if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
    return linhas;
  }

  function normalizaItem(v) {
    const s = v.trim().toUpperCase();
    return s === "OK" || s === "NU" || s === "ND" ? s : "";
  }

  function converte(linhas) {
    const inicio = linhas.findIndex(l => (l[COL.cliente] || "").trim().toLowerCase() === "cliente");
    if (inicio < 0) throw new Error("Cabeçalho \"Cliente\" não encontrado na coluna B da planilha.");
    return linhas.slice(inicio + 1)
      .filter(l => (l[COL.cliente] || "").trim())
      .map(l => ({
        etapa: (l[COL.etapa] || "").trim().toUpperCase(),
        cliente: l[COL.cliente].trim().toUpperCase(),
        itens: COL.itens.map(i => normalizaItem(l[i] || "")),
        mes: (l[COL.mes] || "").trim().toUpperCase(),
        tipo: (l[COL.tipo] || "").trim().toUpperCase(),
      }));
  }

  function calc(c) {
    const aplic = c.itens.filter(x => x !== "NU" && x !== "ND");
    return { ok: aplic.filter(x => x === "OK").length, total: aplic.length, pend: ITENS.filter((_, i) => c.itens[i] === "") };
  }

  const chip = v => v === "OK" ? '<span class="chip c-ok">OK</span>'
    : v === "NU" ? '<span class="chip c-nu">NU</span>'
    : v === "ND" ? '<span class="chip c-nd">ND</span>'
    : '<span class="chip c-pend">—</span>';
  const sep = j => (j === 0 || j === 4 ? "sep" : "");

  function linha(c) {
    const k = calc(c);
    const pct = k.total ? Math.round(100 * k.ok / k.total) : 0;
    const prog = k.total
      ? `<div class="prog"><div class="bar"><i style="width:${pct}%"></i></div><small>${k.ok}/${k.total}</small></div>`
      : '<div class="prog"><small>não se aplica</small></div>';
    return `<tr><td><span class="etapa" title="${ETAPAS[c.etapa] || "Sem etapa"}">${esc(c.etapa) || "—"}</span></td>`
      + `<td class="cli">${esc(c.cliente)}</td><td>${esc(c.tipo)}</td>`
      + c.itens.map((x, j) => `<td class="${sep(j)}">${chip(x)}</td>`).join("")
      + `<td class="sep">${esc(MES_NOME[c.mes] || c.mes)}</td><td>${prog}</td></tr>`;
  }

  function render() {
    const L = clientes;
    const conta = k => L.filter(c => c.etapa === k).length;
    $("stats").innerHTML = [
      [L.length, "clientes"],
      [L.filter(c => c.tipo === "IMP").length + " / " + L.filter(c => c.tipo === "TREIN").length, "implantação / treinamento"],
      [conta("T"), "em treinamento"],
      [conta("A"), "em acompanhamento"],
      [conta("F"), "finalizados"],
      [L.filter(c => calc(c).pend.length).length, "clientes com pendências"],
    ].map(([n, t]) => `<div class="stat"><b>${n}</b><span>${t}</span></div>`).join("");

    $("linhas").innerHTML = L.length
      ? L.map(linha).join("")
      : '<tr><td colspan="12" class="vazio">Nenhum cliente encontrado na planilha.</td></tr>';

    $("pendencias").innerHTML = [...L].sort((a, b) => calc(b).pend.length - calc(a).pend.length).map(c => {
      const k = calc(c);
      const corpo = k.pend.length
        ? `<ul>${k.pend.map(p => `<li>${p}</li>`).join("")}</ul>`
        : `<p class="note">${k.total ? "Todos os itens aplicáveis concluídos." : "Não utiliza nenhum dos itens controlados."}</p>`;
      return `<div class="pcard ${k.pend.length ? "" : "done"}"><h3><span>${esc(c.cliente)}</span><span class="etapa">${ETAPAS[c.etapa] || "Sem etapa"}</span></h3>${corpo}</div>`;
    }).join("");
  }

  async function carregar() {
    $("btn-atualizar").disabled = true;
    mensagem("Buscando dados da planilha…");
    try {
      const r = await fetch(`${URL_CSV}&_=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`O Google respondeu com erro ${r.status}.`);
      const texto = await r.text();
      if (/^\s*</.test(texto)) throw new Error("A planilha não está compartilhada como \"qualquer pessoa com o link\".");
      clientes = converte(parseCSV(texto));
      const agora = Date.now();
      try { localStorage.setItem(CHAVE_CACHE, JSON.stringify({ em: agora, clientes })); } catch (e) { /* sem cache */ }
      $("atualizado").textContent = dataHora(agora);
      mensagem("");
    } catch (e) {
      let cache = null;
      try { cache = JSON.parse(localStorage.getItem(CHAVE_CACHE)); } catch (_) { /* sem cache */ }
      if (cache && cache.clientes) {
        clientes = cache.clientes;
        $("atualizado").textContent = dataHora(cache.em);
        mensagem(`Não foi possível ler a planilha agora (${e.message}) Mostrando os últimos dados baixados.`, true);
      } else {
        mensagem(`Não foi possível ler a planilha: ${e.message}`, true);
      }
    }
    render();
    $("btn-atualizar").disabled = false;
  }

  $("link-planilha").href = URL_PLANILHA;
  $("btn-atualizar").addEventListener("click", carregar);
  render();
  carregar();
})();
