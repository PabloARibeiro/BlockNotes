let zIndexGlobal = 1;
let gridAtivado = false;
const TAMANHO_GRID = 50;

// --- CAMADA DE PERSISTÊNCIA (STORAGE SERVICE) ---
class StorageService {
    static CHAVE_ARMAZENAMENTO = 'meusBlocosSalvos';

    static salvar(dados) {
        try {
            const json = JSON.stringify(dados);
            localStorage.setItem(this.CHAVE_ARMAZENAMENTO, json);
            return true;
        } catch (erro) {
            console.error("Falha na persistência de dados:", erro);
            if (erro.name === 'QuotaExceededError') {
                alert("Erro Crítico: O armazenamento local excedeu a quota permitida (aprox. 5MB). Os blocos com desenhos muito grandes não puderam ser guardados.");
            }
            return false;
        }
    }

    static carregar() {
        try {
            const dados = localStorage.getItem(this.CHAVE_ARMAZENAMENTO);
            return dados ? JSON.parse(dados) : null;
        } catch (erro) {
            console.error("Falha ao ler dados de persistência:", erro);
            return null;
        }
    }
}

// --- ARQUITETURA DE BLOCOS (OOP) ---
class Bloco {
    constructor(dados, tipo) {
        this.tipo = tipo;
        this.dados = dados || {};
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
        this.elemento.style.top = this.dados.top || '10%';
        this.elemento.style.left = this.dados.left || '10%';
        this.elemento.style.width = this.dados.width || '25%';
        this.elemento.style.height = this.dados.height || '20%';
        this.corFundoPadrao = this.dados.fundo || '#ffffff';
        this.elemento.style.backgroundColor = this.corFundoPadrao;
        
        if (this.dados.zIndex) {
            this.elemento.style.zIndex = this.dados.zIndex;
            if (this.dados.zIndex >= zIndexGlobal) zIndexGlobal = this.dados.zIndex + 1;
        } else {
            this.elemento.style.zIndex = zIndexGlobal++;
        }
    }

