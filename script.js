// --- VARIÁVEIS GLOBAIS ---
let zIndexGlobal = 1;
let gridAtivado = false;
const TAMANHO_GRID = 50; 
let escalaWorkspace = 1; // Variável vital para o novo zoom
let panX = 0; // Posição do papel na tela
let panY = 0;

// --- CAMADA DE PERSISTÊNCIA (STORAGE SERVICE) ---
class StorageService {
    static CHAVE_ARMAZENAMENTO = 'meusBlocosSalvos';
    static salvar(dados) {
        try { localStorage.setItem(this.CHAVE_ARMAZENAMENTO, JSON.stringify(dados)); return true; } 
        catch (erro) { console.error(erro); return false; }
    }
    static carregar() {
        try { const dados = localStorage.getItem(this.CHAVE_ARMAZENAMENTO); return dados ? JSON.parse(dados) : null; } 
        catch (erro) { return null; }
    }
}

// --- ARQUITETURA DE BLOCOS (OOP) ---
class Bloco {
    constructor(dados, tipo) {
        this.tipo = tipo; this.dados = dados || {};
        this.area = document.getElementById('area-trabalho');
        this.elemento = document.createElement('div');
        this.elemento.className = 'bloco'; this.elemento.dataset.tipo = tipo;
        this.elemento.__blocoInstance = this;
        this.configurarEstilosIniciais(); this.montarHTML();
        this.aplicarEventosGerais(); this.aplicarEventosEspecificos(); this.aplicarArrastar();
        this.area.appendChild(this.elemento);
    }

    configurarEstilosIniciais() {
        this.elemento.style.top = this.dados.top || '100px'; this.elemento.style.left = this.dados.left || '100px';
        this.elemento.style.width = this.dados.width || '250px'; this.elemento.style.height = this.dados.height || '150px';
        
        if(typeof this.dados.top === 'string' && this.dados.top.includes('%')) this.elemento.style.top = (parseFloat(this.dados.top) / 100 * this.area.clientHeight) + 'px';
        if(typeof this.dados.left === 'string' && this.dados.left.includes('%')) this.elemento.style.left = (parseFloat(this.dados.left) / 100 * this.area.clientWidth) + 'px';
        if(typeof this.dados.width === 'string' && this.dados.width.includes('%')) this.elemento.style.width = (parseFloat(this.dados.width) / 100 * this.area.clientWidth) + 'px';
        if(typeof this.dados.height === 'string' && this.dados.height.includes('%')) this.elemento.style.height = (parseFloat(this.dados.height) / 100 * this.area.clientHeight) + 'px';

        this.corFundoPadrao = this.dados.fundo || '#ffffff'; 
        this.corTextoPadrao = this.dados.corTexto || '#000000'; // NOVO: Cor da fonte/pincel
        this.elemento.style.backgroundColor = this.corFundoPadrao;
        this.elemento.style.color = this.corTextoPadrao; // NOVO: Aplica a cor ao texto
        
        if (this.dados.zIndex) { this.elemento.style.zIndex = this.dados.zIndex; if (this.dados.zIndex >= zIndexGlobal) zIndexGlobal = this.dados.zIndex + 1; } 
        else { this.elemento.style.zIndex = zIndexGlobal++; }
    }

    montarHTML() {
        // Cabeçalho atualizado com as DUAS cores
        const cabecalho = `<div class="cabecalho">
                           <div class="controles-cor">
                           <input type="color" class="cor-fundo" value="${this.corFundoPadrao}" title="Cor de Fundo">
                           <input type="color" class="cor-texto" value="${this.corTextoPadrao}" title="Cor do Pincel/Texto">
                           </div><button class="btn-excluir">
                           <i class="fa-solid fa-trash">
                           </i></button></div>`;
        
        // Injeta o cabeçalho, o conteúdo do bloco e o SEU puxador antigo clássico
        this.elemento.innerHTML = cabecalho + this.getConteudoHTML() + '<div class="redimensionador"></div>';
        
        this.aplicarRedimensionamento();
    }
    getConteudoHTML() { throw new Error("A implementar nas subclasses."); }
    aplicarEventosEspecificos() {}

