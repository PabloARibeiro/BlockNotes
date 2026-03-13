// LÓGICA DO PROGRAMA
const btnAdd = document.getElementById('btn-add');
const area = document.getElementById('area-trabalho');

// 1. FUNÇÃO QUE SALVA TUDO EM PORCENTAGEM (Design Responsivo)
function salvarBlocos() {
    const area = document.getElementById('area-trabalho');
    const larguraArea = area.clientWidth;
    const alturaArea = area.clientHeight;
    
    const todosOsBlocos = document.querySelectorAll('.bloco');
    const arrayDeDados = [];

    todosOsBlocos.forEach(bloco => {
        let posEsquerdaRelativa = (bloco.offsetLeft / larguraArea) * 100;
        let posTopoRelativa = (bloco.offsetTop / alturaArea) * 100;
        let larguraRelativa = (bloco.offsetWidth / larguraArea) * 100;
        let alturaRelativa = (bloco.offsetHeight / alturaArea) * 100;

        // O pacote básico que todo bloco tem
        let dadosDoBloco = {
            tipo: bloco.dataset.tipo, // Pega o "RG" do bloco
            top: posTopoRelativa + '%',
            left: posEsquerdaRelativa + '%',
            width: larguraRelativa + '%',
            height: alturaRelativa + '%',
            fundo: bloco.querySelector('.cor-fundo').value
        };

        // Adiciona dados específicos dependendo do tipo
        if (dadosDoBloco.tipo === 'texto') {
            dadosDoBloco.texto = bloco.querySelector('.texto').innerHTML;
        } 
        else if (dadosDoBloco.tipo === 'titulo-texto') {
            dadosDoBloco.titulo = bloco.querySelector('.area-titulo').innerHTML;
            dadosDoBloco.texto = bloco.querySelector('.texto').innerHTML;
        } 
        else if (dadosDoBloco.tipo === 'desenho') {
            // Converte o desenho feito no canvas para uma imagem em formato de texto (Base64)
            dadosDoBloco.desenho = bloco.querySelector('canvas').toDataURL();
        }

        arrayDeDados.push(dadosDoBloco);
    });

    localStorage.setItem('meusBlocosSalvos', JSON.stringify(arrayDeDados));
}

function carregarBlocos() {
    // Pega o textão do localStorage
    const dadosSalvos = localStorage.getItem('meusBlocosSalvos');

    // Se existir alguma coisa salva, nós vamos ler
    if (dadosSalvos) {
        // Converte o texto (JSON) de volta para uma lista (Array)
        const arrayDeDados = JSON.parse(dadosSalvos);

        // Para cada item da lista, mandamos a Fábrica criar o bloco
        arrayDeDados.forEach(dadoDoBloco => {
            criarBlocoNaTela(dadoDoBloco);
        });
    }
}

// Este comando executa a função de carregar assim que o código começa a rodar
carregarBlocos();

