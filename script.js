// Dados iniciais (simulando um banco de dados)
let registros = JSON.parse(localStorage.getItem('registrosCabeleireiro')) || [
    {
        id: 1,
        nome: "Maria Silva",
        data: "2023-10-15",
        procedimento: "Coloração",
        valor: 120.00,
        observacoes: "Cabelos loiros com mechas mais claras"
    },
    {
        id: 2,
        nome: "Joana Santos",
        data: "2023-10-16",
        procedimento: "Corte de Cabelo",
        valor: 45.00,
        observacoes: "Corte na altura dos ombros"
    },
    {
        id: 3,
        nome: "Carlos Oliveira",
        data: "2023-10-17",
        procedimento: "Hidratação",
        valor: 85.00,
        observacoes: "Produtos para cabelos cacheados"
    }
];

// Elementos DOM
const formContainer = document.getElementById('form-container');
const listContainer = document.getElementById('list-container');
const tabs = document.querySelectorAll('.tab');
const form = document.getElementById('agendamento-form');
const searchInput = document.getElementById('search-input');
const registrosLista = document.getElementById('registros-lista');
const limparBtn = document.getElementById('limpar-btn');
const messageDiv = document.getElementById('message');

// Variáveis para controle
let editandoId = null;

// Inicializar a data atual
document.getElementById('data').valueAsDate = new Date();

// Navegação por abas
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remover classe active de todas as abas
        tabs.forEach(t => t.classList.remove('active'));
        // Adicionar classe active na aba clicada
        tab.classList.add('active');
        
        // Mostrar o conteúdo correspondente
        const tabName = tab.getAttribute('data-tab');
        
        if (tabName === 'form') {
            formContainer.style.display = 'block';
            listContainer.style.display = 'none';
        } else {
            formContainer.style.display = 'none';
            listContainer.style.display = 'block';
            renderizarRegistros();
        }
    });
});

// Salvar/editar registro
// Substitua pela URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz9dzjj3W6yNRD9tKyyRt8SnPr75k1_JOCTA_9hALkDHj3A8M5kK73-rz4-ObAA--H-qw/exec';

form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const nome = document.getElementById('nome').value.trim();
    const data = document.getElementById('data').value;
    const procedimento = document.getElementById('procedimento').value;
    let valorVisual = document.getElementById('valor').value;
    const observacoes = document.getElementById('observacoes').value.trim();

    // Dados que serão enviados para a planilha
    const dadosParaEnvio = {
        nome: nome,
        data: data,
        procedimento: procedimento,
        valor: valorVisual,
        observacoes: observacoes
    };

    mostrarMensagem('Salvando agendamento...', 'success');

    // Enviar para o Google Apps Script via POST usando fetch (com modo no-cors)
    // Nota: O Apps Script tem uma peculiaridade com CORS, o modo 'no-cors' funciona para envio simples.
    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Importante para Google Apps Script
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosParaEnvio)
    })
    .then(() => {
        // Como usamos no-cors, o navegador não consegue ler a resposta de sucesso, 
        // mas se não der erro, ele enviou.
        
        // Atualizar interface local
        const valorNumerico = parseFloat(valorVisual.replace("R$ ", "").replace(/\./g, "").replace(",", ".")) || 0;
        const novoId = Date.now();
        
        registros.push({
            id: novoId,
            nome,
            data,
            procedimento,
            valor: valorNumerico,
            observacoes
        });
        
        salvarNoLocalStorage();
        limparFormulario();
        renderizarRegistros();
        mostrarMensagem('Salvo com sucesso na planilha!', 'success');
    })
    .catch(error => {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao conectar com a planilha.', 'error');
    });
});

// Limpar formulário
limparBtn.addEventListener('click', limparFormulario);

// Pesquisar registros
searchInput.addEventListener('input', renderizarRegistros);