    aplicarEventosGerais() {
        this.elemento.addEventListener('mousedown', (e) => { if (e.target.type !== 'color' && this.elemento.style.zIndex != zIndexGlobal) this.elemento.style.zIndex = zIndexGlobal++; });
        this.elemento.querySelector('.btn-excluir').onclick = () => { this.elemento.remove(); salvarBlocos(); };
        
        const inputFundo = this.elemento.querySelector('.cor-fundo');
        const atualizarFundo = (e) => { this.elemento.style.backgroundColor = e.target.value; salvarBlocos(); };
        inputFundo.addEventListener('input', atualizarFundo); inputFundo.addEventListener('change', atualizarFundo);

        // NOVO: Escuta a mudança de cor do texto
        const inputTexto = this.elemento.querySelector('.cor-texto');
        const atualizarTexto = (e) => { this.elemento.style.color = e.target.value; salvarBlocos(); };
        inputTexto.addEventListener('input', atualizarTexto); inputTexto.addEventListener('change', atualizarTexto);
    }

    obterCoordenadas(evento) {
        if (evento.touches && evento.touches.length > 0) return { x: evento.touches[0].clientX, y: evento.touches[0].clientY };
        return { x: evento.clientX, y: evento.clientY };
    }

    aplicarArrastar() {
        const cabecalho = this.elemento.querySelector('.cabecalho');
        let inicioX, inicioY, leftInicial, topInicial;
        const iniciarArrasto = (evento) => {
            if(['INPUT', 'BUTTON', 'I'].includes(evento.target.tagName)) return;
            if (evento.type === 'touchstart') evento.preventDefault(); 
            const pos = this.obterCoordenadas(evento);
            inicioX = pos.x; inicioY = pos.y;
            leftInicial = this.elemento.offsetLeft; topInicial = this.elemento.offsetTop;
            
            const onMove = (ev) => {
                if (ev.type === 'touchmove') ev.preventDefault();
                const posAtual = this.obterCoordenadas(ev);
                
                // MÁGICA DA FÍSICA: Dividir o movimento pelo zoom para o rato não fugir do bloco
                let calcX = leftInicial + ((posAtual.x - inicioX) / escalaWorkspace);
                let calcY = topInicial + ((posAtual.y - inicioY) / escalaWorkspace);

                if (gridAtivado) { calcX = Math.round(calcX / TAMANHO_GRID) * TAMANHO_GRID; calcY = Math.round(calcY / TAMANHO_GRID) * TAMANHO_GRID; }
                const maxEsquerda = this.area.clientWidth - this.elemento.offsetWidth; const maxTopo = this.area.clientHeight - this.elemento.offsetHeight;
                this.elemento.style.left = Math.max(0, Math.min(calcX, maxEsquerda)) + 'px';
                this.elemento.style.top = Math.max(0, Math.min(calcY, maxTopo)) + 'px';
            };
            const onEnd = () => {
                document.removeEventListener('mousemove', onMove); document.removeEventListener('touchmove', onMove, { passive: false });
                document.removeEventListener('mouseup', onEnd); document.removeEventListener('touchend', onEnd);
                this.elemento.style.left = (this.elemento.offsetLeft / this.area.clientWidth) * 100 + '%';
                this.elemento.style.top = (this.elemento.offsetTop / this.area.clientHeight) * 100 + '%';
                salvarBlocos();
            };
            document.addEventListener('mousemove', onMove); document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('mouseup', onEnd); document.addEventListener('touchend', onEnd);
        };
        cabecalho.addEventListener('mousedown', iniciarArrasto); cabecalho.addEventListener('touchstart', iniciarArrasto, { passive: false });
    }

