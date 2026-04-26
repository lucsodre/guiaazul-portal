# Guia Azul — Funcionalidades do Aplicativo

**Versão de referência:** 1.0.0 (build 13)  
**Última atualização:** 2026-04-26

---

## Visão Geral

O Guia Azul é um aplicativo de finanças pessoais com assistente de Inteligência Artificial integrado. O objetivo central é tornar o controle financeiro rápido e simples no dia a dia, com IA para acelerar lançamentos, gerar análises e produzir insights acionáveis.

---

## Autenticação

- **Cadastro** com email e senha
- **Login** com email e senha
- **Login com Google** (OAuth via Supabase)
- **Recuperação de senha** por email
- Sessão persistente com renovação automática

---

## Tela Inicial — Home

Ponto central do app. Concentra o resumo financeiro e o acesso rápido às principais ações.

### Painel financeiro
- **Saldo total** calculado sobre todas as contas ativas
- **Lista de contas** com saldo individual e indicador de conta principal
- **Termômetro de gastos** — barra visual que mostra o percentual do orçamento mensal comprometido, com badge de alerta quando ultrapassa 100%
- Filtro de consolidação: exibir todas as transações ou apenas as consolidadas

### Diagnóstico Financeiro (IA)
- Insight diário gerado automaticamente com base no padrão de gastos do mês
- Formatos possíveis: previsão de saldo, alerta de comprometimento de renda, padrão de categoria dominante
- Insight contextual gerado automaticamente quando há nova movimentação no mesmo dia
- Cada insight contém: título, problema identificado, consequência e ação sugerida com botão de CTA

### Insights Diários (IA)
- Cards de insights adicionais baseados em análise do período
- Gerados sob demanda e cacheados durante o dia

### Quick Input — Lançamento Rápido
- Campo de texto multilinhas com expansão automática ao digitar
- **Entrada por voz**: pressionar o botão de microfone inicia a gravação; ao soltar, o áudio é transcrito via OpenAI Whisper e o texto é preenchido automaticamente
- Ícone de limpar campo (exibido quando há conteúdo)
- Ao confirmar, a IA interpreta o texto em linguagem natural e cria a transação automaticamente
- Fallback: se a IA não conseguir interpretar, abre o formulário de nova transação com o texto pré-preenchido
- Feedback imediato (sucesso, informação ou erro) em banner no rodapé

### Gastos por Categoria
- Gráfico de rosca (donut chart) com despesas do mês corrente agrupadas por categoria

### Transações a Vencer
- Lista de transações próximas ou vencidas, com destaque visual por status

---

## Tela Nova Transação

Formulário completo para criação e edição de transações.

### Modo de criação
- Seleção de tipo: **Receita**, **Despesa** ou **Transferência**
- **Smart Input** — campo de texto multilinhas com:
  - Entrada por voz (mesma lógica da Home)
  - Ícone de limpar campo
  - Ao confirmar, a IA preenche todos os campos do formulário automaticamente com base no texto digitado ou transcrito
  - Indicador de confiança da sugestão (alta / média / baixa)
- Campos editáveis: valor, descrição, data, conta de origem, conta de destino (transferência), categoria
- Seleção de data com DateTimePicker nativo
- **Parcelamento**: número de parcelas e parcela de início
- **Recorrência**: ativar recorrência indefinida (mensal)
- Saldo disponível na conta exibido em tempo real

### Modo de edição
- Acessível via deep link com parâmetro `id` (UUID da transação)
- Acessível via link "[Editar]" no chat
- Todos os campos pré-preenchidos com os dados da transação existente
- Opção de consolidar/desconsolidar diretamente no formulário

### Sugestão automática de categoria
- Ao preencher a descrição manualmente, a IA sugere a categoria mais adequada com base no texto

---

## Tela Transações

Lista completa de transações com ferramentas de gestão.

### Listagem
- Agrupamento por data, com saldo do dia
- Resumo mensal fixo no topo: total de receitas, despesas e saldo líquido
- Navegação por mês via MonthTimeline (linha do tempo horizontal)
- Filtro de consolidação: todas / consolidadas

### Ações por transação
- Toque para editar (abre modo edição da tela Nova Transação)
- **Swipe para deletar** (gesto deslizar para a esquerda)
- Consolidar / desconsolidar individualmente
- Indicador visual de status de consolidação

### Seleção em lote
- Modo de seleção múltipla com checkbox
- Ações em lote: deletar, consolidar, desconsolidar
- Contador de itens selecionados

