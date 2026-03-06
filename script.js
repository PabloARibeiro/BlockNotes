// LÓGICA DO PROGRAMA
const btnAdd = document.getElementById('btn-add');
const area = document.getElementById('area-trabalho');

function salvarBlocos() {
    // Pega todos os elementos que têm a classe 'bloco'
    const todosOsBlocos = document.querySelectorAll('.bloco');
    const arrayDeDados = []; // Nossa lista vazia

    // Para cada bloco na tela, extraímos as informações
    todosOsBlocos.forEach(bloco => {
        arrayDeDados.push({
            top: bloco.style.top,
            left: bloco.style.left,
            width: bloco.style.width,
            height: bloco.style.height,
            fundo: bloco.querySelector('.cor-fundo').value,
            borda: bloco.querySelector('.cor-borda').value,
            texto: bloco.querySelector('.texto').innerHTML
        });
    });

    // Transforma a lista em texto (JSON) e salva no cofre do navegador
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
function criarBlocoNaTela(dados = null) {
    const bloco = document.createElement('div');
    bloco.className = 'bloco';
    
    // Se vieram dados da memória, usa eles. Se não, usa os valores padrão (bloco novo)
    bloco.style.top = dados ? dados.top : '20px';
    bloco.style.left = dados ? dados.left : '20px';
    bloco.style.width = dados ? dados.width : '250px';
    bloco.style.height = dados ? dados.height : '150px';
    
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

    // --- GATILHOS DO AUTO-SAVE NAS AÇÕES ---

    // Excluir
    bloco.querySelector('.btn-excluir').onclick = () => { 
        bloco.remove(); 
        salvarBlocos(); // Salva após deletar
    };
    
    // Cores
    bloco.querySelector('.cor-fundo').addEventListener('input', (e) => {
        bloco.style.backgroundColor = e.target.value;
        salvarBlocos(); // Salva ao mudar cor
    });
    
    bloco.querySelector('.cor-borda').addEventListener('input', (e) => {
        bloco.style.borderColor = e.target.value;
        salvarBlocos(); // Salva ao mudar cor
    });

    // Digitar Texto
    bloco.querySelector('.texto').addEventListener('input', () => {
        salvarBlocos(); // Salva a cada letra digitada
    });

    // Redimensionar (Captura quando você solta o clique do mouse no bloco inteiro)
    bloco.addEventListener('mouseup', () => {
        salvarBlocos(); // Salva o novo tamanho
    });

    // Arrastar
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
            const movimentoX = ev.clientX - inicioX;
            const movimentoY = ev.clientY - inicioY;
            bloco.style.left = (leftInicial + movimentoX) + 'px';
            bloco.style.top = (topInicial + movimentoY) + 'px';
        };
        
        document.onmouseup = () => {
            document.onmousemove = null;
            document.onmouseup = null;
            salvarBlocos(); // Salva a nova posição quando termina de arrastar
        };
    };

    // Coloca o bloco na tela e salva
    area.appendChild(bloco);
    salvarBlocos();
}

// O botão agora apenas chama a fábrica de blocos vazia
btnAdd.addEventListener('click', () => {
    criarBlocoNaTela(); 
});