// Funções auxiliares
function mostrarMensagem(texto, tipo) {
    messageDiv.textContent = texto;
    messageDiv.className = `message ${tipo}`;
    messageDiv.style.display = 'flex';
    
    // Ocultar mensagem após 4 segundos
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 4000);
}

function limparFormulario() {
    form.reset();
    document.getElementById('data').valueAsDate = new Date();
    editandoId = null;
    document.querySelector('.btn i').className = 'fas fa-save';
    document.querySelector('.btn').innerHTML = '<i class="fas fa-save"></i> Salvar';
}

function salvarNoLocalStorage() {
    localStorage.setItem('registrosCabeleireiro', JSON.stringify(registros));
}

function formatarData(dataStr) {
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR');
}

function mascaraMoeda(input) {
    let valor = input.value.replace(/\D/g, "");
    valor = (valor / 100).toFixed(2) + "";
    valor = valor.replace(".", ",");
    valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    input.value = "R$ " + valor;
}

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function renderizarRegistros() {
    const termoPesquisa = searchInput.value.toLowerCase();
    
    // Filtrar registros
    const registrosFiltrados = registros.filter(reg => {
        return (
            reg.nome.toLowerCase().includes(termoPesquisa) ||
            reg.procedimento.toLowerCase().includes(termoPesquisa) ||
            (reg.observacoes && reg.observacoes.toLowerCase().includes(termoPesquisa))
        );
    });
    
    // Ordenar por data (mais recente primeiro)
    registrosFiltrados.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    // Renderizar
    if (registrosFiltrados.length === 0) {
        registrosLista.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>Nenhum agendamento</h3>
                <p>${termoPesquisa ? 'Tente outra pesquisa.' : 'Adicione seu primeiro agendamento.'}</p>
            </div>
        `;
        return;
    }
    
    registrosLista.innerHTML = registrosFiltrados.map(reg => {
        return `
            <div class="registro-item" data-id="${reg.id}">
                <div class="registro-header">
                    <div class="cliente-nome">${reg.nome}</div>
                    <div class="registro-data">${formatarData(reg.data)}</div>
                </div>
                
                <div class="registro-detalhes">
                    <div class="procedimento">${reg.procedimento}</div>
                    <div class="valor">${formatarMoeda(reg.valor)}</div>
                </div>
                
                ${reg.observacoes ? `<div class="observacoes">${reg.observacoes}</div>` : ''}
                
                <div class="acoes">
                    <button class="acao-btn acao-editar" onclick="editarRegistro(${reg.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="acao-btn acao-excluir" onclick="excluirRegistro(${reg.id})">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Funções para ações nos registros
window.editarRegistro = function(id) {
    const registro = registros.find(reg => reg.id === id);
    if (!registro) return;

    document.getElementById('nome').value = registro.nome;
    document.getElementById('data').value = registro.data;
    document.getElementById('procedimento').value = registro.procedimento;
    
    // Formata o número puro (1111.11) para o padrão visual (R$ 1.111,11)
    const valorInput = document.getElementById('valor');
    valorInput.value = registro.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    document.getElementById('observacoes').value = registro.observacoes || ''
    
    // Alterar botão para edição
    editandoId = id;
    document.querySelector('.btn i').className = 'fas fa-edit';
    document.querySelector('.btn').innerHTML = '<i class="fas fa-edit"></i> Atualizar';
    
    // Ir para a aba de formulário
    tabs[0].click();
    
    // Rolagem suave para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    mostrarMensagem('Editando: ' + registro.nome, 'success');
};

window.excluirRegistro = function(id) {
    if (!confirm('Excluir este agendamento?')) {
        return;
    }
    
    const nomeCliente = registros.find(reg => reg.id === id).nome;
    registros = registros.filter(reg => reg.id !== id);
    
    salvarNoLocalStorage();
    renderizarRegistros();
    
    mostrarMensagem(`${nomeCliente} excluído!`, 'success');
};

// Inicializar a aplicação
salvarNoLocalStorage();
renderizarRegistros();