    montarHTML() {
        const cabecalho = `
            <div class="cabecalho">
                <div class="controles-cor">
                    <input type="color" class="cor-fundo" value="${this.corFundoPadrao}" title="Mudar Cor do Fundo">
                </div>
                <button class="btn-excluir" title="Excluir Bloco">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        this.elemento.innerHTML = cabecalho + this.getConteudoHTML() + '<div class="redimensionador"></div>';
        this.aplicarRedimensionamento();
    }

    getConteudoHTML() { 
        throw new Error("O método getConteudoHTML deve ser implementado nas subclasses.");
    }

    aplicarEventosGerais() {
        this.elemento.addEventListener('mousedown', (e) => {
            if (e.target.type === 'color') return;
            if (this.elemento.style.zIndex != zIndexGlobal) {
                this.elemento.style.zIndex = zIndexGlobal++;
            }
        });

        this.elemento.querySelector('.btn-excluir').onclick = () => { 
            this.elemento.remove(); 
            salvarBlocos(); 
        };
        
        const inputCor = this.elemento.querySelector('.cor-fundo');
        const atualizarCor = (e) => { 
            this.elemento.style.backgroundColor = e.target.value; 
            salvarBlocos(); 
        };
        inputCor.addEventListener('input', atualizarCor);
        inputCor.addEventListener('change', atualizarCor);
    }

    aplicarEventosEspecificos() {}

    obterCoordenadas(evento) {
        if (evento.touches && evento.touches.length > 0) {
            return { x: evento.touches[0].clientX, y: evento.touches[0].clientY };
        }
        return { x: evento.clientX, y: evento.clientY };
    }

    aplicarArrastar() {
        const cabecalho = this.elemento.querySelector('.cabecalho');
        let inicioX, inicioY, leftInicial, topInicial;
        
        const iniciarArrasto = (evento) => {
            if(['INPUT', 'BUTTON', 'I'].includes(evento.target.tagName)) return;
            if (evento.type === 'touchstart') evento.preventDefault(); 
            
            const pos = this.obterCoordenadas(evento);
            inicioX = pos.x; 
            inicioY = pos.y;
            leftInicial = this.elemento.offsetLeft; 
            topInicial = this.elemento.offsetTop;
            
            const onMove = (ev) => {
                if (ev.type === 'touchmove') ev.preventDefault();
                const posAtual = this.obterCoordenadas(ev);
                
                // Cálculo base do movimento
                let calcX = leftInicial + (posAtual.x - inicioX);
                let calcY = topInicial + (posAtual.y - inicioY);

                // O ALGORITMO DE GRID: Força o valor para o múltiplo de 50 mais próximo
                if (gridAtivado) {
                    calcX = Math.round(calcX / TAMANHO_GRID) * TAMANHO_GRID;
                    calcY = Math.round(calcY / TAMANHO_GRID) * TAMANHO_GRID;
                }

                // Limita para não sair do ecrã
                const maxEsquerda = this.area.clientWidth - this.elemento.offsetWidth;
                const maxTopo = this.area.clientHeight - this.elemento.offsetHeight;

                this.elemento.style.left = Math.max(0, Math.min(calcX, maxEsquerda)) + 'px';
                this.elemento.style.top = Math.max(0, Math.min(calcY, maxTopo)) + 'px';
            };
            
            const onEnd = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('touchmove', onMove, { passive: false });
                document.removeEventListener('mouseup', onEnd);
                document.removeEventListener('touchend', onEnd);
                
                this.elemento.style.left = (this.elemento.offsetLeft / this.area.clientWidth) * 100 + '%';
                this.elemento.style.top = (this.elemento.offsetTop / this.area.clientHeight) * 100 + '%';
                salvarBlocos();
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchend', onEnd);
        };

        cabecalho.addEventListener('mousedown', iniciarArrasto);
        cabecalho.addEventListener('touchstart', iniciarArrasto, { passive: false });
    }

    aplicarRedimensionamento() {
        const puxador = this.elemento.querySelector('.redimensionador');
        if (!puxador) return;

        let larguraInicial, alturaInicial, inicioX, inicioY;

        const iniciarRedimensionamento = (evento) => {
            if (evento.type === 'touchstart') evento.preventDefault();
            evento.stopPropagation();

            const pos = this.obterCoordenadas(evento);
            inicioX = pos.x;
            inicioY = pos.y;
            larguraInicial = this.elemento.offsetWidth;
            alturaInicial = this.elemento.offsetHeight;

            const onMove = (ev) => {
                if (ev.type === 'touchmove') ev.preventDefault();
                const posAtual = this.obterCoordenadas(ev);

                let novaLargura = larguraInicial + (posAtual.x - inicioX);
                let novaAltura = alturaInicial + (posAtual.y - inicioY);

                // O ALGORITMO DE GRID PARA REDIMENSIONAMENTO
                if (gridAtivado) {
                    novaLargura = Math.round(novaLargura / TAMANHO_GRID) * TAMANHO_GRID;
                    novaAltura = Math.round(novaAltura / TAMANHO_GRID) * TAMANHO_GRID;
                }

                this.elemento.style.width = Math.max(150, novaLargura) + 'px';
                this.elemento.style.height = Math.max(100, novaAltura) + 'px';
            };

            const onEnd = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('touchmove', onMove, { passive: false });
                document.removeEventListener('mouseup', onEnd);
                document.removeEventListener('touchend', onEnd);

                this.elemento.style.width = (this.elemento.offsetWidth / this.area.clientWidth) * 100 + '%';
                this.elemento.style.height = (this.elemento.offsetHeight / this.area.clientHeight) * 100 + '%';
                salvarBlocos();
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchend', onEnd);
        };

        puxador.addEventListener('mousedown', iniciarRedimensionamento);
        puxador.addEventListener('touchstart', iniciarRedimensionamento, { passive: false });
    }

    extrairDadosParaSalvar(larguraArea, alturaArea) {
        let posEsquerdaRelativa = (this.elemento.offsetLeft / larguraArea) * 100;
        let posTopoRelativa = (this.elemento.offsetTop / alturaArea) * 100;
        let larguraRelativa = (this.elemento.offsetWidth / larguraArea) * 100;
        let alturaRelativa = (this.elemento.offsetHeight / alturaArea) * 100;

        return {
            tipo: this.tipo,
            top: posTopoRelativa + '%',
            left: posEsquerdaRelativa + '%',
            width: larguraRelativa + '%',
            height: alturaRelativa + '%',
            fundo: this.elemento.querySelector('.cor-fundo').value,
            zIndex: parseInt(this.elemento.style.zIndex) || 1,
            ...this.extrairDadosEspecificos()
        };
    }

    extrairDadosEspecificos() { return {}; }
}

class BlocoTexto extends Bloco {
    constructor(dados) { super(dados, 'texto'); }
    
    getConteudoHTML() {
        const texto = this.dados.texto || '';
        return `<div class="texto" contenteditable="true">${texto}</div>`;
    }

    aplicarEventosEspecificos() {
        this.elemento.querySelector('.texto').addEventListener('input', salvarBlocos);
    }

    extrairDadosEspecificos() {
        return { texto: this.elemento.querySelector('.texto').innerHTML };
    }
}

class BlocoTituloTexto extends Bloco {
    constructor(dados) { super(dados, 'titulo-texto'); }
    
    getConteudoHTML() {
        const titulo = this.dados.titulo || '';
        const texto = this.dados.texto || '';
        return `
            <div class="area-titulo" contenteditable="true">${titulo}</div>
            <div class="texto" contenteditable="true">${texto}</div>
        `;
    }

    aplicarEventosEspecificos() {
        this.elemento.querySelector('.area-titulo').addEventListener('input', salvarBlocos);
        this.elemento.querySelector('.texto').addEventListener('input', salvarBlocos);
    }

    extrairDadosEspecificos() {
        return {
            titulo: this.elemento.querySelector('.area-titulo').innerHTML,
            texto: this.elemento.querySelector('.texto').innerHTML
        };
    }
}

class BlocoDesenho extends Bloco {
    constructor(dados) { super(dados, 'desenho'); }
    
    getConteudoHTML() {
        return `
            <div class="ferramentas-desenho">
                <button class="btn-ferramenta ativo btn-lapis" title="Lápis"><i class="fa-solid fa-pencil"></i></button>
                <button class="btn-ferramenta btn-borracha" title="Borracha"><i class="fa-solid fa-eraser"></i></button>
                <button class="btn-ferramenta btn-limpar" title="Limpar Tudo"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <canvas width="800" height="600" class="area-canvas"></canvas>
        `;
    }

    aplicarEventosEspecificos() {
        const canvas = this.elemento.querySelector('canvas');
        const pincel = canvas.getContext('2d');
        let desenhando = false;
        let espessuraBase = 3; 

        pincel.lineCap = 'round';
        pincel.lineJoin = 'round';
        canvas.style.cursor = 'crosshair'; 

        const btnLapis = this.elemento.querySelector('.btn-lapis');
        const btnBorracha = this.elemento.querySelector('.btn-borracha');
        const btnLimpar = this.elemento.querySelector('.btn-limpar');

        btnLapis.onclick = () => {
            pincel.globalCompositeOperation = 'source-over'; 
            espessuraBase = 3; 
            canvas.style.cursor = 'crosshair';
            btnLapis.classList.add('ativo');
            btnBorracha.classList.remove('ativo');
        };

        btnBorracha.onclick = () => {
            pincel.globalCompositeOperation = 'destination-out'; 
            espessuraBase = 20; 
            const cursorSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='10' cy='10' r='9.5' fill='rgba(200,200,200,0.5)' stroke='black' stroke-width='1'/%3E%3C/svg%3E") 10 10, auto`;
            canvas.style.cursor = cursorSvg;
            btnBorracha.classList.add('ativo');
            btnLapis.classList.remove('ativo');
        };