    aplicarRedimensionamento() {
        const puxador = this.elemento.querySelector('.redimensionador'); if (!puxador) return;
        let larguraInicial, alturaInicial, inicioX, inicioY;
        const iniciarRedimensionamento = (evento) => {
            if (evento.type === 'touchstart') evento.preventDefault(); evento.stopPropagation();
            const pos = this.obterCoordenadas(evento);
            inicioX = pos.x; inicioY = pos.y;
            larguraInicial = this.elemento.offsetWidth; alturaInicial = this.elemento.offsetHeight;
            const onMove = (ev) => {
                if (ev.type === 'touchmove') ev.preventDefault();
                const posAtual = this.obterCoordenadas(ev);
                let novaLargura = larguraInicial + ((posAtual.x - inicioX) / escalaWorkspace);
                let novaAltura = alturaInicial + ((posAtual.y - inicioY) / escalaWorkspace);
                if (gridAtivado) { novaLargura = Math.round(novaLargura / TAMANHO_GRID) * TAMANHO_GRID; novaAltura = Math.round(novaAltura / TAMANHO_GRID) * TAMANHO_GRID; }
                this.elemento.style.width = Math.max(150, novaLargura) + 'px'; this.elemento.style.height = Math.max(100, novaAltura) + 'px';
            };
            const onEnd = () => {
                document.removeEventListener('mousemove', onMove); document.removeEventListener('touchmove', onMove, { passive: false });
                document.removeEventListener('mouseup', onEnd); document.removeEventListener('touchend', onEnd);
                this.elemento.style.width = (this.elemento.offsetWidth / this.area.clientWidth) * 100 + '%';
                this.elemento.style.height = (this.elemento.offsetHeight / this.area.clientHeight) * 100 + '%';
                salvarBlocos();
            };
            document.addEventListener('mousemove', onMove); document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('mouseup', onEnd); document.addEventListener('touchend', onEnd);
        };
        puxador.addEventListener('mousedown', iniciarRedimensionamento); puxador.addEventListener('touchstart', iniciarRedimensionamento, { passive: false });
    }

    extrairDadosParaSalvar(larguraArea, alturaArea) {
        return {
            tipo: this.tipo, fundo: this.elemento.querySelector('.cor-fundo').value, 
            corTexto: this.elemento.querySelector('.cor-texto').value, // NOVO: Salva a cor no Banco de Dados
            zIndex: parseInt(this.elemento.style.zIndex) || 1,
            top: (this.elemento.offsetTop / alturaArea) * 100 + '%', left: (this.elemento.offsetLeft / larguraArea) * 100 + '%',
            width: (this.elemento.offsetWidth / larguraArea) * 100 + '%', height: (this.elemento.offsetHeight / alturaArea) * 100 + '%',
            ...this.extrairDadosEspecificos()
        };
    }
    extrairDadosEspecificos() { return {}; }
}

class BlocoTexto extends Bloco {
    constructor(dados) { super(dados, 'texto'); }
    getConteudoHTML() { return `<div class="texto" contenteditable="true">${this.dados.texto || ''}</div>`; }
    aplicarEventosEspecificos() { this.elemento.querySelector('.texto').addEventListener('input', salvarBlocos); }
    extrairDadosEspecificos() { return { texto: this.elemento.querySelector('.texto').innerHTML }; }
}

class BlocoTituloTexto extends Bloco {
    constructor(dados) { super(dados, 'titulo-texto'); }
    getConteudoHTML() { return `<div class="area-titulo" contenteditable="true">${this.dados.titulo || ''}</div><div class="texto" contenteditable="true">${this.dados.texto || ''}</div>`; }
    aplicarEventosEspecificos() {
        this.elemento.querySelector('.area-titulo').addEventListener('input', salvarBlocos);
        this.elemento.querySelector('.texto').addEventListener('input', salvarBlocos);
    }
    extrairDadosEspecificos() { return { titulo: this.elemento.querySelector('.area-titulo').innerHTML, texto: this.elemento.querySelector('.texto').innerHTML }; }
}