// Esta função cria o bloco no HTML e já ativa todas as funções (arrastar, cores, etc.)
// O parâmetro 'dados' serve para preencher o bloco caso ele venha da memória.
// 2. A FÁBRICA DE BLOCOS (Agora 100% Responsiva)
// 2. A FÁBRICA DE BLOCOS MULTI-TIPOS (Borracha e Lápis com Proporção Perfeita)
function criarBlocoNaTela(dados = null) {
    const area = document.getElementById('area-trabalho');
    const bloco = document.createElement('div');
    bloco.className = 'bloco';
    
    const tipoDoBloco = dados ? dados.tipo : document.getElementById('seletor-tipo').value;
    bloco.dataset.tipo = tipoDoBloco; 
    
    bloco.style.top = dados ? dados.top : '10%';
    bloco.style.left = dados ? dados.left : '10%';
    bloco.style.width = dados ? dados.width : '25%';
    bloco.style.height = dados ? dados.height : '20%';
    
    const corFundoPadrao = dados ? dados.fundo : '#ffffff';
    bloco.style.backgroundColor = corFundoPadrao;

    // 1. CONSTRUÇÃO DO HTML
    let htmlInterno = `
        <div class="cabecalho">
            <div class="controles-cor">
                <input type="color" class="cor-fundo" value="${corFundoPadrao}" title="Mudar Cor do Fundo">
            </div>
            <button class="btn-excluir" title="Excluir Bloco">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `;

    if (tipoDoBloco === 'texto') {
        const textoPadrao = dados && dados.texto ? dados.texto : '';
        htmlInterno += `<div class="texto" contenteditable="true">${textoPadrao}</div>`;
    } 
    else if (tipoDoBloco === 'titulo-texto') {
        const tituloPadrao = dados && dados.titulo ? dados.titulo : '';
        const textoPadrao = dados && dados.texto ? dados.texto : '';
        htmlInterno += `
            <div class="area-titulo" contenteditable="true">${tituloPadrao}</div>
            <div class="texto" contenteditable="true">${textoPadrao}</div>
        `;
    } 
    else if (tipoDoBloco === 'desenho') {
        htmlInterno += `
            <div class="ferramentas-desenho">
                <button class="btn-ferramenta ativo btn-lapis" title="Lápis"><i class="fa-solid fa-pencil"></i></button>
                <button class="btn-ferramenta btn-borracha" title="Borracha"><i class="fa-solid fa-eraser"></i></button>
                <button class="btn-ferramenta btn-limpar" title="Limpar Tudo"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <canvas width="800" height="600" class="area-canvas"></canvas>
        `;
    }

    bloco.innerHTML = htmlInterno;

    // 2. EVENTOS GERAIS
    bloco.querySelector('.btn-excluir').onclick = () => { bloco.remove(); salvarBlocos(); };
    bloco.querySelector('.cor-fundo').addEventListener('input', (e) => { bloco.style.backgroundColor = e.target.value; salvarBlocos(); });
    bloco.addEventListener('mouseup', () => {
        bloco.style.width = (bloco.offsetWidth / area.clientWidth) * 100 + '%';
        bloco.style.height = (bloco.offsetHeight / area.clientHeight) * 100 + '%';
        salvarBlocos(); 
    });

    // 3. EVENTOS ESPECÍFICOS POR TIPO
    if (tipoDoBloco === 'texto' || tipoDoBloco === 'titulo-texto') {
        bloco.querySelector('.texto').addEventListener('input', salvarBlocos);
        if (tipoDoBloco === 'titulo-texto') {
            bloco.querySelector('.area-titulo').addEventListener('input', salvarBlocos);
        }
    } 
    else if (tipoDoBloco === 'desenho') {
        const canvas = bloco.querySelector('canvas');
        const pincel = canvas.getContext('2d');
        let desenhando = false;
        
        // NOVA VARIÁVEL: Guarda o tamanho visual desejado na tela
        let espessuraBase = 3; 

        pincel.lineCap = 'round';
        pincel.lineJoin = 'round';
        canvas.style.cursor = 'crosshair'; 

        const btnLapis = bloco.querySelector('.btn-lapis');
        const btnBorracha = bloco.querySelector('.btn-borracha');
        const btnLimpar = bloco.querySelector('.btn-limpar');

        btnLapis.onclick = () => {
            pincel.globalCompositeOperation = 'source-over'; 
            espessuraBase = 3; // Lápis fininho na tela
            canvas.style.cursor = 'crosshair';
            btnLapis.classList.add('ativo');
            btnBorracha.classList.remove('ativo');
        };

        btnBorracha.onclick = () => {
            pincel.globalCompositeOperation = 'destination-out'; 
            espessuraBase = 20; // Borracha grande na tela
            
            // Cursor de 20x20 pixels reais (alinha com a espessuraBase)
            const cursorSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='10' cy='10' r='9.5' fill='rgba(200,200,200,0.5)' stroke='black' stroke-width='1'/%3E%3C/svg%3E") 10 10, auto`;
            canvas.style.cursor = cursorSvg;
            
            btnBorracha.classList.add('ativo');
            btnLapis.classList.remove('ativo');
        };

        btnLimpar.onclick = () => {
            pincel.clearRect(0, 0, canvas.width, canvas.height); 
            salvarBlocos();
        };

        if (dados && dados.desenho) {
            let imagemSalva = new Image();
            imagemSalva.src = dados.desenho;
            imagemSalva.onload = () => pincel.drawImage(imagemSalva, 0, 0);
        }

        canvas.onmousedown = (e) => {
            desenhando = true;
            
            // O PULO DO GATO: Calcula a espessura dinamicamente baseada no tamanho atual do bloco!
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

    // 4. LÓGICA DE ARRASTAR
    const cabecalho = bloco.querySelector('.cabecalho');
    let inicioX, inicioY, leftInicial, topInicial;
    
    cabecalho.onmousedown = (evento) => {
        if(evento.target.tagName === 'INPUT' || evento.target.tagName === 'BUTTON' || evento.target.tagName === 'I') return;
        evento.preventDefault();
        
        inicioX = evento.clientX; inicioY = evento.clientY;
        leftInicial = bloco.offsetLeft; topInicial = bloco.offsetTop;
        
        document.onmousemove = (ev) => {
            ev.preventDefault();
            const movimentoX = ev.clientX - inicioX;
            const movimentoY = ev.clientY - inicioY;
            let novaPosEsquerda = leftInicial + movimentoX;
            let novaPosTopo = topInicial + movimentoY;

            const limiteMaximoEsquerda = area.clientWidth - bloco.offsetWidth;
            const limiteMaximoTopo = area.clientHeight - bloco.offsetHeight;

            if (novaPosEsquerda < 0) novaPosEsquerda = 0;
            if (novaPosEsquerda > limiteMaximoEsquerda) novaPosEsquerda = limiteMaximoEsquerda;
            if (novaPosTopo < 0) novaPosTopo = 0;
            if (novaPosTopo > limiteMaximoTopo) novaPosTopo = limiteMaximoTopo;

            bloco.style.left = novaPosEsquerda + 'px';
            bloco.style.top = novaPosTopo + 'px';
        };
        
        document.onmouseup = () => {
            document.onmousemove = null; document.onmouseup = null;
            bloco.style.left = (bloco.offsetLeft / area.clientWidth) * 100 + '%';
            bloco.style.top = (bloco.offsetTop / area.clientHeight) * 100 + '%';
            salvarBlocos();
        };
    };

    area.appendChild(bloco);
    salvarBlocos();
}

// O botão agora apenas chama a fábrica de blocos vazia
btnAdd.addEventListener('click', () => {
    criarBlocoNaTela(); 
});

// --- LÓGICA DE EXPORTAR E IMPORTAR ---

const btnExportar = document.getElementById('btn-exportar');
const btnImportar = document.getElementById('btn-importar');
const inputArquivo = document.getElementById('input-arquivo');

// 1. Função de Exportar
btnExportar.addEventListener('click', () => {
    // Garante que o localStorage está 100% atualizado
    salvarBlocos(); 
    
    const dadosSalvos = localStorage.getItem('meusBlocosSalvos');
    
    // Verifica se há blocos para exportar
    if (!dadosSalvos || dadosSalvos === '[]') {
        alert("Não há blocos na tela para exportar!");
        return; // Para a execução da função aqui
    }

    // Cria um arquivo temporário (Blob) com os dados em formato JSON
    const arquivoBlob = new Blob([dadosSalvos], { type: 'application/json' });
    
    // Cria uma URL temporária para esse arquivo
    const urlTemporaria = URL.createObjectURL(arquivoBlob);
    
    // Cria um link <a> invisível, configura para download e "clica" nele
    const linkDownload = document.createElement('a');
    linkDownload.href = urlTemporaria;
    linkDownload.download = 'meus_blocos.json'; // Nome do arquivo que será baixado
    linkDownload.click();
    
    // Limpa a memória apagando a URL temporária
    URL.revokeObjectURL(urlTemporaria);
});

// 2. Função de Importar (Aciona a janela de seleção)
btnImportar.addEventListener('click', () => {
    // Finge um clique no input de arquivo escondido
    inputArquivo.click(); 
});

// 3. Função que lê o arquivo após ele ser selecionado
inputArquivo.addEventListener('change', (evento) => {
    const arquivoSelecionado = evento.target.files[0];
    
    // Se o usuário cancelou a janela, não faz nada
    if (!arquivoSelecionado) return; 

    const leitor = new FileReader();

    // Define o que acontece quando o leitor terminar de carregar o arquivo
    leitor.onload = (e) => {
        try {
            // Converte o texto do arquivo de volta para uma Lista (Array)
            const blocosImportados = JSON.parse(e.target.result);
            
            // Limpa a área de trabalho atual
            area.innerHTML = '';
            
            // Cria cada bloco na tela com os dados importados
            blocosImportados.forEach(dadoDoBloco => {
                criarBlocoNaTela(dadoDoBloco);
            });
            
            // Salva a nova configuração no localStorage
            salvarBlocos(); 
            
        } catch (erro) {
            // Se o arquivo não for um JSON válido, avisa o usuário
            alert("Erro ao importar: O arquivo selecionado não é válido ou está corrompido.");
        }
        
        // Reseta o input para permitir importar o mesmo arquivo novamente se necessário
        inputArquivo.value = ''; 
    };

    // Manda o leitor ler o arquivo como texto simples
    leitor.readAsText(arquivoSelecionado);
});