        btnLimpar.onclick = () => {
            pincel.clearRect(0, 0, canvas.width, canvas.height); 
            salvarBlocos();
        };

        if (this.dados.desenho) {
            let imagemSalva = new Image();
            imagemSalva.src = this.dados.desenho;
            imagemSalva.onload = () => pincel.drawImage(imagemSalva, 0, 0);
        }

        const iniciarDesenho = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            desenhando = true;
            const pos = this.obterCoordenadas(e);
            
            // Calculo preciso para onde o dedo encosta em relação ao canvas responsivo
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (pos.x - rect.left) * scaleX;
            const y = (pos.y - rect.top) * scaleY;

            pincel.lineWidth = espessuraBase * (canvas.width / canvas.offsetWidth);
            pincel.beginPath();
            pincel.moveTo(x, y); 
        };

        const moverDesenho = (e) => {
            if (e.type === 'touchmove') e.preventDefault();
            if (desenhando) {
                const pos = this.obterCoordenadas(e);
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                const x = (pos.x - rect.left) * scaleX;
                const y = (pos.y - rect.top) * scaleY;

                pincel.lineTo(x, y);
                pincel.stroke(); 
            }
        };

        const pararDesenho = () => { 
            if (desenhando) {
                desenhando = false; 
                salvarBlocos(); 
            }
        };

        canvas.addEventListener('mousedown', iniciarDesenho);
        canvas.addEventListener('mousemove', moverDesenho);
        canvas.addEventListener('mouseup', pararDesenho);
        canvas.addEventListener('mouseout', pararDesenho);
        
        // Touch events adicionados para o canvas funcionar no telemóvel
        canvas.addEventListener('touchstart', iniciarDesenho, { passive: false });
        canvas.addEventListener('touchmove', moverDesenho, { passive: false });
        canvas.addEventListener('touchend', pararDesenho);
        canvas.addEventListener('touchcancel', pararDesenho);
    }

    extrairDadosEspecificos() {
        const canvas = this.elemento.querySelector('canvas');
        const imagemComprimida = canvas.toDataURL('image/webp', 0.5);
        return {
            desenho: imagemComprimida
        };
    }
}

