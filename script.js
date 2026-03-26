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
    constructor(dados, tipo, permiteCores = true) {
        this.tipo = tipo; 
        this.dados = dados || {};
        this.permiteCores = permiteCores; 
        this.area = document.getElementById('area-trabalho');
        this.elemento = document.createElement('div');
        this.elemento.className = 'bloco'; 
        this.elemento.dataset.tipo = tipo;
        this.elemento.__blocoInstance = this;
        this.configurarEstilosIniciais(); 
        this.montarHTML();
        this.aplicarEventosGerais(); 
        this.aplicarEventosEspecificos(); 
        this.aplicarArrastar();
        this.area.appendChild(this.elemento);
    }

    configurarEstilosIniciais() {
        this.elemento.style.top = this.dados.top || '100px'; 
        this.elemento.style.left = this.dados.left || '100px';
        
        // NOVO TAMANHO PADRÃO: 300x200 (6x4 no grid de 50px)
        this.elemento.style.width = this.dados.width || '300px'; 
        this.elemento.style.height = this.dados.height || '200px';
        
        if(typeof this.dados.top === 'string' && this.dados.top.includes('%')) this.elemento.style.top = (parseFloat(this.dados.top) / 100 * this.area.clientHeight) + 'px';
        if(typeof this.dados.left === 'string' && this.dados.left.includes('%')) this.elemento.style.left = (parseFloat(this.dados.left) / 100 * this.area.clientWidth) + 'px';
        if(typeof this.dados.width === 'string' && this.dados.width.includes('%')) this.elemento.style.width = (parseFloat(this.dados.width) / 100 * this.area.clientWidth) + 'px';
        if(typeof this.dados.height === 'string' && this.dados.height.includes('%')) this.elemento.style.height = (parseFloat(this.dados.height) / 100 * this.area.clientHeight) + 'px';

        this.corFundoPadrao = this.dados.fundo || '#ffffff'; 
        this.corTextoPadrao = this.dados.corTexto || '#000000';
        this.elemento.style.backgroundColor = this.corFundoPadrao;
        this.elemento.style.color = this.corTextoPadrao;
        
        if (this.dados.zIndex) { 
            this.elemento.style.zIndex = this.dados.zIndex; 
            if (this.dados.zIndex >= zIndexGlobal) zIndexGlobal = this.dados.zIndex + 1; 
        } else { 
            this.elemento.style.zIndex = zIndexGlobal++; 
        }
    }

    montarHTML() {
        const controlesCorHTML = this.permiteCores ? 
            `<div class="controles-cor">
                <input type="color" class="cor-fundo" value="${this.corFundoPadrao}" title="Cor de Fundo">
                <input type="color" class="cor-texto" value="${this.corTextoPadrao}" title="Cor do Pincel/Texto">
            </div>` : `<div class="controles-cor"></div>`;

        const cabecalho = `<div class="cabecalho">${controlesCorHTML}<button class="btn-excluir"><i class="fa-solid fa-trash"></i></button></div>`;
        
        // DE VOLTA ÀS ORIGENS: O gancho clássico no canto inferior direito
        this.elemento.innerHTML = cabecalho + this.getConteudoHTML() + '<div class="redimensionador"></div>';
        this.aplicarRedimensionamento();
    }

    getConteudoHTML() { throw new Error("A implementar nas subclasses."); }
    aplicarEventosEspecificos() {}

    aplicarEventosGerais() {
        this.elemento.addEventListener('mousedown', (e) => { if (e.target.type !== 'color' && this.elemento.style.zIndex != zIndexGlobal) this.elemento.style.zIndex = zIndexGlobal++; });
        this.elemento.querySelector('.btn-excluir').onclick = () => { this.elemento.remove(); salvarBlocos(); };
        
        if (this.permiteCores) {
            const inputFundo = this.elemento.querySelector('.cor-fundo');
            const atualizarFundo = (e) => { this.elemento.style.backgroundColor = e.target.value; salvarBlocos(); };
            inputFundo.addEventListener('input', atualizarFundo); inputFundo.addEventListener('change', atualizarFundo);

            const inputTexto = this.elemento.querySelector('.cor-texto');
            const atualizarTexto = (e) => { this.elemento.style.color = e.target.value; salvarBlocos(); };
            inputTexto.addEventListener('input', atualizarTexto); inputTexto.addEventListener('change', atualizarTexto);
        }
    }

    obterCoordenadas(evento) {
        if (evento.touches && evento.touches.length > 0) return { x: evento.touches[0].clientX, y: evento.touches[0].clientY };
        return { x: evento.clientX, y: evento.clientY };
    }

    aplicarArrastar() {
        const cabecalho = this.elemento.querySelector('.cabecalho');
        let inicioX, inicioY, leftInicial, topInicial;
        
        const iniciarArrasto = (evento) => {
            if (evento.target.closest('button, input, select, .redimensionador')) return;
            if (evento.type === 'touchstart') evento.preventDefault(); 
            
            const pos = this.obterCoordenadas(evento);
            inicioX = pos.x; inicioY = pos.y;
            leftInicial = this.elemento.offsetLeft; topInicial = this.elemento.offsetTop;
            
            const onMove = (ev) => {
                if (ev.type === 'touchmove') ev.preventDefault();
                const posAtual = this.obterCoordenadas(ev);
                
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
                salvarBlocos();
            };
            document.addEventListener('mousemove', onMove); document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('mouseup', onEnd); document.addEventListener('touchend', onEnd);
        };
        cabecalho.addEventListener('mousedown', iniciarArrasto); cabecalho.addEventListener('touchstart', iniciarArrasto, { passive: false });
    }

    aplicarRedimensionamento() {
        const puxador = this.elemento.querySelector('.redimensionador');
        if (!puxador) return;

        let larguraInicial, alturaInicial, inicioX, inicioY;

        const iniciarRedimensionamento = (evento) => {
            if (evento.type === 'touchstart') evento.preventDefault(); 
            evento.stopPropagation(); 

            const pos = this.obterCoordenadas(evento);
            inicioX = pos.x; inicioY = pos.y;
            
            larguraInicial = this.elemento.offsetWidth; alturaInicial = this.elemento.offsetHeight;

            const onMove = (ev) => {
                if (ev.type === 'touchmove') ev.preventDefault();
                const posAtual = this.obterCoordenadas(ev);
                
                let novaLargura = larguraInicial + ((posAtual.x - inicioX) / escalaWorkspace);
                let novaAltura = alturaInicial + ((posAtual.y - inicioY) / escalaWorkspace);

                if (gridAtivado) {
                    novaLargura = Math.round(novaLargura / TAMANHO_GRID) * TAMANHO_GRID;
                    novaAltura = Math.round(novaAltura / TAMANHO_GRID) * TAMANHO_GRID;
                }

                this.elemento.style.width = Math.max(150, novaLargura) + 'px'; 
                this.elemento.style.height = Math.max(100, novaAltura) + 'px';
            };

            const onEnd = () => {
                document.removeEventListener('mousemove', onMove); document.removeEventListener('touchmove', onMove, { passive: false });
                document.removeEventListener('mouseup', onEnd); document.removeEventListener('touchend', onEnd);
                salvarBlocos();
            };

            document.addEventListener('mousemove', onMove); document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('mouseup', onEnd); document.addEventListener('touchend', onEnd);
        };

        puxador.addEventListener('mousedown', iniciarRedimensionamento);
        puxador.addEventListener('touchstart', iniciarRedimensionamento, { passive: false });
    }

    extrairDadosParaSalvar(larguraArea, alturaArea) {
        let dadosBase = {
            tipo: this.tipo, 
            zIndex: parseInt(this.elemento.style.zIndex) || 1,
            top: (this.elemento.offsetTop / alturaArea) * 100 + '%', left: (this.elemento.offsetLeft / larguraArea) * 100 + '%',
            width: (this.elemento.offsetWidth / larguraArea) * 100 + '%', height: (this.elemento.offsetHeight / alturaArea) * 100 + '%'
        };
        
        if (this.permiteCores) {
            dadosBase.fundo = this.elemento.querySelector('.cor-fundo').value;
            dadosBase.corTexto = this.elemento.querySelector('.cor-texto').value;
        } else {
            dadosBase.fundo = this.corFundoPadrao;
            dadosBase.corTexto = this.corTextoPadrao;
        }
        return { ...dadosBase, ...this.extrairDadosEspecificos() };
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

class BlocoChecklist extends Bloco {
    constructor(dados) { super(dados, 'checklist'); }
    
    getConteudoHTML() {
        const titulo = this.dados.titulo || '';
        let tarefasHTML = '';
        
        // Se já tiver tarefas salvas, carrega. Se não, cria uma linha vazia.
        if (this.dados.tarefas && this.dados.tarefas.length > 0) {
            this.dados.tarefas.forEach(t => {
                const checked = t.concluida ? 'checked' : '';
                tarefasHTML += `
                    <li class="tarefa-item">
                        <input type="checkbox" ${checked}>
                        <input type="text" value="${t.texto}" placeholder="Nova tarefa...">
                        <button class="btn-remover-tarefa" title="Remover"><i class="fa-solid fa-xmark"></i></button>
                    </li>
                `;
            });
        } else {
            tarefasHTML = `
                <li class="tarefa-item">
                    <input type="checkbox">
                    <input type="text" placeholder="Nova tarefa...">
                    <button class="btn-remover-tarefa" title="Remover"><i class="fa-solid fa-xmark"></i></button>
                </li>
            `;
        }

        return `
            <div class="area-checklist">
                <div class="area-titulo" contenteditable="true">${titulo}</div>
                <ul class="lista-tarefas">${tarefasHTML}</ul>
                <button class="btn-add-tarefa">+ Adicionar Tarefa</button>
            </div>
        `;
    }

    aplicarEventosEspecificos() {
        const lista = this.elemento.querySelector('.lista-tarefas');
        const btnAdd = this.elemento.querySelector('.btn-add-tarefa');
        this.elemento.querySelector('.area-titulo').addEventListener('input', salvarBlocos);

        const amarrarEventosItem = (item) => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const texto = item.querySelector('input[type="text"]');
            const btnRemover = item.querySelector('.btn-remover-tarefa');

            checkbox.addEventListener('change', salvarBlocos);
            texto.addEventListener('input', salvarBlocos);
            
            // Garante que não arrastamos o bloco ao focar no texto da tarefa
            texto.addEventListener('mousedown', (e) => e.stopPropagation());
            texto.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

            btnRemover.addEventListener('click', () => {
                item.remove();
                salvarBlocos();
            });
        };

        // Amarra eventos aos itens que já foram carregados
        lista.querySelectorAll('.tarefa-item').forEach(amarrarEventosItem);

        // Lógica de adicionar nova tarefa
        btnAdd.addEventListener('click', () => {
            const li = document.createElement('li');
            li.className = 'tarefa-item';
            li.innerHTML = `
                <input type="checkbox">
                <input type="text" placeholder="Nova tarefa...">
                <button class="btn-remover-tarefa" title="Remover"><i class="fa-solid fa-xmark"></i></button>
            `;
            lista.appendChild(li);
            amarrarEventosItem(li);
            li.querySelector('input[type="text"]').focus();
            salvarBlocos();
        });
    }

    extrairDadosEspecificos() {
        const tarefas = [];
        this.elemento.querySelectorAll('.tarefa-item').forEach(item => {
            tarefas.push({
                concluida: item.querySelector('input[type="checkbox"]').checked,
                texto: item.querySelector('input[type="text"]').value
            });
        });
        return {
            titulo: this.elemento.querySelector('.area-titulo').innerHTML,
            tarefas: tarefas
        };
    }
}

