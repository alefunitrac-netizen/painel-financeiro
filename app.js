// Painel financeiro: site e app (PWA). Os dados vêm da API no Supabase; nada fica guardado aqui
// além da chave da sessão, que o link do bot cria.
const API = "https://henuvivpnmisntwvgjbu.supabase.co/functions/v1/painel-api";
const CHAVE_SESSAO = "painel.sessao";
const app = document.getElementById("app");

// ---------- Utilidades ----------
const guardar = {
  ler: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  gravar: (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } },
  apagar: (k) => { try { localStorage.removeItem(k); } catch { /* sem armazenamento */ } },
};
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const reais = (c, sinal = false) => {
  if (c === null || c === undefined) return "—";
  const v = (Math.abs(c) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${c < 0 ? "-" : sinal && c > 0 ? "+" : ""}R$ ${v}`;
};
const reaisCurto = (c) => {
  if (c === null || c === undefined) return "—";
  const r = Math.abs(c) / 100;
  const v = r >= 10000 ? `${(r / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : r.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  return `${c < 0 ? "-" : ""}R$ ${v}`;
};
/** "1.234,56" / "1234.5" / "R$ 80" → centavos (ou null). */
function lerReais(texto) {
  let s = String(texto ?? "").replace(/R\$|\s/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
const paraCampo = (c) => (c ? (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
const pct = (v) => `${String(Math.round(v * 10) / 10).replace(".", ",")}%`;
const dataCurta = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const rotuloMes = (iso) => `${MESES_CURTOS[Number(iso.slice(5, 7)) - 1]}/${iso.slice(2, 4)}`;

function toast(texto) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = texto;
  document.body.append(t);
  setTimeout(() => t.remove(), 2800);
}

// ---------- API ----------
class SemSessao extends Error {}
async function api(caminho, { metodo = "GET", corpo } = {}) {
  const sessao = guardar.ler(CHAVE_SESSAO);
  const r = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { ...(sessao ? { Authorization: `Bearer ${sessao}` } : {}), ...(corpo ? { "Content-Type": "application/json" } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const json = await r.json().catch(() => ({}));
  if (r.status === 401 && caminho !== "/entrar") {
    guardar.apagar(CHAVE_SESSAO);
    throw new SemSessao(json.erro || "sessão expirada");
  }
  if (!r.ok) throw new Error(json.erro || `erro ${r.status}`);
  return json;
}

// ---------- Ícones ----------
const I = {
  visao: '<path d="M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
  renda: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
  metas: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  lista: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  sair: '<path d="M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
  esq: '<path d="M15 18l-6-6 6-6"/>',
  dir: '<path d="M9 6l6 6-6 6"/>',
  atualizar: '<path d="M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5"/>',
  lixo: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  sobe: '<path d="M7 17L17 7M9 7h8v8"/>',
  desce: '<path d="M7 7l10 10M17 9v8H9"/>',
};
const icone = (n, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${I[n]}</svg>`;

const CORES = ["#1d5cff", "#12a150", "#f08c00", "#e5484d", "#8e4ec6", "#0ea5b7", "#d6409f", "#94a3b8"];
const EMOJI_CAT = {
  "Alimentação": "🍽️", "Mercado": "🛒", "Transporte": "🚗", "Moradia": "🏠", "Contas da casa": "💡", "Saúde": "💊",
  "Educação": "📚", "Lazer": "🎉", "Compras": "🛍️", "Assinaturas": "📺", "Pets": "🐾", "Viagem": "✈️",
  "Impostos e taxas": "🧾", "Presentes e doações": "🎁", "Salário": "💼", "Renda extra": "💸", "Reembolso": "↩️", "Rendimentos": "📈",
};
const TIPOS_FIXA = {
  luz: ["Luz", "💡"], agua: ["Água", "💧"], internet: ["Internet", "🌐"], telefone: ["Telefone", "📱"],
  assinatura: ["Assinatura", "📺"], moradia: ["Moradia", "🏠"], outro: ["Outra", "📌"],
};

// ---------- Gráficos (SVG) ----------
function graficoGastos(g) {
  const L = 320, A = 120;
  const max = Math.max(g.limite ?? 0, g.curva.at(-1) ?? 0, 1) * 1.12;
  const x = (i) => (i / Math.max(g.diasNoMes - 1, 1)) * L;
  const y = (v) => A - (v / max) * A;
  const pts = g.curva.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const ultimo = g.curva.length - 1;
  const ideal = g.limite ? `<line x1="0" y1="${A}" x2="${L}" y2="${y(g.limite)}" stroke="var(--texto-3)" stroke-dasharray="4 5" stroke-width="1.5"/>` : "";
  const area = pts.length ? `<path d="M0,${A} L${pts.join(" L")} L${x(ultimo)},${A} Z" fill="url(#gradG)"/>` : "";
  const linha = pts.length ? `<polyline points="${pts.join(" ")}" fill="none" stroke="url(#linhaG)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : "";
  const ponto = pts.length ? `<circle cx="${x(ultimo)}" cy="${y(g.curva[ultimo])}" r="5" fill="var(--cartao)" stroke="var(--verde)" stroke-width="2.5"/>` : "";
  return `<svg viewBox="-6 -8 ${L + 12} ${A + 16}" width="100%" height="150" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="gradG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--verde)" stop-opacity=".22"/><stop offset="1" stop-color="var(--verde)" stop-opacity="0"/></linearGradient>
      <linearGradient id="linhaG" x1="0" x2="1"><stop offset="0" stop-color="var(--verde)"/><stop offset=".7" stop-color="var(--laranja)"/><stop offset="1" stop-color="var(--vermelho)"/></linearGradient>
    </defs>${ideal}${area}${linha}${ponto}</svg>`;
}

function rosca(itens, total, tamanho = 200) {
  const r = 80, c = 2 * Math.PI * r;
  let acumulado = 0;
  const arcos = itens.map((it, i) => {
    const fatia = total ? it.totalCentavos / total : 0;
    const traco = Math.max(0, fatia * c - 3);
    const s = `<circle r="${r}" cx="100" cy="100" fill="none" stroke="${CORES[i % CORES.length]}" stroke-width="22"
      stroke-dasharray="${traco} ${c - traco}" stroke-dashoffset="${-acumulado * c}" transform="rotate(-90 100 100)"/>`;
    acumulado += fatia;
    return s;
  }).join("");
  return `<svg viewBox="0 0 200 200" width="${tamanho}" height="${tamanho}" role="img" aria-label="Distribuição de gastos">
    <circle r="${r}" cx="100" cy="100" fill="none" stroke="var(--fundo)" stroke-width="22"/>${arcos}
    <text x="100" y="94" text-anchor="middle" fill="var(--texto-2)" font-size="13">Gasto total</text>
    <text x="100" y="120" text-anchor="middle" fill="var(--texto)" font-size="22" font-weight="700">${esc(reaisCurto(total))}</text></svg>`;
}

function anel(fracao, cor = "var(--verde)") {
  const r = 46, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, fracao));
  return `<svg viewBox="0 0 110 110" width="110" height="110" aria-hidden="true">
    <circle r="${r}" cx="55" cy="55" fill="none" stroke="var(--fundo)" stroke-width="11"/>
    <circle r="${r}" cx="55" cy="55" fill="none" stroke="${cor}" stroke-width="11" stroke-linecap="round"
      stroke-dasharray="${f * c} ${c}" transform="rotate(-90 55 55)"/>
    <text x="55" y="61" text-anchor="middle" fill="var(--texto)" font-size="20" font-weight="700">${Math.round(f * 100)}%</text></svg>`;
}

function linhaSimples(valores, cor = "var(--azul)") {
  if (!valores.length) return "";
  const L = 320, A = 90, max = Math.max(...valores, 1), min = Math.min(0, ...valores);
  const x = (i) => (i / Math.max(valores.length - 1, 1)) * L;
  const y = (v) => A - ((v - min) / (max - min || 1)) * A;
  const pts = valores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return `<svg viewBox="-4 -6 ${L + 8} ${A + 12}" width="100%" height="110" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="gradL" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${cor}" stop-opacity=".2"/><stop offset="1" stop-color="${cor}" stop-opacity="0"/></linearGradient></defs>
    <path d="M0,${A} L${pts.replaceAll(" ", " L")} L${L},${A} Z" fill="url(#gradL)"/>
    <polyline points="${pts}" fill="none" stroke="${cor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// ---------- Estado e navegação ----------
const estado = { mes: null, dados: null, rota: "visao" };
const ROTAS = {
  visao: ["Visão geral", "visao"],
  renda: ["Renda e contas fixas", "renda"],
  metas: ["Meta de investimento", "metas"],
  lancamentos: ["Lançamentos", "lista"],
};

function navegar() {
  const r = location.hash.replace(/^#\/?/, "").split("?")[0];
  estado.rota = ROTAS[r] ? r : "visao";
  desenhar();
}

function itensNav(classe = "") {
  return Object.entries(ROTAS).map(([id, [nome, ic]]) =>
    `<a class="nav-item ${classe} ${estado.rota === id ? "ativo" : ""}" href="#/${id}">${icone(ic)}<span>${nome.split(" ")[0] === "Meta" ? "Metas" : nome.split(" ")[0]}</span></a>`
  ).join("");
}

function moldura(conteudo) {
  const d = estado.dados;
  const [titulo] = ROTAS[estado.rota];
  const mostraMes = estado.rota === "visao" || estado.rota === "lancamentos";
  return `<div class="layout">
    <aside class="lateral">
      <div class="marca"><img src="icone.svg" alt=""><span>Finanças</span></div>
      <div class="grupo">Principal</div>
      ${itensNav()}
      <div class="rodape">
        <button class="nav-item" data-acao="sair">${icone("sair")}<span>Sair deste aparelho</span></button>
      </div>
    </aside>
    <main class="conteudo">
      <div class="topo">
        <h1>${esc(titulo)}</h1>
        <div class="espaco"></div>
        ${mostraMes ? `<div class="seletor-mes">
          <button class="botao-icone" data-acao="mes-anterior" aria-label="Mês anterior">${icone("esq")}</button>
          <span>${esc(d.rotuloMes)}</span>
          <button class="botao-icone" data-acao="mes-seguinte" aria-label="Próximo mês" ${d.mesAtual ? "disabled" : ""}>${icone("dir")}</button>
        </div>` : ""}
        <button class="botao-icone" data-acao="atualizar" aria-label="Atualizar">${icone("atualizar")}</button>
      </div>
      ${conteudo}
    </main>
    <nav class="abas-celular">${itensNav()}</nav>
  </div>`;
}

// ---------- Telas ----------
function telaVisao(d) {
  const g = d.gastos;
  const hojeIdx = g.curva.length - 1;
  const idealHoje = g.limite ? Math.round((g.limite * (hojeIdx + 1)) / g.diasNoMes) : null;
  const folga = idealHoje !== null && hojeIdx >= 0 ? idealHoje - g.curva[hojeIdx] : null;
  const totalCat = d.categorias.reduce((s, c) => s + c.totalCentavos, 0);
  const topo = d.categorias.slice(0, 6);
  const resto = d.categorias.slice(6).reduce((s, c) => s + c.totalCentavos, 0);
  const listaCat = resto ? [...topo, { categoria: "Demais", totalCentavos: resto }] : topo;
  const v = d.resultado.variacaoSaidas;
  const inv = d.investimento;
  const proximasFixas = d.fixas.itens.slice(0, 4);

  return `<div class="grade">
    <section class="cartao destaque c5">
      <div class="corpo">
        <h2>Gastos no mês</h2>
        <div><span class="valor-grande">${reais(g.total)}</span> ${g.limite ? `<span class="de">/ ${reais(g.limite)}</span>` : ""}</div>
        ${folga !== null && d.mesAtual ? `<div style="margin-top:8px"><span class="pilula ${folga >= 0 ? "verde" : "vermelha"}">${reais(Math.abs(folga))} ${folga >= 0 ? "abaixo" : "acima"} do ritmo</span></div>` : ""}
        ${graficoGastos(g)}
        ${g.limite && g.total > g.limite ? `<div class="sub" style="font-size:14px">Você passou <b class="vermelho-txt">${reais(g.total - g.limite)}</b> do limite deste mês. Evite gastos fora do essencial até o mês virar.</div>`
          : g.porDia !== null ? `<div class="sub" style="font-size:14px">Mantenha os gastos em até <b style="color:var(--texto)">${reais(g.porDia)}</b> por dia até o fim do mês</div>`
          : !g.limite ? `<div class="sub">Informe sua renda em <a href="#/renda">Renda</a> para ver seu limite do mês.</div>` : ""}
      </div>
      <div class="faixa">Limite = renda líquida − meta de investimento</div>
    </section>

    <section class="cartao c7">
      <h2>Distribuição de gastos</h2>
      ${totalCat ? `<div class="rosca">${rosca(listaCat, totalCat)}<div class="lista">
        ${listaCat.map((c, i) => `<div class="linha">
          <span class="icone-cat" style="background:${CORES[i % CORES.length]}1a">${EMOJI_CAT[c.categoria] ?? "•"}</span>
          <span class="nome">${esc(c.categoria)}</span>
          <span class="pilula">${pct((c.totalCentavos / totalCat) * 100)}</span>
          <span class="valor">${reais(c.totalCentavos)}</span></div>`).join("")}
      </div></div>` : `<div class="vazio">Nenhum gasto neste mês.</div>`}
    </section>

    <section class="cartao c4">
      <h2>Resultado do mês</h2>
      <div><span class="valor-medio ${d.resultado.saldo < 0 ? "vermelho-txt" : ""}">${reais(d.resultado.saldo)}</span>
        ${v !== null ? `<span class="pilula ${v > 0 ? "vermelha" : "verde"}" style="margin-left:6px">${v > 0 ? "↑" : "↓"} ${pct(Math.abs(v))} gastos</span>` : ""}</div>
      <div class="sub" style="margin:4px 0 16px">vs ${reais(d.resultado.saidasAnterior)} gastos no mês anterior</div>
      <div class="dois">
        <div><div class="mini-rotulo"><span class="verde-txt">▼</span> Entradas</div><div class="mini-valor">${reais(d.resultado.entradas)}</div></div>
        <div><div class="mini-rotulo"><span class="vermelho-txt">▲</span> Saídas</div><div class="mini-valor">${reais(d.resultado.saidas)}</div></div>
      </div>
    </section>

    <section class="cartao c4">
      <h2>Renda líquida <a class="acao" href="#/renda">Editar</a></h2>
      ${d.renda.liquido !== null ? `<div class="valor-medio">${reais(d.renda.liquido)}</div>
        ${d.renda.holerite ? `<div class="sub" style="margin:4px 0 14px">${reais(d.renda.holerite.bruto)} bruto − ${reais(d.renda.holerite.totalDescontos)} de descontos</div>
          <div class="barra"><i style="width:${(d.renda.holerite.liquido / d.renda.holerite.bruto) * 100}%;background:var(--verde)"></i></div>
          <div class="sub" style="margin-top:6px">Você recebe ${pct((d.renda.holerite.liquido / d.renda.holerite.bruto) * 100)} do bruto</div>`
          : `<div class="sub" style="margin-top:4px">${d.renda.origem === "estimada" ? "Estimada pelo que entrou na conta." : "Informada no bot."} <a href="#/renda">Monte seu holerite</a> para ver os descontos.</div>`}`
        : `<div class="vazio"><a href="#/renda">Informe seu salário</a></div>`}
    </section>

    <section class="cartao c4">
      <h2>Meta de investimento <a class="acao" href="#/metas">Ver</a></h2>
      ${inv.metaMensal !== null ? `<div style="display:flex;align-items:center;gap:16px">
        ${anel(inv.metaMensal ? inv.aportadoMes / inv.metaMensal : 0)}
        <div><div class="sub">${pct(inv.percentual)} da renda por mês</div>
          <div class="valor-medio">${reais(inv.aportadoMes)}</div>
          <div class="sub">de ${reais(inv.metaMensal)} ${inv.faltaMes ? `· faltam ${reais(inv.faltaMes)}` : "· meta batida 🎉"}</div></div></div>`
        : `<div class="vazio"><a href="#/renda">Informe sua renda</a> para calcular a meta.</div>`}
    </section>

    <section class="cartao c6">
      <h2>Despesas fixas <a class="acao" href="#/renda">Gerenciar</a></h2>
      ${d.fixas.itens.length ? `<div style="margin-bottom:6px"><span class="valor-medio">${reais(d.fixas.total)}</span>
        <span class="sub">/mês${d.fixas.fatiaDaRenda !== null ? ` · ${pct(d.fixas.fatiaDaRenda)} da renda` : ""}</span></div>
        ${proximasFixas.map((f) => `<div class="linha"><span class="icone-cat" style="background:var(--fundo)">${TIPOS_FIXA[f.tipo]?.[1] ?? "📌"}</span>
          <span class="nome">${esc(f.nome)}</span><span class="sub">${f.proximoVencimento ? dataCurta(f.proximoVencimento) : ""}</span>
          <span class="valor">${reais(f.valorCentavos)}</span></div>`).join("")}`
        : `<div class="vazio">Cadastre luz, água, internet, telefone e assinaturas em <a href="#/renda">Renda e contas fixas</a>.</div>`}
    </section>

    <section class="cartao c6">
      <h2>Faturas e previsão</h2>
      ${d.faturas.itens.length ? `<div style="margin-bottom:6px"><span class="valor-medio">${reais(d.faturas.total)}</span> <span class="sub">a pagar</span></div>
        ${d.faturas.itens.map((f) => `<div class="linha"><span class="icone-cat" style="background:var(--azul-claro)">💳</span>
          <span class="nome">${esc(f.conta)}${f.informada ? "" : ' <span class="sub">(compras até agora)</span>'}</span>
          <span class="sub">${f.vencimento ? dataCurta(f.vencimento) : "—"}</span><span class="valor">${reais(f.totalCentavos)}</span></div>`).join("")}`
        : `<div class="sub">Nenhuma fatura em aberto.</div>`}
      ${d.previsao.meses.length && d.previsao.meses[0].sobra !== null ? `<div style="margin-top:14px" class="dois">
        ${d.previsao.meses.slice(0, 2).map((m) => `<div><div class="mini-rotulo">Sobra prevista ${rotuloMes(m.mes)}</div>
          <div class="mini-valor ${m.sobra < 0 ? "vermelho-txt" : "verde-txt"}">${reais(m.sobra)}</div></div>`).join("")}</div>` : ""}
    </section>
  </div>`;
}

function telaRenda(d) {
  const cfg = estado.formRenda ??= structuredClone(d.renda.config ?? {
    regime: "clt", brutoCentavos: 0, dependentes: 0, descontos: [], inssManual: null, irrfManual: null, metaPercentual: 10,
  });
  const h = estado.holerite ?? d.renda.holerite;
  const tipos = Object.entries(TIPOS_FIXA).map(([k, [n, e]]) => `<option value="${k}">${e} ${n}</option>`).join("");
  const somaTipo = Object.entries(d.fixas.porTipo);
  return `<div class="grade">
    <section class="cartao c7">
      <h2>Salário e descontos</h2>
      <div class="campo"><label>Tipo de renda</label>
        <div class="alternar" role="group">
          <button data-regime="clt" class="${cfg.regime === "clt" ? "ativo" : ""}">CLT (calcular INSS e IR)</button>
          <button data-regime="manual" class="${cfg.regime === "manual" ? "ativo" : ""}">Digitar à mão</button>
        </div></div>
      <div class="dois">
        <div class="campo"><label for="bruto">Salário bruto</label><input class="entrada" id="bruto" inputmode="decimal" placeholder="0,00" value="${paraCampo(cfg.brutoCentavos)}"></div>
        ${cfg.regime === "clt" ? `<div class="campo"><label for="dep">Dependentes</label><input class="entrada" id="dep" type="number" min="0" max="20" value="${cfg.dependentes}"></div>` : "<div></div>"}
        <div class="campo"><label for="inss">INSS ${cfg.regime === "clt" ? '<span class="sub">(vazio = calcular)</span>' : ""}</label><input class="entrada" id="inss" inputmode="decimal" placeholder="${cfg.regime === "clt" ? "automático" : "0,00"}" value="${paraCampo(cfg.inssManual)}"></div>
        <div class="campo"><label for="irrf">Imposto de renda ${cfg.regime === "clt" ? '<span class="sub">(vazio = calcular)</span>' : ""}</label><input class="entrada" id="irrf" inputmode="decimal" placeholder="${cfg.regime === "clt" ? "automático" : "0,00"}" value="${paraCampo(cfg.irrfManual)}"></div>
      </div>
      <div class="campo"><label>Outros descontos do contracheque</label>
        <div id="descontos">${cfg.descontos.map((x, i) => `<div class="form-linha" style="grid-template-columns:2fr 1fr auto;margin-bottom:8px">
          <input class="entrada" data-desc-nome="${i}" value="${esc(x.nome)}" placeholder="Ex.: Vale-transporte">
          <input class="entrada" data-desc-valor="${i}" inputmode="decimal" value="${paraCampo(x.valorCentavos)}" placeholder="0,00">
          <button class="botao-icone" data-remover-desc="${i}" aria-label="Remover">${icone("lixo")}</button></div>`).join("")}</div>
        <div><button class="botao secundario" data-acao="add-desconto">${icone("mais", 'width="16" height="16"')} Desconto</button></div>
      </div>
      <div class="sub" style="margin-bottom:14px">Tabelas de 2026 (INSS progressivo; IR isento até R$ 5.000 com redução até R$ 7.350). Se o contracheque mostrar outro valor, digite-o no campo.</div>
      <button class="botao" data-acao="salvar-renda">Salvar salário</button>
    </section>

    <section class="cartao c5 holerite">
      <h2>Quanto você recebe</h2>
      ${h ? `<div class="linha"><span class="nome">Salário bruto</span><span class="valor">${reais(h.bruto)}</span></div>
        <div class="linha"><span class="nome">INSS</span><span class="valor neg">−${reais(h.inss)}</span></div>
        <div class="linha"><span class="nome">Imposto de renda</span><span class="valor neg">−${reais(h.irrf)}</span></div>
        ${h.outros.map((o) => `<div class="linha"><span class="nome">${esc(o.nome)}</span><span class="valor neg">−${reais(o.valorCentavos)}</span></div>`).join("")}
        <div class="linha total"><span class="nome"><b>Líquido</b></span><span class="valor verde-txt">${reais(h.liquido)}</span></div>
        <div class="sub" style="margin-top:8px">${h.bruto ? `Descontos: ${pct((h.totalDescontos / h.bruto) * 100)} do bruto · ` : ""}${h.origemImpostos === "calculado" ? "INSS e IR calculados" : "valores do contracheque"}</div>`
        : `<div class="vazio">Digite o salário bruto para ver o líquido.</div>`}
    </section>

    <section class="cartao c12">
      <h2>Calculadora de despesas fixas</h2>
      <div class="form-linha">
        <div class="campo largo" style="margin:0"><label for="fx-nome">Nome</label><input class="entrada" id="fx-nome" placeholder="Ex.: Conta de luz"></div>
        <div class="campo" style="margin:0"><label for="fx-tipo">Tipo</label><select class="entrada" id="fx-tipo">${tipos}</select></div>
        <div class="campo" style="margin:0"><label for="fx-valor">Valor por mês</label><input class="entrada" id="fx-valor" inputmode="decimal" placeholder="0,00"></div>
        <div class="campo" style="margin:0"><label for="fx-dia">Vence dia</label><input class="entrada" id="fx-dia" type="number" min="1" max="31" placeholder="10"></div>
        <button class="botao" data-acao="add-fixa">${icone("mais", 'width="16" height="16"')} Adicionar</button>
      </div>
      <div style="margin-top:16px">
        ${d.fixas.itens.length ? d.fixas.itens.map((f) => `<div class="linha">
          <span class="icone-cat" style="background:var(--fundo)">${TIPOS_FIXA[f.tipo]?.[1] ?? "📌"}</span>
          <span class="nome">${esc(f.nome)} <span class="sub">· ${TIPOS_FIXA[f.tipo]?.[0] ?? ""}${f.diaVencimento ? ` · vence dia ${f.diaVencimento}` : ""}</span></span>
          <span class="valor">${reais(f.valorCentavos)}</span>
          <button class="botao-icone" data-remover-fixa="${f.id}" aria-label="Remover ${esc(f.nome)}">${icone("lixo")}</button></div>`).join("")
          : `<div class="vazio">Nenhuma despesa fixa ainda.</div>`}
      </div>
      ${d.fixas.itens.length ? `<div class="dois" style="margin-top:16px">
        <div><div class="mini-rotulo">Total por mês</div><div class="valor-medio">${reais(d.fixas.total)}</div>
          ${d.fixas.fatiaDaRenda !== null ? `<div class="sub">${pct(d.fixas.fatiaDaRenda)} da renda líquida · sobram ${reais(d.renda.liquido - d.fixas.total)}</div>` : ""}</div>
        <div>${somaTipo.map(([t, v]) => `<div class="mini-rotulo" style="justify-content:space-between"><span>${TIPOS_FIXA[t]?.[1] ?? ""} ${TIPOS_FIXA[t]?.[0] ?? t}</span><b>${reais(v)}</b></div>
          <div class="barra" style="margin:4px 0 8px"><i style="width:${(v / d.fixas.total) * 100}%"></i></div>`).join("")}</div>
      </div>` : ""}
    </section>
  </div>`;
}

function telaMetas(d) {
  const inv = d.investimento;
  const percentual = estado.metaPercentual ?? inv.percentual;
  const liquido = d.renda.liquido;
  const valorMeta = liquido !== null ? Math.round((liquido * percentual) / 100) : null;
  const hoje = d.hoje;
  return `<div class="grade">
    <section class="cartao c6">
      <h2>Quanto investir por mês</h2>
      ${liquido !== null ? `<div class="valor-grande" id="meta-valor">${reais(valorMeta)}</div>
        <div class="sub" style="margin:4px 0 16px"><b id="meta-pct-txt">${pct(percentual)}</b> da renda líquida de ${reais(liquido)}</div>
        <input type="range" id="meta-pct" min="0" max="50" step="1" value="${percentual}" aria-label="Percentual da renda">
        <div class="sub" style="display:flex;justify-content:space-between;margin:4px 0 14px"><span>0%</span><span>10% é um bom começo · 20% acelera</span><span>50%</span></div>
        <button class="botao" data-acao="salvar-meta">Salvar meta</button>`
        : `<div class="aviso">Para calcular a meta, informe seu salário em <a href="#/renda">Renda</a>.</div>`}
    </section>

    <section class="cartao c6">
      <h2>Este mês</h2>
      ${inv.metaMensal !== null ? `<div style="display:flex;align-items:center;gap:18px">${anel(inv.metaMensal ? inv.aportadoMes / inv.metaMensal : 0)}
        <div><div class="valor-medio">${reais(inv.aportadoMes)}</div><div class="sub">guardado de ${reais(inv.metaMensal)}</div>
        <div style="margin-top:6px">${inv.faltaMes ? `<span class="pilula laranja">faltam ${reais(inv.faltaMes)}</span>` : '<span class="pilula verde">meta batida</span>'}</div></div></div>` : ""}
      <div class="form-linha" style="grid-template-columns:1fr 1.4fr 1fr auto;margin-top:16px">
        <div class="campo" style="margin:0"><label for="ap-valor">Guardei</label><input class="entrada" id="ap-valor" inputmode="decimal" placeholder="0,00"></div>
        <div class="campo" style="margin:0"><label for="ap-desc">Onde</label><input class="entrada" id="ap-desc" placeholder="Ex.: CDB, Tesouro"></div>
        <div class="campo" style="margin:0"><label for="ap-data">Data</label><input class="entrada" id="ap-data" type="date" value="${hoje}"></div>
        <button class="botao" data-acao="add-aporte">${icone("mais", 'width="16" height="16"')}</button>
      </div>
    </section>

    <section class="cartao c7">
      <h2>Se você mantiver a meta por 12 meses</h2>
      ${inv.projecao12.length ? `<div class="valor-medio">${reais(inv.projecao12.at(-1))}</div>
        <div class="sub">Aportando ${reais(inv.metaMensal)} por mês, rendendo cerca de 0,8% ao mês, a partir do que você já guardou (${reais(inv.acumulado)}).</div>
        ${linhaSimples(inv.projecao12, "var(--verde)")}` : `<div class="vazio">Defina a meta para ver a projeção.</div>`}
    </section>

    <section class="cartao c5">
      <h2>Últimos aportes</h2>
      ${inv.aportes.length ? inv.aportes.map((a) => `<div class="linha"><span class="icone-cat" style="background:var(--verde-claro)">📈</span>
        <span class="nome">${esc(a.descricao ?? "Aporte")} <span class="sub">· ${dataCurta(a.data)}</span></span>
        <span class="valor">${reais(a.valorCentavos)}</span>
        <button class="botao-icone" data-remover-aporte="${a.id}" aria-label="Remover">${icone("lixo")}</button></div>`).join("")
        : `<div class="vazio">Registre aqui o que você guardar ou investir.</div>`}
    </section>
  </div>`;
}

function telaLancamentos(d) {
  const filtro = estado.filtro ?? "todos";
  const busca = (estado.busca ?? "").toLowerCase();
  const itens = d.lancamentos.filter((l) =>
    (filtro === "todos" || l.tipo === filtro) && (!busca || `${l.descricao} ${l.categoria ?? ""} ${l.conta ?? ""}`.toLowerCase().includes(busca))
  );
  return `<section class="cartao">
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">
      <div class="alternar" role="group">${[["todos", "Todos"], ["despesa", "Saídas"], ["receita", "Entradas"]]
        .map(([k, n]) => `<button data-filtro="${k}" class="${filtro === k ? "ativo" : ""}">${n}</button>`).join("")}</div>
      <input class="entrada" id="busca" placeholder="Buscar" value="${esc(estado.busca ?? "")}" style="max-width:260px">
    </div>
    ${itens.length ? itens.map((l) => `<div class="linha">
      <span class="icone-cat" style="background:var(--fundo)">${EMOJI_CAT[l.categoria] ?? (l.tipo === "receita" ? "💰" : "•")}</span>
      <span class="nome">${esc(l.descricao)} <span class="sub">· ${esc(l.categoria ?? "Sem categoria")}${l.conta ? ` · ${esc(l.conta)}` : ""}</span></span>
      <span class="sub">${dataCurta(l.data)}</span>
      <span class="valor ${l.tipo === "receita" ? "verde-txt" : ""}">${l.tipo === "receita" ? "+" : ""}${reais(l.valorCentavos)}</span></div>`).join("")
      : `<div class="vazio">Nada por aqui.</div>`}
    <div class="sub" style="margin-top:10px">Mostrando os 40 maiores e mais recentes do mês. Para lançar, use o bot no Telegram.</div>
  </section>`;
}

// ---------- Desenho e ações ----------
function desenhar() {
  if (!estado.dados) return;
  const telas = { visao: telaVisao, renda: telaRenda, metas: telaMetas, lancamentos: telaLancamentos };
  app.className = "";
  app.innerHTML = moldura(telas[estado.rota](estado.dados));
}

async function carregar() {
  try {
    estado.dados = await api(`/resumo${estado.mes ? `?mes=${estado.mes}` : ""}`);
    desenhar();
  } catch (e) {
    if (e instanceof SemSessao) return telaEntrada(e.message);
    app.innerHTML = `<div class="tela-cheia"><div class="entrar"><h1>Não consegui carregar</h1><p>${esc(e.message)}</p>
      <button class="botao" data-acao="atualizar">Tentar de novo</button></div></div>`;
  }
}

function telaEntrada(motivo = "") {
  app.className = "";
  app.innerHTML = `<div class="tela-cheia"><div class="entrar cartao" style="padding:32px">
    <img src="icone.svg" alt="">
    <h1>Seu painel financeiro</h1>
    <p>Para entrar, mande <b>painel</b> para o seu bot no Telegram e toque no link que ele responder.</p>
    ${motivo ? `<p class="sub">${esc(motivo)}</p>` : ""}
    <p class="sub">O link vale 15 minutos e só funciona uma vez. Este aparelho fica conectado por 90 dias.</p>
  </div></div>`;
}

function mesDeslocado(delta) {
  const base = estado.dados.mes; // AAAA-MM-01
  const d = new Date(Date.UTC(Number(base.slice(0, 4)), Number(base.slice(5, 7)) - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lerFormRenda() {
  const f = estado.formRenda;
  const val = (id) => document.getElementById(id)?.value;
  f.brutoCentavos = lerReais(val("bruto")) ?? 0;
  if (document.getElementById("dep")) f.dependentes = Math.max(0, Math.min(20, Number(val("dep")) || 0));
  f.inssManual = lerReais(val("inss"));
  f.irrfManual = lerReais(val("irrf"));
  f.descontos = f.descontos.map((x, i) => ({
    nome: document.querySelector(`[data-desc-nome="${i}"]`)?.value.trim() || x.nome,
    valorCentavos: lerReais(document.querySelector(`[data-desc-valor="${i}"]`)?.value) ?? 0,
  }));
  return f;
}
const corpoRenda = (f) => ({ ...f, descontos: f.descontos.filter((x) => x.nome && x.valorCentavos > 0) });

let calculando;
function recalcularRenda() {
  clearTimeout(calculando);
  calculando = setTimeout(async () => {
    const f = lerFormRenda();
    try {
      estado.holerite = (await api("/calcular-renda", { metodo: "POST", corpo: corpoRenda(f) })).holerite;
      const foco = document.activeElement?.id;
      const pos = document.activeElement?.selectionStart;
      desenhar();
      if (foco) {
        const el = document.getElementById(foco);
        el?.focus();
        try { el?.setSelectionRange(pos, pos); } catch { /* campo numérico */ }
      }
    } catch { /* valor incompleto: espera o próximo */ }
  }, 450);
}

async function acao(nome, alvo) {
  try {
    switch (nome) {
      case "atualizar": estado.formRenda = null; estado.holerite = null; return carregar();
      case "mes-anterior": estado.mes = mesDeslocado(-1); return carregar();
      case "mes-seguinte": estado.mes = mesDeslocado(1); return carregar();
      case "sair":
        if (!confirm("Sair do painel neste aparelho?")) return;
        await api("/sair", { metodo: "POST" }).catch(() => {});
        guardar.apagar(CHAVE_SESSAO);
        return telaEntrada("Você saiu deste aparelho.");
      case "add-desconto": lerFormRenda(); estado.formRenda.descontos.push({ nome: "", valorCentavos: 0 }); return desenhar();
      case "salvar-renda": {
        alvo.disabled = true;
        const r = await api("/renda", { metodo: "PUT", corpo: corpoRenda(lerFormRenda()) });
        estado.holerite = r.holerite;
        toast("Salário salvo. O bot já usa esse líquido nas simulações.");
        estado.formRenda = null;
        return carregar();
      }
      case "salvar-meta": {
        const base = estado.dados.renda.config ?? { regime: "clt", brutoCentavos: 0, dependentes: 0, descontos: [], inssManual: null, irrfManual: null };
        await api("/renda", { metodo: "PUT", corpo: { ...base, metaPercentual: estado.metaPercentual ?? estado.dados.investimento.percentual } });
        toast("Meta salva.");
        estado.metaPercentual = null;
        return carregar();
      }
      case "add-fixa": {
        const corpo = {
          nome: document.getElementById("fx-nome").value.trim(),
          tipo: document.getElementById("fx-tipo").value,
          valorCentavos: lerReais(document.getElementById("fx-valor").value),
          diaVencimento: Number(document.getElementById("fx-dia").value) || null,
        };
        if (!corpo.nome || !corpo.valorCentavos) return toast("Preencha nome e valor.");
        await api("/fixas", { metodo: "POST", corpo });
        toast(`${corpo.nome} adicionada.`);
        return carregar();
      }
      case "add-aporte": {
        const valor = lerReais(document.getElementById("ap-valor").value);
        if (!valor) return toast("Digite quanto você guardou.");
        await api("/aportes", { metodo: "POST", corpo: {
          valorCentavos: valor,
          descricao: document.getElementById("ap-desc").value.trim() || null,
          data: document.getElementById("ap-data").value || undefined,
        } });
        toast("Aporte registrado.");
        return carregar();
      }
    }
  } catch (e) {
    if (e instanceof SemSessao) return telaEntrada(e.message);
    toast(e.message);
    if (alvo) alvo.disabled = false;
  }
}

app.addEventListener("click", async (ev) => {
  const el = ev.target.closest("[data-acao],[data-regime],[data-remover-desc],[data-remover-fixa],[data-remover-aporte],[data-filtro]");
  if (!el) return;
  ev.preventDefault();
  const ds = el.dataset;
  if (ds.acao) return acao(ds.acao, el);
  if (ds.regime) { lerFormRenda(); estado.formRenda.regime = ds.regime; desenhar(); return recalcularRenda(); }
  if (ds.removerDesc) { lerFormRenda(); estado.formRenda.descontos.splice(Number(ds.removerDesc), 1); desenhar(); return recalcularRenda(); }
  if (ds.filtro) { estado.filtro = ds.filtro; return desenhar(); }
  try {
    if (ds.removerFixa && confirm("Remover esta despesa fixa?")) { await api(`/fixas/${ds.removerFixa}`, { metodo: "DELETE" }); await carregar(); }
    if (ds.removerAporte && confirm("Remover este aporte?")) { await api(`/aportes/${ds.removerAporte}`, { metodo: "DELETE" }); await carregar(); }
  } catch (e) {
    if (e instanceof SemSessao) return telaEntrada(e.message);
    toast(e.message);
  }
});

app.addEventListener("input", (ev) => {
  const t = ev.target;
  if (t.id === "meta-pct") {
    estado.metaPercentual = Number(t.value);
    const liquido = estado.dados.renda.liquido ?? 0;
    document.getElementById("meta-valor").textContent = reais(Math.round((liquido * estado.metaPercentual) / 100));
    document.getElementById("meta-pct-txt").textContent = pct(estado.metaPercentual);
    return;
  }
  if (t.id === "busca") {
    estado.busca = t.value;
    desenhar();
    const b = document.getElementById("busca");
    b?.focus();
    b?.setSelectionRange(t.value.length, t.value.length);
    return;
  }
  if (estado.rota === "renda" && (["bruto", "dep", "inss", "irrf"].includes(t.id) || t.dataset.descValor !== undefined || t.dataset.descNome !== undefined)) {
    recalcularRenda();
  }
});

// ---------- Início ----------
async function iniciar() {
  // O link do bot traz o código depois do "#": ele não vai para servidor nenhum além da nossa API.
  const codigo = /(?:^#|&)c=([A-Za-z0-9_-]{20,200})/.exec(location.hash)?.[1];
  if (codigo) {
    history.replaceState(null, "", location.pathname + "#/visao");
    try {
      const r = await api("/entrar", { metodo: "POST", corpo: { codigo } });
      guardar.gravar(CHAVE_SESSAO, r.token);
      toast(`Bem-vindo, ${r.nome}!`);
    } catch (e) {
      return telaEntrada(e.message);
    }
  }
  if (!guardar.ler(CHAVE_SESSAO)) return telaEntrada();
  window.addEventListener("hashchange", navegar);
  const r = location.hash.replace(/^#\/?/, "");
  estado.rota = ROTAS[r] ? r : "visao";
  await carregar();
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
iniciar();
