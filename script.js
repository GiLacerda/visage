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
            carregarDadosDaPlanilha(); // Carrega sempre para garantir dados atualizados
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
        registros = []; 
    })
    .catch(error => {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao ligar à planilha.', 'error');
    });
});

// FUNÇÃO: Procurar dados na Planilha (doGet)
async function carregarDadosDaPlanilha() {
    if (listContainer.style.display !== 'none') {
        registrosLista.innerHTML = '<div class="empty-state"><i class="fas fa-sync fa-spin"></i><p>A carregar dados...</p></div>';
    }
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const dados = await response.json();
        
        registros = dados.reverse();
        
        renderizarRegistros();
        
        // Garante que o seletor de meses seja criado e o dashboard calculado
        if (registros.length > 0) {
            preencherMeses();
            atualizarDashboard();
        }
        
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

// Função para identificar meses e preencher o <select>
function preencherMeses() {
    const seletor = document.getElementById('mes-filtro');
    if (!seletor || registros.length === 0) return;

    // Gera lista de Meses/Anos únicos
    const mesesUnicos = [...new Set(registros.map(reg => {
        const data = new Date(reg.data);
        return `${data.getMonth() + 1}/${data.getFullYear()}`;
    }))].sort((a, b) => {
        const [m1, y1] = a.split('/').map(Number);
        const [m2, y2] = b.split('/').map(Number);
        return new Date(y2, m2-1) - new Date(y1, m1-1); // Mais recente primeiro
    });

    const valorSelecionadoAntes = seletor.value;

    seletor.innerHTML = mesesUnicos.map(mesAno => {
        const [mes, ano] = mesAno.split('/');
        const dataReferencia = new Date(ano, mes - 1);
        const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(dataReferencia);
        const mesCapitalizado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
        return `<option value="${mesAno}">${mesCapitalizado} / ${ano}</option>`;
    }).join('');

    // Se já tinha algo selecionado, mantém. Se não, pega o primeiro da lista (mais recente).
    if (valorSelecionadoAntes && mesesUnicos.includes(valorSelecionadoAntes)) {
        seletor.value = valorSelecionadoAntes;
    } else {
        seletor.value = mesesUnicos[0];
    }
}

// DASHBOARD: Lógica de processamento
function atualizarDashboard() {
    const seletorMes = document.getElementById('mes-filtro');
    const dashStatsContainer = document.getElementById('procedimentos-stats');
    
    if (!registros || registros.length === 0 || !seletorMes.value) return;

    const mesAnoSelecionado = seletorMes.value; 

    let totalBruto = 0;
    let contadorAtendimentos = 0;
    const stats = {};

    registros.forEach(reg => {
        const dataReg = new Date(reg.data);
        const mesAnoReg = `${dataReg.getMonth() + 1}/${dataReg.getFullYear()}`;

        if (mesAnoReg === mesAnoSelecionado) {
            contadorAtendimentos++;
            
            let valorRaw = String(reg.valor || "0");
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
        }
    });

    document.getElementById('dash-total-valor').innerText = totalBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('dash-total-qtd').innerText = contadorAtendimentos;

    // Cabeçalho da lista com o nome do mês selecionado
    const nomeMesExibicao = seletorMes.options[seletorMes.selectedIndex]?.text || "";
    let htmlProc = `<h3 style="margin-top:20px; font-size:1rem; color:var(--primary);">Resumo: ${nomeMesExibicao}</h3>`;
    
    const ordenados = Object.keys(stats).sort((a,b) => stats[b].qtd - stats[a].qtd);
    
    ordenados.forEach(proc => {
        const media = stats[proc].soma / stats[proc].qtd;
        htmlProc += `
            <div class="registro-item">
                <div class="registro-header" style="display: flex; justify-content: space-between; width: 100%;">
                    <span class="cliente-nome">${proc} <small>(${stats[proc].qtd}x)</small></span>
                    <span class="valor" style="color: var(--primary); font-weight: bold;">
                        ${media.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                </div>
            </div>`;
    });

    dashStatsContainer.innerHTML = htmlProc;
}

// Listener para quando o usuário trocar o mês manualmente
document.getElementById('mes-filtro').addEventListener('change', atualizarDashboard);