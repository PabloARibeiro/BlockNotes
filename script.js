// VARIÁVEL GLOBAL PARA GERENCIAR A PROFUNDIDADE (Z-INDEX)
let zIndexGlobal = 1;

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
        // Traz o bloco para frente ao clicar (Correção do Bug de Z-Index)
        this.elemento.addEventListener('mousedown', () => {
            this.elemento.style.zIndex = zIndexGlobal++;
            salvarBlocos();
        });

        this.elemento.querySelector('.btn-excluir').onclick = () => { 
            this.elemento.remove(); 
            salvarBlocos(); 
        };
        
        this.elemento.querySelector('.cor-fundo').addEventListener('input', (e) => { 
            this.elemento.style.backgroundColor = e.target.value; 
            salvarBlocos(); 
        });
        
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
    
    // Varre o DOM e utiliza o método da instância vinculada a cada elemento (Polimorfismo)
    const arrayDeDados = Array.from(area.children).map(elemento => {
        return elemento.__blocoInstance.extrairDadosParaSalvar(area.clientWidth, area.clientHeight);
    });

    try {
        localStorage.setItem('meusBlocosSalvos', JSON.stringify(arrayDeDados));
    } catch (e) {
        // Correção Parcial: Prevenção contra estouro de memória (QuotaExceededError)
        alert("Atenção: A memória local atingiu seu limite (aprox. 5MB). Os últimos desenhos não puderam ser salvos.");
    }
}

function carregarBlocos() {
    const dadosSalvos = localStorage.getItem('meusBlocosSalvos');
    if (dadosSalvos) {
        const arrayDeDados = JSON.parse(dadosSalvos);
        arrayDeDados.forEach(dadoDoBloco => {
            BlocoFactory.criar(dadoDoBloco);
        });
    }
}

// Inicialização
document.getElementById('btn-add').addEventListener('click', () => {
    BlocoFactory.criar();
    salvarBlocos();
});

carregarBlocos();

// --- LÓGICA DE EXPORTAR E IMPORTAR ---
const btnExportar = document.getElementById('btn-exportar');
const btnImportar = document.getElementById('btn-importar');
const inputArquivo = document.getElementById('input-arquivo');

btnExportar.addEventListener('click', () => {
    salvarBlocos(); 
    const dadosSalvos = localStorage.getItem('meusBlocosSalvos');
    
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
            document.getElementById('area-trabalho').innerHTML = ''; // Limpa a área
            
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