class BlocoDesenho extends Bloco {
    constructor(dados) { super(dados, 'desenho'); }
    getConteudoHTML() {
        return `<div class="ferramentas-desenho"><button class="btn-ferramenta ativo btn-lapis"><i class="fa-solid fa-pencil"></i></button><button class="btn-ferramenta btn-borracha"><i class="fa-solid fa-eraser"></i></button><button class="btn-ferramenta btn-limpar"><i class="fa-solid fa-trash-can"></i></button></div><canvas width="800" height="600" class="area-canvas"></canvas>`;
    }
    aplicarEventosEspecificos() {
        const canvas = this.elemento.querySelector('canvas'); const pincel = canvas.getContext('2d');
        let desenhando = false; let espessuraBase = 3; pincel.lineCap = 'round'; pincel.lineJoin = 'round';
        const [btnLapis, btnBorracha, btnLimpar] = [this.elemento.querySelector('.btn-lapis'), this.elemento.querySelector('.btn-borracha'), this.elemento.querySelector('.btn-limpar')];

        btnLapis.onclick = () => { pincel.globalCompositeOperation = 'source-over'; espessuraBase = 3; canvas.style.cursor = 'crosshair'; btnLapis.classList.add('ativo'); btnBorracha.classList.remove('ativo'); };
        btnBorracha.onclick = () => { pincel.globalCompositeOperation = 'destination-out'; espessuraBase = 20; btnBorracha.classList.add('ativo'); btnLapis.classList.remove('ativo'); };
        btnLimpar.onclick = () => { pincel.clearRect(0, 0, canvas.width, canvas.height); salvarBlocos(); };

        if (this.dados.desenho) { let img = new Image(); img.src = this.dados.desenho; img.onload = () => pincel.drawImage(img, 0, 0); }

        const processarDesenho = (e, acao) => {
            if (e.type.includes('touch')) e.preventDefault();
            const pos = this.obterCoordenadas(e); const rect = canvas.getBoundingClientRect();
            const x = (pos.x - rect.left) * (canvas.width / rect.width);
            const y = (pos.y - rect.top) * (canvas.height / rect.height);
            pincel.lineWidth = espessuraBase * (canvas.width / canvas.offsetWidth);
            
            // NOVO: O pincel lê a cor do cabeçalho a cada traço!
            pincel.strokeStyle = this.elemento.querySelector('.cor-texto').value; 
            
            if (acao === 'iniciar') { desenhando = true; pincel.beginPath(); pincel.moveTo(x, y); } 
            else if (acao === 'mover' && desenhando) { pincel.lineTo(x, y); pincel.stroke(); } 
            else if (acao === 'parar' && desenhando) { desenhando = false; salvarBlocos(); }
        };

        canvas.addEventListener('mousedown', (e) => processarDesenho(e, 'iniciar')); canvas.addEventListener('mousemove', (e) => processarDesenho(e, 'mover'));
        window.addEventListener('mouseup', (e) => processarDesenho(e, 'parar'));
        canvas.addEventListener('touchstart', (e) => processarDesenho(e, 'iniciar'), { passive: false }); canvas.addEventListener('touchmove', (e) => processarDesenho(e, 'mover'), { passive: false });
        window.addEventListener('touchend', (e) => processarDesenho(e, 'parar'));
    }
    extrairDadosEspecificos() { return { desenho: this.elemento.querySelector('canvas').toDataURL('image/webp', 0.5) }; }
}

class BlocoFactory {
    static criar(dados = null) {
        const tipo = dados ? dados.tipo : document.getElementById('seletor-tipo').value;
        switch(tipo) { case 'texto': return new BlocoTexto(dados); case 'titulo-texto': return new BlocoTituloTexto(dados); case 'desenho': return new BlocoDesenho(dados); default: return null; }
    }
}

// --- FUNÇÕES GERAIS E INICIALIZAÇÃO ---
function salvarBlocos() {
    const area = document.getElementById('area-trabalho');
    StorageService.salvar(Array.from(area.children).map(el => el.__blocoInstance.extrairDadosParaSalvar(area.clientWidth, area.clientHeight)));
}

function carregarBlocos() {
    const dados = StorageService.carregar();
    if (dados && Array.isArray(dados)) dados.forEach(d => BlocoFactory.criar(d));
}

