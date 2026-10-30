(function () {
  // As avaliações vêm do CSV de CSAT exportado do Conversas e ficam guardadas só neste navegador.
  const CHAVE = "csat-suporte-eduq-avaliacoes";
  const COLUNAS = {
    operador: "Nome do Operador", nota: "Classificação", contato: "Nome do contato",
    link: "Link para a conversa", data: "Data de gravação", desconsiderada: "Desconsiderada",
  };
  const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const COR_NOTA = { 5: "var(--ok)", 4: "var(--ok)", 3: "var(--pend)", 2: "var(--bad)", 1: "var(--bad)" };

  const $ = id => document.getElementById(id);
  const pct = x => x.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
  const dec = x => x.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const int = x => x.toLocaleString("pt-BR");
  const diaCurto = s => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
  const diaLongo = s => `${SEMANA[new Date(s + "T12:00:00").getDay()]} ${diaCurto(s)}`;

  // Guardado como { arquivos, em, avaliacoes }; versões antigas guardavam só a lista.
  let { avaliacoes, arquivos, em } = carrega();

  function carrega() {
    try {
      const d = JSON.parse(localStorage.getItem(CHAVE));
      if (Array.isArray(d)) return { avaliacoes: d, arquivos: [], em: "" };
      if (d && Array.isArray(d.avaliacoes)) return d;
    } catch (e) { /* sem dados guardados */ }
    return { avaliacoes: [], arquivos: [], em: "" };
  }

  function salva() {
    try { localStorage.setItem(CHAVE, JSON.stringify({ arquivos, em, avaliacoes })); return true; } catch (e) { return false; }
  }

  function mostraCarga() {
    const el = $("carregada");
    el.hidden = !avaliacoes.length;
    if (!avaliacoes.length) return;
    const quando = em ? new Date(em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
    el.textContent = `Planilha em uso: ${arquivos.length ? arquivos.join(", ") : "carregada anteriormente"}${quando ? `, anexada em ${quando}` : ""}. Ela fica salva neste navegador até você anexar outra.`;
  }

  function mensagem(texto, erro) {
    $("status").textContent = texto;
    $("status").classList.toggle("erro", !!erro);
  }

  function parseCSV(texto, sep) {
    const linhas = [];
    let linha = [], campo = "", aspas = false;
    for (let i = 0; i < texto.length; i++) {
      const ch = texto[i];
      if (aspas) {
        if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
        else if (ch === '"') aspas = false;
        else campo += ch;
      } else if (ch === '"') aspas = true;
      else if (ch === sep) { linha.push(campo); campo = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && texto[i + 1] === "\n") i++;
        linha.push(campo); linhas.push(linha); linha = []; campo = "";
      } else campo += ch;
    }
    if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
    return linhas;
  }

  // Lê o CSV do Conversas e devolve só o que o painel usa (sem telefone nem e-mail do contato).
  function converte(texto) {
    texto = texto.replace(/^﻿/, "");
    const primeira = texto.slice(0, texto.search(/\r?\n/));
    const sep = primeira.split(";").length >= primeira.split(",").length ? ";" : ",";
    const linhas = parseCSV(texto, sep);
    const cab = linhas[0].map(c => c.trim());
    const ix = {};
    for (const [k, nome] of Object.entries(COLUNAS)) ix[k] = cab.indexOf(nome);
    const faltam = Object.entries(ix).filter(([k, i]) => i < 0 && k !== "desconsiderada").map(([k]) => `"${COLUNAS[k]}"`);
    if (faltam.length) throw new Error(`Esta planilha não parece o relatório de CSAT do Conversas: faltam as colunas ${faltam.join(", ")}.`);

    const lidas = [];
    let desconsideradas = 0;
    for (const l of linhas.slice(1)) {
      const nota = Number((l[ix.nota] || "").trim());
      const data = (l[ix.data] || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/);
      if (!(nota >= 1 && nota <= 5) || !data) continue;
      if (ix.desconsiderada >= 0 && (l[ix.desconsiderada] || "").trim().toLowerCase().startsWith("s")) { desconsideradas++; continue; }
      const link = (l[ix.link] || "").trim();
      lidas.push({
        conversa: link.split("/").pop() || `${data[3]}${data[2]}${data[1]}${data[4]}-${l[ix.operador]}`,
        operador: (l[ix.operador] || "").trim() || "Sem operador",
        nota,
        contato: (l[ix.contato] || "").trim(),
        dia: `${data[3]}-${data[2]}-${data[1]}`,
        hora: data[4],
        link: /^https:\/\//.test(link) ? link : "",
      });
    }
    return { lidas, desconsideradas };
  }

  // A planilha anexada substitui a anterior. Se vierem várias de uma vez, elas são juntadas pela conversa.
  async function substitui(lista) {
    let desc = 0;
    const porConversa = new Map();
    try {
      for (const arq of lista) {
        const { lidas, desconsideradas } = converte(await arq.text());
        desc += desconsideradas;
        for (const a of lidas) porConversa.set(a.conversa, a);
      }
    } catch (e) {
      mensagem(`${e.message} Os dados anteriores foram mantidos.`, true);
      return;
    }
    if (!porConversa.size) {
      mensagem("A planilha não tem nenhuma avaliação válida. Os dados anteriores foram mantidos.", true);
      return;
    }
    avaliacoes = [...porConversa.values()];
    arquivos = lista.map(a => a.name);
    em = new Date().toISOString();
    const ok = salva();
    let texto = `Dados atualizados: ${int(avaliacoes.length)} avaliações`;
    if (desc) texto += `, ${int(desc)} desconsideradas ficaram de fora`;
    texto += ok ? "." : ". Não foi possível guardar no navegador; os dados somem ao fechar a página.";
    mensagem(texto, !ok);
    montaFiltros(true);
    desenha();
  }

  function montaFiltros(irParaUltimo) {
    const meses = [...new Set(avaliacoes.map(a => a.dia.slice(0, 7)))].sort().reverse();
    const selMes = $("mes"), antes = selMes.value;
    selMes.replaceChildren(new Option("Todo o período", ""),
      ...meses.map(m => new Option(`${MESES[Number(m.slice(5, 7)) - 1]} de ${m.slice(0, 4)}`, m)));
    selMes.value = irParaUltimo && meses.length ? meses[0] : (meses.includes(antes) ? antes : (meses[0] || ""));

    const ops = [...new Set(avaliacoes.map(a => a.operador))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const selOp = $("operador"), opAntes = selOp.value;
    selOp.replaceChildren(new Option("Todos", ""), ...ops.map(o => new Option(o)));
    selOp.value = ops.includes(opAntes) ? opAntes : "";
  }

  function filtradas() {
    const mes = $("mes").value, op = $("operador").value;
    return avaliacoes.filter(a => (!mes || a.dia.startsWith(mes)) && (!op || a.operador === op));
  }

  function resumo(lista) {
    const n = lista.length;
    const soma = lista.reduce((s, a) => s + a.nota, 0);
    return {
      n,
      media: n ? soma / n : 0,
      csat: n ? lista.filter(a => a.nota >= 4).length / n * 100 : 0,
      nota5: n ? lista.filter(a => a.nota === 5).length / n * 100 : 0,
      baixas: lista.filter(a => a.nota <= 3).length,
    };
  }

  function desenha() {
    const tem = avaliacoes.length > 0;
    mostraCarga();
    $("btn-arquivo").textContent = tem ? "Anexar planilha nova" : "Anexar planilha";
    $("painel").hidden = !tem;
    $("btn-limpar").hidden = !tem;
    $("mes").parentElement.hidden = !tem;
    $("operador").parentElement.hidden = !tem;
    if (!tem) {
      $("periodo").textContent = "sem dados carregados";
      $("resumo").textContent = "Adicione a planilha de CSAT exportada do Conversas para ver os resultados.";
      return;
    }

    const lista = filtradas();
    const r = resumo(lista);
    const dias = lista.map(a => a.dia).sort();
    $("periodo").textContent = dias.length ? `${diaCurto(dias[0])}/${dias[0].slice(0, 4)} a ${diaCurto(dias[dias.length - 1])}/${dias[dias.length - 1].slice(0, 4)}` : "sem avaliações no filtro";
    const p = $("resumo");
    p.replaceChildren();
    if (r.n) {
      const b = t => { const e = document.createElement("b"); e.textContent = t; return e; };
      p.append(b(pct(r.csat)), " das ", b(int(r.n)), " avaliações deram nota 4 ou 5, com média ", b(dec(r.media)), ". ",
        b(int(r.baixas)), r.baixas === 1 ? " ficou em 3 ou menos." : " ficaram em 3 ou menos.");
    } else p.textContent = "Nenhuma avaliação no período e operador escolhidos.";

    $("k-csat").textContent = r.n ? pct(r.csat) : "—";
    $("k-media").textContent = r.n ? dec(r.media) : "—";
    $("k-nota5").textContent = r.n ? pct(r.nota5) : "—";
    $("k-total").textContent = int(r.n);
    $("k-baixas").textContent = int(r.baixas);

    desenhaDistribuicao(lista);
    desenhaDias(lista);
    desenhaOperadores(lista);
    desenhaLista($("baixas"), lista.filter(a => a.nota <= 3), "Nenhuma nota 3 ou menor no período.");
    desenhaTodas();
  }

  function desenhaDistribuicao(lista) {
    const cont = [5, 4, 3, 2, 1].map(nota => ({ nota, n: lista.filter(a => a.nota === nota).length }));
    const max = Math.max(1, ...cont.map(c => c.n));
    $("dist").replaceChildren(...cont.map(c => {
      const row = document.createElement("div");
      row.className = "drow";
      const lab = document.createElement("span");
      lab.textContent = `Nota ${c.nota}`;
      const track = document.createElement("div");
      track.className = "dtrack";
      const bar = document.createElement("i");
      bar.style.width = `${c.n / max * 100}%`;
      bar.style.background = COR_NOTA[c.nota];
      track.append(bar);
      const val = document.createElement("span");
      val.className = "dval";
      val.textContent = `${int(c.n)} · ${pct(lista.length ? c.n / lista.length * 100 : 0)}`;
      row.append(lab, track, val);
      return row;
    }));
  }

  function desenhaDias(lista) {
    const el = $("dias");
    el.replaceChildren();
    const porDia = [...new Set(lista.map(a => a.dia))].sort().map(dia => {
      const r = resumo(lista.filter(a => a.dia === dia));
      return { dia, ...r };
    });
    if (!porDia.length) return;

    const NS = "http://www.w3.org/2000/svg";
    const W = Math.max(300, el.clientWidth), H = 240;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const add = (tag, attrs, pai = svg) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); pai.append(e); return e; };
    el.append(svg);

    const maxN = Math.max(...porDia.map(d => d.n));
    const bruto = maxN / 4, mag = 10 ** Math.floor(Math.log10(Math.max(1, bruto)));
    const passo = Math.max(1, [1, 2, 5, 10].map(k => k * mag).find(s => s >= bruto));
    const topo = Math.ceil(maxN / passo) * passo;
    const ticks = [];
    for (let v = 0; v <= topo; v += passo) ticks.push(v);

    const sonda = add("text", {});
    sonda.textContent = int(topo);
    const ml = sonda.getComputedTextLength() + 10;
    sonda.remove();
    const m = { t: 20, r: 6, b: 26, l: ml };
    const larg = W - m.l - m.r, alt = H - m.t - m.b;
    const step = larg / porDia.length;
    const bw = Math.min(28, step * 0.7);
    const y = v => m.t + alt - v / topo * alt;

    for (const v of ticks) {
      add("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) });
      add("text", { x: m.l - 6, y: y(v), dy: "0.32em", "text-anchor": "end" }).textContent = int(v);
    }
    const longo = step >= 62;
    const cada = Math.ceil((longo ? 56 : 40) / step);
    const barras = porDia.map((d, i) => {
      const cx = m.l + step * i + step / 2;
      const b = add("rect", { class: "barra", x: cx - bw / 2, y: y(d.n), width: bw, height: y(0) - y(d.n), rx: 3 });
      if (step >= 22) add("text", { class: "val", x: cx, y: y(d.n) - 5, "text-anchor": "middle" }).textContent = int(d.n);
      if (i % cada === 0) add("text", { x: cx, y: H - 8, "text-anchor": "middle" }).textContent = longo ? diaLongo(d.dia) : diaCurto(d.dia);
      const alvo = add("rect", { x: m.l + step * i, y: m.t, width: step, height: alt, fill: "transparent" });
      alvo.addEventListener("pointermove", ev => mostraDica(ev, d, barras, b));
      alvo.addEventListener("pointerleave", () => escondeDica(barras));
      return b;
    });
  }

  function mostraDica(ev, d, barras, atual) {
    barras.forEach(b => b.classList.toggle("apagada", b !== atual));
    const tip = $("tip");
    const linha = (t, cls) => { const e = document.createElement("div"); if (cls) e.className = cls; e.textContent = t; return e; };
    tip.replaceChildren(linha(diaLongo(d.dia), "d"), linha(`${int(d.n)} avaliações`), linha(`Média ${dec(d.media)} · CSAT ${pct(d.csat)}`));
    tip.hidden = false;
    const x = Math.min(window.innerWidth - tip.offsetWidth - 8, ev.clientX + 14);
    tip.style.left = `${Math.max(8, x)}px`;
    tip.style.top = `${Math.max(8, ev.clientY - tip.offsetHeight - 10)}px`;
  }

  function escondeDica(barras) {
    barras.forEach(b => b.classList.remove("apagada"));
    $("tip").hidden = true;
  }

  const td = (texto, cls) => { const c = document.createElement("td"); if (cls) c.className = cls; c.textContent = texto; return c; };
  const vazio = (cols, texto) => { const tr = document.createElement("tr"); const c = td(texto, "vazio"); c.colSpan = cols; tr.append(c); return tr; };

  function desenhaOperadores(lista) {
    const ops = [...new Set(lista.map(a => a.operador))].map(op => ({ op, ...resumo(lista.filter(a => a.operador === op)) }))
      .sort((a, b) => b.n - a.n || b.media - a.media);
    $("ops").replaceChildren(...(ops.length ? ops.map(o => {
      const tr = document.createElement("tr");
      const c = document.createElement("td");
      const w = document.createElement("span"); w.className = "csat";
      const bar = document.createElement("span"); bar.className = "bar";
      const fill = document.createElement("i");
      fill.style.width = `${o.csat}%`;
      fill.style.background = o.csat >= 80 ? "var(--ok)" : "var(--pend)";
      bar.append(fill);
      const v = document.createElement("span"); v.textContent = pct(o.csat);
      w.append(bar, v); c.append(w);
      tr.append(td(o.op, "esq"), td(int(o.n)), td(dec(o.media)), c, td(pct(o.nota5), "larga"), td(int(o.baixas), "larga"));
      return tr;
    }) : [vazio(6, "Nenhuma avaliação no filtro.")]));
  }

  function linhaAvaliacao(a) {
    const tr = document.createElement("tr");
    const conv = document.createElement("td"); conv.className = "esq";
    if (a.link) {
      const l = document.createElement("a");
      l.href = a.link; l.target = "_blank"; l.rel = "noopener"; l.textContent = a.conversa;
      conv.append(l);
    } else conv.textContent = a.conversa;
    const nota = document.createElement("td");
    const chip = document.createElement("span"); chip.className = `chip n${a.nota}`; chip.textContent = a.nota;
    nota.append(chip);
    tr.append(conv, td(`${diaLongo(a.dia)} ${a.hora}`, "esq"), td(a.operador, "esq"), td(a.contato, "esq contato"), nota);
    return tr;
  }

  function desenhaLista(tbody, lista, textoVazio) {
    const ord = [...lista].sort((a, b) => (b.dia + b.hora).localeCompare(a.dia + a.hora));
    tbody.replaceChildren(...(ord.length ? ord.map(linhaAvaliacao) : [vazio(5, textoVazio)]));
  }

  function desenhaTodas() {
    const q = $("busca").value.trim().toLowerCase();
    desenhaLista($("todas"), filtradas().filter(a => !q || `${a.operador} ${a.contato}`.toLowerCase().includes(q)), "Nenhuma avaliação encontrada.");
  }

  function confirmando(sim) {
    $("btn-limpar").hidden = sim;
    $("btn-confirmar").hidden = !sim;
    $("btn-cancelar").hidden = !sim;
  }

  $("arquivo").addEventListener("change", e => { if (e.target.files.length) substitui([...e.target.files]); e.target.value = ""; });
  const drop = $("drop");
  ["dragenter", "dragover"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add("ativo"); }));
  ["dragleave", "drop"].forEach(t => drop.addEventListener(t, () => drop.classList.remove("ativo")));
  drop.addEventListener("drop", e => { e.preventDefault(); if (e.dataTransfer.files.length) substitui([...e.dataTransfer.files]); });
  $("mes").addEventListener("change", desenha);
  $("operador").addEventListener("change", desenha);
  $("busca").addEventListener("input", desenhaTodas);
  $("btn-limpar").addEventListener("click", () => confirmando(true));
  $("btn-cancelar").addEventListener("click", () => confirmando(false));
  $("btn-confirmar").addEventListener("click", () => {
    avaliacoes = []; arquivos = []; em = "";
    try { localStorage.removeItem(CHAVE); } catch (e) { /* nada guardado */ }
    confirmando(false);
    montaFiltros(false);
    mensagem("Avaliações apagadas deste navegador.");
    desenha();
  });
  let largura = window.innerWidth;
  window.addEventListener("resize", () => {
    if (window.innerWidth === largura) return;
    largura = window.innerWidth;
    desenhaDias(filtradas());
  });

  montaFiltros(false);
  desenha();
})();
