const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzPA7i_zEYbHlheUySvJy8YYM8tHv1O2a519vu-vVTAfN9cpc_kPQ76eLkJ8Mcov3aE/exec';

let registros = [];

// Elementos DOM
const formContainer = document.getElementById('form-container');
const listContainer = document.getElementById('list-container');
const tabs = document.querySelectorAll('.tab');
const form = document.getElementById('agendamento-form');
const searchInput = document.getElementById('search-input');
const registrosLista = document.getElementById('registros-lista');
const messageDiv = document.getElementById('message');

// Inicializar a data atual no formulário
document.getElementById('data').valueAsDate = new Date();
// No listener das abas, adicione a lógica para exibir o dashboard
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const tabName = tab.getAttribute('data-tab');
        
        // Esconder todos os containers
        formContainer.style.display = 'none';
        listContainer.style.display = 'none';
        document.getElementById('dashboard-container').style.display = 'none';

        if (tabName === 'form') {
            formContainer.style.display = 'block';
        } else if (tabName === 'list') {
            listContainer.style.display = 'block';
            carregarDadosDaPlanilha();
        } else if (tabName === 'dashboard') {
            document.getElementById('dashboard-container').style.display = 'block';
            atualizarDashboard(); // Nova função
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
    })
    .catch(error => {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao ligar à planilha.', 'error');
    });
});

// FUNÇÃO: Procurar dados na Planilha (doGet)
async function carregarDadosDaPlanilha() {
    registrosLista.innerHTML = '<div class="empty-state"><i class="fas fa-sync fa-spin"></i><p>A carregar dados...</p></div>';
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const dados = await response.json();
        
        // Inverte a ordem para mostrar os mais recentes primeiro
        registros = dados.reverse();
        renderizarRegistros();
    } catch (error) {
        console.error("Erro ao carregar:", error);
        registrosLista.innerHTML = '<p style="text-align:center;color:red;">Erro ao carregar dados.</p>';
    }
}

// FUNÇÃO: Renderizar a lista compacta
function renderizarRegistros() {
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

function atualizarDashboard() {
    if (registros.length === 0) return;

    let totalBruto = 0;
    const stats = {};

    registros.forEach(reg => {
        console.log(`Processando: ${reg.procedimento} - ${reg.valor}`);
        // Limpar o valor (ex: "R$ 130,00" -> 130.00)
        const valorNumerico = parseFloat(reg.valor.replace(/[R$\.\s]/g, '').replace(',', '.')) || 0;
        totalBruto += valorNumerico;

        if (!stats[reg.procedimento]) {
            stats[reg.procedimento] = { qtd: 0, soma: 0 };
        }
        stats[reg.procedimento].qtd++;
        stats[reg.procedimento].soma += valorNumerico;
    });

    // Atualiza os Cards
    document.getElementById('dash-total-valor').innerText = totalBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('dash-total-qtd').innerText = registros.length;

    // Gera a lista de procedimentos
    let htmlProc = '<h3>Média por Procedimento</h3>';
    for (const proc in stats) {
        const media = stats[proc].soma / stats[proc].qtd;
        htmlProc += `
            <div class="registro-item">
                <div class="registro-header">
                    <span class="cliente-nome">${proc} (${stats[proc].qtd})</span>
                    <span class="valor">Média: ${media.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
            </div>`;
    }
    document.getElementById('procedimentos-stats').innerHTML = htmlProc;
}