// --- BLOCO DE IMAGEM ---
class BlocoImagem extends Bloco {
    constructor(dados) { super(dados, 'imagem', false); } 
    
    getConteudoHTML() {
        const imgTag = this.dados.src ? `<img src="${this.dados.src}">` : '';
        const btnUpload = this.dados.src ? '' : `<button class="btn-upload-img"><i class="fa-solid fa-upload"></i> Carregar Foto</button>`;
        return `
            <div class="area-imagem" title="Dê um duplo clique para trocar a imagem">
                ${imgTag}
                ${btnUpload}
                <input type="file" accept="image/*" style="display: none;">
            </div>
        `;
    }

    aplicarEventosEspecificos() {
        const area = this.elemento.querySelector('.area-imagem');
        const fileInput = this.elemento.querySelector('input[type="file"]');
        const btnUpload = this.elemento.querySelector('.btn-upload-img');

        // Abre o seletor de arquivos no clique do botão ou duplo clique na área
        const abrirSeletor = () => fileInput.click();
        if (btnUpload) btnUpload.onclick = abrirSeletor;
        area.ondblclick = abrirSeletor;

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    // Compressão Mágica: Reduz fotos gigantes para o formato WebP
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 1200; // Limite de resolução
                    let width = img.width, height = img.height;

                    if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } 
                    else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }

                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Converte para WebP com 70% de qualidade
                    const imgComprimida = canvas.toDataURL('image/webp', 0.7);
                    
                    area.innerHTML = `<img src="${imgComprimida}"><input type="file" accept="image/*" style="display: none;">`;
                    this.aplicarEventosEspecificos(); // Re-amarra os eventos
                    salvarBlocos();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        };
    }

    extrairDadosEspecificos() {
        const img = this.elemento.querySelector('img');
        return { src: img ? img.src : null };
    }
}