function forcarSnapTodosOsBlocos() {
    const area = document.getElementById('area-trabalho');
    Array.from(area.children).forEach(el => {
        let l = Math.round(el.offsetLeft / TAMANHO_GRID) * TAMANHO_GRID; let t = Math.round(el.offsetTop / TAMANHO_GRID) * TAMANHO_GRID;
        let w = Math.round(el.offsetWidth / TAMANHO_GRID) * TAMANHO_GRID; let h = Math.round(el.offsetHeight / TAMANHO_GRID) * TAMANHO_GRID;
        el.style.left = (Math.max(0, Math.min(l, area.clientWidth - w)) / area.clientWidth) * 100 + '%';
        el.style.top = (Math.max(0, Math.min(t, area.clientHeight - h)) / area.clientHeight) * 100 + '%';
        el.style.width = (Math.max(150, w) / area.clientWidth) * 100 + '%';
        el.style.height = (Math.max(100, h) / area.clientHeight) * 100 + '%';
    });
    salvarBlocos();
}

// --- LÓGICA DE PAN E ZOOM (VIEWPORT) ---
const viewport = document.getElementById('viewport');
const area = document.getElementById('area-trabalho');

function atualizarTransform() {
    area.style.transform = `translate(${panX}px, ${panY}px) scale(${escalaWorkspace})`;
}

let isPanning = false; let startPanX, startPanY;

const iniciarPan = (e) => {
    if (e.target !== viewport && e.target !== area) return; // Só move se clicar no fundo vazio
    isPanning = true;
    const pos = (e.touches && e.touches.length > 0) ? e.touches[0] : e;
    startPanX = pos.clientX - panX; startPanY = pos.clientY - panY;
};

const moverPan = (e) => {
    if (!isPanning) return;
    const pos = (e.touches && e.touches.length > 0) ? e.touches[0] : e;
    panX = pos.clientX - startPanX; panY = pos.clientY - startPanY;
    atualizarTransform();
};

const pararPan = () => { isPanning = false; };

viewport.addEventListener('mousedown', iniciarPan); window.addEventListener('mousemove', moverPan); window.addEventListener('mouseup', pararPan);
viewport.addEventListener('touchstart', iniciarPan, { passive: true }); window.addEventListener('touchmove', moverPan, { passive: true }); window.addEventListener('touchend', pararPan);

// Zoom com Roda do Mouse
viewport.addEventListener('wheel', (e) => {
    if (e.target !== viewport && e.target !== area) return;
    e.preventDefault();
    escalaWorkspace *= e.deltaY > 0 ? 0.9 : 1.1; // 10% de zoom in/out
    escalaWorkspace = Math.max(0.2, Math.min(escalaWorkspace, 3)); // Limites de zoom
    atualizarTransform();
}, { passive: false });
// Zoom com Pinça (Touch)
let distInicial = 0;
viewport.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
        e.preventDefault(); // Bloqueia o telemóvel de tentar fazer scroll
        let dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (!distInicial) distInicial = dist;
        else {
            escalaWorkspace = Math.max(0.2, Math.min(escalaWorkspace * (dist / distInicial), 3));
            distInicial = dist;
            atualizarTransform();
        }
    }
}, { passive: false });
viewport.addEventListener('touchend', () => distInicial = 0);

// Botões de Interface
document.getElementById('btn-add')?.addEventListener('click', () => { BlocoFactory.criar(); salvarBlocos(); });
document.getElementById('btn-grid')?.addEventListener('click', (e) => {
    gridAtivado = !gridAtivado; e.currentTarget.classList.toggle('ativo', gridAtivado);
    area.classList.toggle('com-grid', gridAtivado); if (gridAtivado) forcarSnapTodosOsBlocos();
});
document.getElementById('btn-exportar')?.addEventListener('click', () => {
    salvarBlocos(); const d = localStorage.getItem(StorageService.CHAVE_ARMAZENAMENTO);
    if (!d || d === '[]') return alert("Não há blocos!");
    const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([d], { type: 'application/json' }));
    l.download = 'meus_blocos.json'; l.click(); URL.revokeObjectURL(l.href);
});
document.getElementById('btn-importar')?.addEventListener('click', () => document.getElementById('input-arquivo').click());
document.getElementById('input-arquivo')?.addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = (ev) => {
        try { area.innerHTML = ''; JSON.parse(ev.target.result).forEach(b => BlocoFactory.criar(b)); salvarBlocos(); } 
        catch (er) { alert("Arquivo corrompido."); } e.target.value = '';
    }; r.readAsText(f);
});

carregarBlocos();