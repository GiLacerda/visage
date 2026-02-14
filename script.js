const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzPA7i_zEYbHlheUySvJy8YYM8tHv1O2a519vu-vVTAfN9cpc_kPQ76eLkJ8Mcov3aE/exec';

let registros = [];

// Elementos DOM
const formContainer = document.getElementById('form-container');
const listContainer = document.getElementById('list-container');
const dashboardContainer = document.getElementById('dashboard-container');
const tabs = document.querySelectorAll('.tab');
const form = document.getElementById('agendamento-form');
const searchInput = document.getElementById('search-input');
const registrosLista = document.getElementById('registros-lista');
const messageDiv = document.getElementById('message');

// Inicializar a data atual no formulário
document.getElementById('data').valueAsDate = new Date();

// Navegação por abas
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const tabName = tab.getAttribute('data-tab');
        
        // Esconder todos os containers
        formContainer.style.display = 'none';
        listContainer.style.display = 'none';
        dashboardContainer.style.display = 'none';

        if (tabName === 'form') {
            formContainer.style.display = 'block';
        } else if (tabName === 'list') {
            listContainer.style.display = 'block';
            carregarDadosDaPlanilha();
        } else if (tabName === 'dashboard') {
            dashboardContainer.style.display = 'block';
            // Se já tivermos registros, apenas atualiza o cálculo. 
            // Se não, carrega da planilha primeiro.
            if (registros.length > 0) {
                atualizarDashboard();
            } else {
                carregarDadosDaPlanilha();
            }
        }
    });
});

// FUNÇÃO: Enviar dados para a Planilha
form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const nome = document.getElementById('nome').value.trim();
    const data = document.getElementById('data').value;
    const procedimento = document.getElementById('procedimento').value;
    const valor = document.getElementById('valor').value;
    const observacoes = document.getElementById('observacoes').value.trim();

    const dadosParaEnvio = { nome, data, procedimento, valor, observacoes };

    mostrarMensagem('A guardar na planilha...', 'success');

    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosParaEnvio)
    })
    .then(() => {
        mostrarMensagem('Sucesso! Registado na nuvem.', 'success');
        form.reset();
        document.getElementById('data').valueAsDate = new Date();
        // Limpa os registros locais para forçar um novo download ao mudar de aba
        registros = []; 
    })
    .catch(error => {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao ligar à planilha.', 'error');
    });
});

// FUNÇÃO: Procurar dados na Planilha (doGet)
async function carregarDadosDaPlanilha() {
    // Feedback visual de carregamento
    if (listContainer.style.display !== 'none') {
        registrosLista.innerHTML = '<div class="empty-state"><i class="fas fa-sync fa-spin"></i><p>A carregar dados...</p></div>';
    }
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const dados = await response.json();
        
        // Inverte a ordem para mostrar os mais recentes primeiro
        registros = dados.reverse();
        
        // Renderiza a lista se a aba estiver aberta
        renderizarRegistros();
        
        // Atualiza o dashboard automaticamente (caso a aba dashboard esteja aberta ou para deixar pronto)
        atualizarDashboard();
        
    } catch (error) {
        console.error("Erro ao carregar:", error);
        if (registrosLista) {
            registrosLista.innerHTML = '<p style="text-align:center;color:red;">Erro ao carregar dados.</p>';
        }
    }
}

// FUNÇÃO: Renderizar a lista compacta
function renderizarRegistros() {
    if (!registrosLista) return;

    const termo = searchInput.value.toLowerCase();
    const filtrados = registros.filter(reg => 
        reg.nome.toLowerCase().includes(termo) || 
        reg.procedimento.toLowerCase().includes(termo)
    );

    if (filtrados.length === 0) {
        registrosLista.innerHTML = '<div class="empty-state"><p>Nenhum registo encontrado.</p></div>';
        return;
    }

    registrosLista.innerHTML = filtrados.map(reg => `
        <div class="registro-item">
            <div class="registro-header">
                <div class="cliente-nome">${reg.nome}</div>
                <div class="registro-data">${new Date(reg.data).toLocaleDateString('pt-BR')}</div>
            </div>
            <div class="registro-detalhes">
                <div class="procedimento">${reg.procedimento}</div>
                <div class="valor">${reg.valor}</div>
            </div>
            ${reg.observacoes ? `<div class="observacoes">${reg.observacoes}</div>` : ''}
        </div>
    `).join('');
}

// Pesquisa em tempo real
searchInput.addEventListener('input', renderizarRegistros);

// Auxiliares
function mostrarMensagem(texto, tipo) {
    messageDiv.textContent = texto;
    messageDiv.className = `message ${tipo}`;
    messageDiv.style.display = 'flex';
    setTimeout(() => { messageDiv.style.display = 'none'; }, 4000);
}

function mascaraMoeda(input) {
    let valor = input.value.replace(/\D/g, "");
    valor = (valor / 100).toFixed(2) + "";
    valor = valor.replace(".", ",");
    valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    input.value = "R$ " + valor;
}

// DASHBOARD: Lógica de processamento
function atualizarDashboard() {
    const dashStatsContainer = document.getElementById('procedimentos-stats');
    
    // 1. Verifica se existem registros carregados
    if (!registros || registros.length === 0) {
        if (dashStatsContainer) {
            dashStatsContainer.innerHTML = '<div class="empty-state"><p>Nenhum dado disponível.</p></div>';
        }
        return;
    }

    let totalBruto = 0;
    const stats = {};

    // 2. Processamento dos dados
    registros.forEach(reg => {
        // Resolve o erro de "replace is not a function" convertendo para String
        let valorRaw = String(reg.valor || "0");
        
        // Limpeza para formato brasileiro
        let valorLimpo = valorRaw
            .replace(/R\$/g, '')
            .replace(/\s/g, '')
            .replace(/\./g, '')
            .replace(',', '.');
            
        const valorNumerico = parseFloat(valorLimpo) || 0;
        totalBruto += valorNumerico;

        const nomeProc = reg.procedimento || "Outros";
        if (!stats[nomeProc]) {
            stats[nomeProc] = { qtd: 0, soma: 0 };
        }
        stats[nomeProc].qtd++;
        stats[nomeProc].soma += valorNumerico;
    });

    // 3. Atualização dos Cards
    const elTotalValor = document.getElementById('dash-total-valor');
    const elTotalQtd = document.getElementById('dash-total-qtd');

    if (elTotalValor) {
        elTotalValor.innerText = totalBruto.toLocaleString('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
        });
    }
    if (elTotalQtd) {
        elTotalQtd.innerText = registros.length;
    }

    // 4. Geração da lista detalhada
    let htmlProc = '<h3 style="margin: 20px 0 10px 0; font-size: 1.1rem; color: var(--primary); border-bottom: 1px solid var(--secondary); padding-bottom: 5px;">Média por Procedimento</h3>';
    
    const procedimentosOrdenados = Object.keys(stats).sort((a, b) => stats[b].qtd - stats[a].qtd);

    procedimentosOrdenados.forEach(proc => {
        const media = stats[proc].soma / stats[proc].qtd;
        htmlProc += `
            <div class="registro-item" style="padding: 10px 0; border-bottom: 1px solid #eee;">
                <div class="registro-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span class="cliente-nome" style="font-weight: 600; color: var(--dark);">${proc} <small style="color: #666; font-weight: normal;">(${stats[proc].qtd}x)</small></span>
                    <span class="valor" style="color: var(--primary); font-weight: bold;">
                        ${media.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                </div>
            </div>`;
    });

    if (dashStatsContainer) {
        dashStatsContainer.innerHTML = htmlProc;
    }
}