// --- BLOCO DE BOOKMARK ---
class BlocoBookmark extends Bloco {
    constructor(dados) { super(dados, 'bookmark', false); }

    getConteudoHTML() {
        const titulo = this.dados.titulo || '';
        const url = this.dados.url || '';
        const modoEdicao = !url; // Começa editando se não tiver link salvo

        return `
            <div class="area-bookmark">
                <div class="bookmark-edit" style="display: ${modoEdicao ? 'flex' : 'none'};">
                    <input type="text" class="bm-titulo" placeholder="Nome do site..." value="${titulo}">
                    <input type="url" class="bm-url" placeholder="https://..." value="${url}">
                    <button class="bm-salvar"><i class="fa-solid fa-check"></i> Guardar Link</button>
                </div>
                <div class="bookmark-view" style="display: ${modoEdicao ? 'none' : 'flex'};">
                    <h3 class="bm-view-titulo">${titulo}</h3>
                    <a href="${url}" target="_blank" rel="noopener noreferrer" class="bm-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> Acessar</a>
                    <button class="bm-editar">Editar</button>
                </div>
            </div>
        `;
    }

    aplicarEventosEspecificos() {
        const editDiv = this.elemento.querySelector('.bookmark-edit');
        const viewDiv = this.elemento.querySelector('.bookmark-view');
        const inputTitulo = this.elemento.querySelector('.bm-titulo');
        const inputUrl = this.elemento.querySelector('.bm-url');
        const btnSalvar = this.elemento.querySelector('.bm-salvar');
        const btnEditar = this.elemento.querySelector('.bm-editar');
        
        // Bloqueia o arrasto ao tentar digitar
        inputTitulo.addEventListener('mousedown', (e) => e.stopPropagation());
        inputUrl.addEventListener('mousedown', (e) => e.stopPropagation());
        inputTitulo.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
        inputUrl.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

        btnSalvar.onclick = () => {
            if (!inputUrl.value) return alert('Por favor, digite um link.');
            let linkFinal = inputUrl.value.startsWith('http') ? inputUrl.value : 'https://' + inputUrl.value;
            
            this.elemento.querySelector('.bm-view-titulo').innerText = inputTitulo.value || linkFinal;
            this.elemento.querySelector('.bm-link').href = linkFinal;
            
            editDiv.style.display = 'none'; viewDiv.style.display = 'flex';
            salvarBlocos();
        };

        btnEditar.onclick = () => {
            editDiv.style.display = 'flex'; viewDiv.style.display = 'none';
        };
    }