class BlocoFactory {
    static criar(dados = null) {
        const tipo = dados ? dados.tipo : document.getElementById('seletor-tipo').value;
        switch(tipo) {
            case 'texto': return new BlocoTexto(dados);
            case 'titulo-texto': return new BlocoTituloTexto(dados);
            case 'desenho': return new BlocoDesenho(dados);
            default: 
                console.error("Tipo de bloco desconhecido:", tipo);
                return null;
        }
    }
}

// --- FUNÇÕES GERAIS ---
function salvarBlocos() {
    const area = document.getElementById('area-trabalho');
    const arrayDeDados = Array.from(area.children).map(elemento => {
        return elemento.__blocoInstance.extrairDadosParaSalvar(area.clientWidth, area.clientHeight);
    });
    StorageService.salvar(arrayDeDados);
}

function carregarBlocos() {
    const arrayDeDados = StorageService.carregar();
    if (arrayDeDados && Array.isArray(arrayDeDados)) {
        arrayDeDados.forEach(dadoDoBloco => {
            BlocoFactory.criar(dadoDoBloco);
        });
    }
}

function forcarSnapTodosOsBlocos() {
    const area = document.getElementById('area-trabalho');
    const blocos = Array.from(area.children);

    blocos.forEach(elemento => {
        // Pega as dimensões atuais em pixels
        let left = elemento.offsetLeft;
        let top = elemento.offsetTop;
        let width = elemento.offsetWidth;
        let height = elemento.offsetHeight;

        // Força o arredondamento matemático do Grid
        left = Math.round(left / TAMANHO_GRID) * TAMANHO_GRID;
        top = Math.round(top / TAMANHO_GRID) * TAMANHO_GRID;
        width = Math.round(width / TAMANHO_GRID) * TAMANHO_GRID;
        height = Math.round(height / TAMANHO_GRID) * TAMANHO_GRID;

        // Aplica os mesmos limites de segurança do redimensionamento manual
        width = Math.max(150, width);
        height = Math.max(100, height);
        
        const maxEsquerda = area.clientWidth - width;
        const maxTopo = area.clientHeight - height;
        
        left = Math.max(0, Math.min(left, maxEsquerda));
        top = Math.max(0, Math.min(top, maxTopo));

        // Converte de volta para porcentagem para não quebrar a responsividade mobile
        elemento.style.left = (left / area.clientWidth) * 100 + '%';
        elemento.style.top = (top / area.clientHeight) * 100 + '%';
        elemento.style.width = (width / area.clientWidth) * 100 + '%';
        elemento.style.height = (height / area.clientHeight) * 100 + '%';
    });

    // Salva o novo estado organizado na memória
    if (blocos.length > 0) salvarBlocos();
}

