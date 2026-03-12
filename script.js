// LÓGICA DO PROGRAMA
const btnAdd = document.getElementById('btn-add');
const area = document.getElementById('area-trabalho');

// 1. FUNÇÃO QUE SALVA TUDO EM PORCENTAGEM (Design Responsivo)
function salvarBlocos() {
    const area = document.getElementById('area-trabalho');
    // Descobre o tamanho atual da área de trabalho
    const larguraArea = area.clientWidth;
    const alturaArea = area.clientHeight;
    
    const todosOsBlocos = document.querySelectorAll('.bloco');
    const arrayDeDados = [];

    todosOsBlocos.forEach(bloco => {
        // A Matemática Mágica: (Posição do Bloco / Tamanho da Tela) * 100
        let posEsquerdaRelativa = (bloco.offsetLeft / larguraArea) * 100;
        let posTopoRelativa = (bloco.offsetTop / alturaArea) * 100;
        
        // Fazemos o mesmo para o tamanho (Largura e Altura) do bloco
        let larguraRelativa = (bloco.offsetWidth / larguraArea) * 100;
        let alturaRelativa = (bloco.offsetHeight / alturaArea) * 100;

        arrayDeDados.push({
            top: posTopoRelativa + '%',    // Agora salva como "%"
            left: posEsquerdaRelativa + '%', // Agora salva como "%"
            width: larguraRelativa + '%',
            height: alturaRelativa + '%',
            fundo: bloco.querySelector('.cor-fundo').value,
            borda: bloco.querySelector('.cor-borda').value,
            texto: bloco.querySelector('.texto').innerHTML
        });
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
function criarBlocoNaTela(dados = null) {
    const area = document.getElementById('area-trabalho');
    const bloco = document.createElement('div');
    bloco.className = 'bloco';
    
    // Agora os valores padrão de um bloco novo são em Porcentagem (%)
    bloco.style.top = dados ? dados.top : '10%';
    bloco.style.left = dados ? dados.left : '10%';
    bloco.style.width = dados ? dados.width : '25%';
    bloco.style.height = dados ? dados.height : '20%';
    
    const corFundoPadrao = dados ? dados.fundo : '#ffffff';
    const corBordaPadrao = dados ? dados.borda : '#000000';
    const textoPadrao = dados ? dados.texto : '';

    bloco.style.backgroundColor = corFundoPadrao;
    bloco.style.borderColor = corBordaPadrao;

    bloco.innerHTML = `
        <div class="cabecalho">
            <div class="controles-cor">
                <input type="color" class="cor-fundo" value="${corFundoPadrao}" title="Mudar Fundo">
                <input type="color" class="cor-borda" value="${corBordaPadrao}" title="Mudar Borda">
            </div>
            <button class="btn-excluir">X</button>
        </div>
        <div class="texto" contenteditable="true">${textoPadrao}</div>
    `;

    // --- GATILHOS DO AUTO-SAVE ---
    bloco.querySelector('.btn-excluir').onclick = () => { 
        bloco.remove(); 
        salvarBlocos(); 
    };
    
    bloco.querySelector('.cor-fundo').addEventListener('input', (e) => {
        bloco.style.backgroundColor = e.target.value;
        salvarBlocos(); 
    });
    
    bloco.querySelector('.cor-borda').addEventListener('input', (e) => {
        bloco.style.borderColor = e.target.value;
        salvarBlocos(); 
    });

    bloco.querySelector('.texto').addEventListener('input', () => {
        salvarBlocos(); 
    });

    bloco.addEventListener('mouseup', () => {
        // Quando soltar o redimensionamento, converte pra % na hora
        bloco.style.width = (bloco.offsetWidth / area.clientWidth) * 100 + '%';
        bloco.style.height = (bloco.offsetHeight / area.clientHeight) * 100 + '%';
        salvarBlocos(); 
    });

    // Lógica de Arrastar
    const cabecalho = bloco.querySelector('.cabecalho');
    let inicioX, inicioY, leftInicial, topInicial;
    
    cabecalho.onmousedown = (evento) => {
        if(evento.target.tagName === 'INPUT' || evento.target.tagName === 'BUTTON') return;
        evento.preventDefault();
        
        inicioX = evento.clientX; 
        inicioY = evento.clientY;
        leftInicial = bloco.offsetLeft; 
        topInicial = bloco.offsetTop;
        
        document.onmousemove = (ev) => {
            ev.preventDefault();
            
            // 1. Calcula para onde o usuário quer levar o bloco
            const movimentoX = ev.clientX - inicioX;
            const movimentoY = ev.clientY - inicioY;
            let novaPosicaoEsquerda = leftInicial + movimentoX;
            let novaPosicaoTopo = topInicial + movimentoY;

            // 2. Calcula os limites máximos do Canvas
            // Subtraímos o tamanho do bloco para que ele não passe da borda direita/inferior
            const limiteMaximoEsquerda = area.clientWidth - bloco.offsetWidth;
            const limiteMaximoTopo = area.clientHeight - bloco.offsetHeight;

            // 3. Aplica as "Paredes Invisíveis" (Travas)
            // Trava na Esquerda
            if (novaPosicaoEsquerda < 0) {
                novaPosicaoEsquerda = 0;
            }
            // Trava na Direita
            if (novaPosicaoEsquerda > limiteMaximoEsquerda) {
                novaPosicaoEsquerda = limiteMaximoEsquerda;
            }
            // Trava no Topo
            if (novaPosicaoTopo < 0) {
                novaPosicaoTopo = 0;
            }
            // Trava Embaixo
            if (novaPosicaoTopo > limiteMaximoTopo) {
                novaPosicaoTopo = limiteMaximoTopo;
            }

            // 4. Aplica a posição corrigida ao bloco na tela
            bloco.style.left = novaPosicaoEsquerda + 'px';
            bloco.style.top = novaPosicaoTopo + 'px';
        };
        
        document.onmouseup = () => {
            document.onmousemove = null;
            document.onmouseup = null;
            
            // O PULO DO GATO: Assim que solta o bloco, converte a posição de pixels para %
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