    extrairDadosEspecificos() {
        if (this.elemento.querySelector('.bookmark-view').style.display === 'none') {
            return { titulo: this.elemento.querySelector('.bm-titulo').value, url: this.elemento.querySelector('.bm-url').value };
        } else {
            return { titulo: this.elemento.querySelector('.bm-view-titulo').innerText, url: this.elemento.querySelector('.bm-link').href };
        }
    }
}

class BlocoFactory {
    static criar(dados = null) {
        const tipo = dados && dados.tipo ? dados.tipo : (document.getElementById('seletor-tipo')?.value || 'texto');
        const config = dados || {};
        switch(tipo) { 
            case 'texto': return new BlocoTexto(config); 
            case 'titulo-texto': return new BlocoTituloTexto(config); 
            case 'desenho': return new BlocoDesenho(config); 
            case 'checklist': return new BlocoChecklist(config);
            case 'imagem': return new BlocoImagem(config);
            case 'bookmark': return new BlocoBookmark(config);
            default: return null; 
        }
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
document.getElementById('btn-add')?.addEventListener('click', () => { 
    const rect = viewport.getBoundingClientRect();
    let cx = (rect.width / 2 - panX) / escalaWorkspace - 150;
    let cy = (rect.height / 2 - panY) / escalaWorkspace - 100;
    
    BlocoFactory.criar({ left: cx + 'px', top: cy + 'px' }); 
    salvarBlocos(); 
});
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