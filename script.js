// VARIÁVEL GLOBAL PARA GERENCIAR A PROFUNDIDADE (Z-INDEX)
let zIndexGlobal = 1;

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

// 1. Classe Base (Superclasse)
class Bloco {
    constructor(dados, tipo) {
        this.tipo = tipo;
        this.dados = dados || {};
        this.area = document.getElementById('area-trabalho');
        
        this.elemento = document.createElement('div');
        this.elemento.className = 'bloco';
        this.elemento.dataset.tipo = tipo;
        
        // Vincula a instância da classe ao elemento DOM (crucial para o salvamento dinâmico)
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
        
        // Mantém o z-index correto se for carregado da memória
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
        this.elemento.innerHTML = cabecalho + this.getConteudoHTML();
    }

    // Método Abstrato - Deve ser implementado nas classes filhas
    getConteudoHTML() { 
        throw new Error("O método getConteudoHTML deve ser implementado nas subclasses.");
    }

    aplicarEventosGerais() {
        this.elemento.addEventListener('mousedown', (e) => {
            // Correção Firefox: Ignora a mudança de z-index se o alvo for o input de cor
            if (e.target.type === 'color') return;
            
            if (this.elemento.style.zIndex != zIndexGlobal) {
                this.elemento.style.zIndex = zIndexGlobal++;
                // Removemos o salvarBlocos() daqui. É um desperdício de processamento 
                // reescrever todo o localStorage apenas por trazer o bloco pra frente.
                // O salvamento do novo z-index ocorrerá naturalmente no mouseup.
            }
        });

        this.elemento.querySelector('.btn-excluir').onclick = () => { 
            this.elemento.remove(); 
            salvarBlocos(); 
        };
        
        // Adicionamos 'change' como redundância ao 'input' para máxima compatibilidade entre navegadores
        const inputCor = this.elemento.querySelector('.cor-fundo');
        const atualizarCor = (e) => { 
            this.elemento.style.backgroundColor = e.target.value; 
            salvarBlocos(); 
        };
        inputCor.addEventListener('input', atualizarCor);
        inputCor.addEventListener('change', atualizarCor);
        
        this.elemento.addEventListener('mouseup', () => {
            this.elemento.style.width = (this.elemento.offsetWidth / this.area.clientWidth) * 100 + '%';
            this.elemento.style.height = (this.elemento.offsetHeight / this.area.clientHeight) * 100 + '%';
            salvarBlocos(); 
        });
    }

    // Pode ser implementado nas classes filhas
    aplicarEventosEspecificos() {}

    aplicarArrastar() {
        const cabecalho = this.elemento.querySelector('.cabecalho');
        let inicioX, inicioY, leftInicial, topInicial;
        
        cabecalho.onmousedown = (evento) => {
            if(['INPUT', 'BUTTON', 'I'].includes(evento.target.tagName)) return;
            evento.preventDefault();
            
            inicioX = evento.clientX; 
            inicioY = evento.clientY;
            leftInicial = this.elemento.offsetLeft; 
            topInicial = this.elemento.offsetTop;
            
            const onMouseMove = (ev) => {
                ev.preventDefault();
                let novaPosEsquerda = leftInicial + (ev.clientX - inicioX);
                let novaPosTopo = topInicial + (ev.clientY - inicioY);

                const maxEsquerda = this.area.clientWidth - this.elemento.offsetWidth;
                const maxTopo = this.area.clientHeight - this.elemento.offsetHeight;

                this.elemento.style.left = Math.max(0, Math.min(novaPosEsquerda, maxEsquerda)) + 'px';
                this.elemento.style.top = Math.max(0, Math.min(novaPosTopo, maxTopo)) + 'px';
            };
            
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                
                this.elemento.style.left = (this.elemento.offsetLeft / this.area.clientWidth) * 100 + '%';
                this.elemento.style.top = (this.elemento.offsetTop / this.area.clientHeight) * 100 + '%';
                salvarBlocos();
            };

            // Listener anexado ao document evita travamentos se o mouse sair da área do cabeçalho
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
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

    // Método Abstrato
    extrairDadosEspecificos() { return {}; }
}

// 2. Subclasses (Herança)
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

