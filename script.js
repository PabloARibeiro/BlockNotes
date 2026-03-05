// LÓGICA DO PROGRAMA
        const btnAdd = document.getElementById('btn-add');
        const area = document.getElementById('area-trabalho');

        btnAdd.addEventListener('click', () => {
            // Cria a caixa do bloco
            const bloco = document.createElement('div');
            bloco.className = 'bloco';
            bloco.style.top = '20px';
            bloco.style.left = '20px';
            
            // Coloca os botões e texto dentro do bloco
            // Nota: Os dois inputs de cor estão lado a lado dentro da div 'controles-cor'
            bloco.innerHTML = `
                <div class="cabecalho">
                    <div class="controles-cor">
                        <input type="color" class="cor-fundo" value="#ffffff" title="Mudar Fundo">
                        <input type="color" class="cor-borda" value="#000000" title="Mudar Borda">
                    </div>
                    <button class="btn-excluir">X</button>
                </div>
                <div class="texto" contenteditable="true"></div>
            `;
            
            // 1. Fazer o X excluir o bloco
            bloco.querySelector('.btn-excluir').onclick = () => bloco.remove();
            
            // 2. Fazer as Cores funcionarem
            const inputFundo = bloco.querySelector('.cor-fundo');
            const inputBorda = bloco.querySelector('.cor-borda');
            
            inputFundo.addEventListener('input', (evento) => {
                bloco.style.backgroundColor = evento.target.value;
            });
            
            inputBorda.addEventListener('input', (evento) => {
                bloco.style.borderColor = evento.target.value;
            });
            
            // 3. Fazer o Arrastar funcionar
            const cabecalho = bloco.querySelector('.cabecalho');
            let inicioX, inicioY, leftInicial, topInicial;
            
            cabecalho.onmousedown = (evento) => {
                // Se o clique for nas cores ou no X, não arrasta
                if(evento.target.tagName === 'INPUT' || evento.target.tagName === 'BUTTON') return;
                
                evento.preventDefault();
                // Pega a posição inicial de tudo
                inicioX = evento.clientX; 
                inicioY = evento.clientY;
                leftInicial = bloco.offsetLeft; 
                topInicial = bloco.offsetTop;
                
                document.onmousemove = (ev) => {
                    ev.preventDefault();
                    // Calcula a diferença do movimento do mouse e aplica no bloco
                    const movimentoX = ev.clientX - inicioX;
                    const movimentoY = ev.clientY - inicioY;
                    bloco.style.left = (leftInicial + movimentoX) + 'px';
                    bloco.style.top = (topInicial + movimentoY) + 'px';
                };
                
                // Quando soltar o clique, para de arrastar
                document.onmouseup = () => {
                    document.onmousemove = null;
                    document.onmouseup = null;
                };
            };
            
            // Coloca o bloco na tela
            area.appendChild(bloco);
        });