// --- INICIALIZAÇÃO E VARIÁVEIS DE INTERFACE ---
const btnAdd = document.getElementById('btn-add');
const btnExportar = document.getElementById('btn-exportar');
const btnImportar = document.getElementById('btn-importar');
const inputArquivo = document.getElementById('input-arquivo');
const btnInstalar = document.getElementById('btn-instalar');
const btnGrid = document.getElementById('btn-grid');

if (btnAdd) {
    btnAdd.addEventListener('click', () => {
        BlocoFactory.criar();
        salvarBlocos();
    });
}

if (btnExportar) {
    btnExportar.addEventListener('click', () => {
        salvarBlocos(); 
        const dadosSalvos = localStorage.getItem(StorageService.CHAVE_ARMAZENAMENTO);
        if (!dadosSalvos || dadosSalvos === '[]') {
            alert("Não há blocos na tela para exportar!");
            return; 
        }
        const arquivoBlob = new Blob([dadosSalvos], { type: 'application/json' });
        const urlTemporaria = URL.createObjectURL(arquivoBlob);
        const linkDownload = document.createElement('a');
        linkDownload.href = urlTemporaria;
        linkDownload.download = 'meus_blocos.json'; 
        linkDownload.click();
        URL.revokeObjectURL(urlTemporaria);
    });
}

if (btnImportar && inputArquivo) {
    btnImportar.addEventListener('click', () => {
        inputArquivo.click(); 
    });

    inputArquivo.addEventListener('change', (evento) => {
        const arquivoSelecionado = evento.target.files[0];
        if (!arquivoSelecionado) return; 

        const leitor = new FileReader();
        leitor.onload = (e) => {
            try {
                const blocosImportados = JSON.parse(e.target.result);
                document.getElementById('area-trabalho').innerHTML = ''; 
                blocosImportados.forEach(dadoDoBloco => {
                    BlocoFactory.criar(dadoDoBloco);
                });
                salvarBlocos(); 
            } catch (erro) {
                alert("Erro ao importar: O arquivo selecionado não é válido ou está corrompido.");
            }
            inputArquivo.value = ''; 
        };
        leitor.readAsText(arquivoSelecionado);
    });
}

if (btnGrid) {
    btnGrid.addEventListener('click', () => {
        gridAtivado = !gridAtivado; // Alterna entre true e false
        
        // Dá feedback visual na interface
        btnGrid.classList.toggle('ativo', gridAtivado);
        document.getElementById('area-trabalho').classList.toggle('com-grid', gridAtivado);

        // A MÁGICA AQUI: Se ligou o grid, organiza a casa automaticamente
        if (gridAtivado) {
            forcarSnapTodosOsBlocos();
        }
    });
}

// --- LÓGICA DE INSTALAÇÃO DO PWA ---
let eventoPromptInstalacao = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoPromptInstalacao = e;
    if (btnInstalar) btnInstalar.style.display = 'block';
});

if (btnInstalar) {
    btnInstalar.addEventListener('click', async () => {
        if (!eventoPromptInstalacao) return;
        eventoPromptInstalacao.prompt();
        const { outcome } = await eventoPromptInstalacao.userChoice;
        console.log(`Escolha de instalação do utilizador: ${outcome}`);
        if (outcome === 'accepted') {
            btnInstalar.style.display = 'none';
        }
        eventoPromptInstalacao = null;
    });
}

window.addEventListener('appinstalled', () => {
    if (btnInstalar) btnInstalar.style.display = 'none';
    console.log('BlockNotes foi instalado com sucesso.');
});

// --- REGISTO DO SERVICE WORKER (PWA) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('Service Worker registado com sucesso no escopo:', registration.scope);
            })
            .catch(error => {
                console.error('Falha no registo do Service Worker:', error);
            });
    });
}

// Inicia a aplicação e carrega os blocos guardados
carregarBlocos();