        canvas.onmousedown = (e) => {
            desenhando = true;
            pincel.lineWidth = espessuraBase * (canvas.width / canvas.offsetWidth);
            pincel.beginPath();
            pincel.moveTo(e.offsetX * (canvas.width / canvas.offsetWidth), e.offsetY * (canvas.height / canvas.offsetHeight)); 
        };
        canvas.onmousemove = (e) => {
            if (desenhando) {
                pincel.lineTo(e.offsetX * (canvas.width / canvas.offsetWidth), e.offsetY * (canvas.height / canvas.offsetHeight));
                pincel.stroke(); 
            }
        };
        canvas.onmouseup = () => { desenhando = false; salvarBlocos(); };
        canvas.onmouseout = () => { desenhando = false; };
    }

    extrairDadosEspecificos() {
        return {
            desenho: this.elemento.querySelector('canvas').toDataURL()
        };
    }
}

// 3. Factory Method Pattern
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

// --- LÓGICA DO PROGRAMA PRINCIPAL ---

function salvarBlocos() {
    const area = document.getElementById('area-trabalho');
    
    // O mapeamento extrai a estrutura de dados independentemente da persistência
    const arrayDeDados = Array.from(area.children).map(elemento => {
        return elemento.__blocoInstance.extrairDadosParaSalvar(area.clientWidth, area.clientHeight);
    });

    // Delegamos a responsabilidade de guardar ao StorageService
    StorageService.salvar(arrayDeDados);
}

function carregarBlocos() {
    // Delegamos a responsabilidade de leitura ao StorageService
    const arrayDeDados = StorageService.carregar();
    
    if (arrayDeDados && Array.isArray(arrayDeDados)) {
        arrayDeDados.forEach(dadoDoBloco => {
            BlocoFactory.criar(dadoDoBloco);
        });
    }
}

// --- VARIÁVEIS DE CONTROLO DA INTERFACE ---
const btnAdd = document.getElementById('btn-add');
const btnExportar = document.getElementById('btn-exportar');
const btnImportar = document.getElementById('btn-importar');
const inputArquivo = document.getElementById('input-arquivo');

// --- INICIALIZAÇÃO ---
btnAdd.addEventListener('click', () => {
    BlocoFactory.criar();
    salvarBlocos();
});

carregarBlocos(); // Carrega os blocos guardados ao abrir a página

// --- LÓGICA DE EXPORTAR E IMPORTAR ---
btnExportar.addEventListener('click', () => {
    salvarBlocos(); 
    
    // O exportar agora usa a chave centralizada do serviço
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

// O seu código do btnImportar continua aqui para baixo...
btnImportar.addEventListener('click', () => {
    inputArquivo.click(); 
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

// --- LÓGICA DE INSTALAÇÃO DO PWA ---
let eventoPromptInstalacao = null;
const btnInstalar = document.getElementById('btn-instalar');

// O navegador dispara este evento quando reconhece que o PWA cumpre os requisitos
window.addEventListener('beforeinstallprompt', (e) => {
    // Impede o mini-infobar padrão do navegador de aparecer imediatamente
    e.preventDefault();
    // Guarda o evento para ser disparado depois
    eventoPromptInstalacao = e;
    // Mostra o nosso botão na interface
    if (btnInstalar) btnInstalar.style.display = 'block';
});

if (btnInstalar) {
    btnInstalar.addEventListener('click', async () => {
        if (!eventoPromptInstalacao) return;
        
        // Mostra o prompt nativo de instalação do sistema operativo
        eventoPromptInstalacao.prompt();
        
        // Aguarda a resposta do utilizador
        const { outcome } = await eventoPromptInstalacao.userChoice;
        console.log(`Escolha de instalação do utilizador: ${outcome}`);
        
        // Se aceitou, esconde o botão
        if (outcome === 'accepted') {
            btnInstalar.style.display = 'none';
        }
        
        // Limpa a variável, pois o prompt só pode ser usado uma vez
        eventoPromptInstalacao = null;
    });
}

// Opcional: Esconder o botão se a aplicação já foi instalada com sucesso
window.addEventListener('appinstalled', () => {
    if (btnInstalar) btnInstalar.style.display = 'none';
    console.log('BlockNotes foi instalado com sucesso.');
});