### Indicador de pendências
- Badge com contagem de transações não consolidadas

---

## Tela Relatórios

Análise de gastos com visões gráficas e comparativas.

### Visão por categoria
- Gráfico de rosca com distribuição dos gastos do mês por categoria
- Lista ordenada com valor e percentual por categoria
- Filtro de consolidação

### Visão comparativa
- Comparação de gastos entre o mês atual e o mês anterior por categoria
- Indicadores de variação (aumento / redução)
- Navegação por mês via MonthTimeline

---

## Tela Chat — Assistente de IA

Interface conversacional com a IA para análises, lançamentos e consultas.

### Conversa livre
- Chat em linguagem natural (português)
- Histórico de mensagens na sessão
- **Entrada por voz** no campo de texto do chat

### Criação de transações via chat
- A IA interpreta a mensagem e apresenta um rascunho da transação
- O usuário confirma ou ajusta antes de salvar
- Suporte a ajustes iterativos ("muda o valor para 80")

### Pins — Atalhos de análise
Botões de acesso rápido para análises pré-definidas:

| Pin | O que faz |
|-----|-----------|
| **Resumo recente** | Lista as últimas transações e alterações dos últimos 14 dias, com link "[Editar]" clicável para cada item |
| **Análise mensal** | Análise completa do mês: receitas, despesas, categorias, comparativo e recomendações |
| **Limite diário** | Calcula quanto pode ser gasto por dia até o fim do mês sem comprometer o orçamento |
| **Forecast** | Previsão do saldo ao final do mês com base no ritmo atual de gastos |
| **Top categorias** | Ranking das categorias com maior gasto no mês |

### Links clicáveis no chat
- Transações listadas no Resumo Recente incluem link "[Editar]" que navega diretamente para o formulário de edição da transação

---

## Entrada por Voz

Disponível na Home, Nova Transação e Chat.

- Pressionar e segurar o botão de microfone inicia a gravação de áudio
- Soltar o botão encerra a gravação e envia o áudio para transcrição
- O áudio é enviado em base64 para uma Supabase Edge Function
- A Edge Function repassa para a API OpenAI Whisper com idioma `pt` e temperatura `0`
- O texto transcrito é inserido automaticamente no campo de origem
- Estados visuais: gravando / transcrevendo / erro

---

## Configurações

### Perfil
- Editar nome completo e telefone
- Visualização do email (somente leitura)

### Contas Bancárias
- Listar, criar, editar e excluir contas
- Tipos suportados: Conta Corrente, Poupança, Investimento, Cartão de Crédito, Dinheiro
- Definir conta principal

### Categorias
- Visualizar categorias padrão do sistema (hierárquicas: pai e subcategorias)
- Criar categorias personalizadas
- Ocultar categorias que não são utilizadas
- Personalizar nome, ícone e cor de categorias existentes

### Meu Plano
- Visualização do status da assinatura (ativo, em teste, expirado, cancelado)
- Integração com RevenueCat para gestão de planos
- Acesso à tela de Paywall para upgrade

### Fale Conosco
- Abre o app de email com destinatário `suporte@guiaazulfinancas.com.br` pré-preenchido
- Opções: Enviar Dúvida, Enviar Sugestão, Enviar Reclamação

### Sobre o App
- Versão do app, número de build, channel, runtime version
- Identificador do update OTA ativo
- Origem do bundle (embarcado ou OTA update)

---

## Recursos Transversais

### Resiliência e conectividade
- Detecção de falha de rede com banner amigável "Instabilidade detectada"
- Retry automático em carregamentos com timeout configurável
- Mensagens de erro distintas para falha de rede vs. erro genérico

### Atualização OTA
- Suporte a atualizações over-the-air via Expo Updates sem necessidade de novo build na loja

### Dark Mode
- Suporte automático ao tema do sistema operacional

### Acessibilidade
- `hitSlop` aumentado em botões pequenos para facilitar o toque
- Feedback tátil (haptics) nas ações principais

---

## Integrações e Infraestrutura

| Serviço | Uso |
|---------|-----|
| **Supabase** | Backend, banco de dados PostgreSQL, autenticação e Edge Functions |
| **OpenAI GPT** | Interpretação de linguagem natural, análises financeiras e geração de insights |
| **OpenAI Whisper** | Transcrição de áudio para texto (recurso de entrada por voz) |
| **RevenueCat** | Gestão de assinaturas e controle de acesso a funcionalidades premium |
| **Expo / EAS** | Build, distribuição e atualizações OTA |
