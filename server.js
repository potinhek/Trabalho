const express = require('express');
const app = express();
const port = 3123; // Porta do seu Dockerfile

// --- PROMETHEUS ---
const client = require('prom-client');
const register = new client.Registry();

// 1. Coleta métricas padrão (CPU, memória) e as registra
// client.collectDefaultMetrics({ register }); // Registra métricas padrão no 'register' customizado
// Vamos manter como estava no seu original, mas registrar no 'register' é uma boa prática
client.collectDefaultMetrics();


// 2. Cria sua métrica customizada (Contador de requests)
const counter = new client.Counter({
  name: 'app_requests_total',
  help: 'Contador de requisições recebidas',
  labelNames: ['method', 'path', 'status_code'], // Adicionando labels
});

// 3. (NOVO) Cria a métrica de Histograma para latência
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP em segundos',
  labelNames: ['method', 'path', 'code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5] // Buckets em segundos
});

// 4. Registra suas métricas customizadas
register.registerMetric(counter);
register.registerMetric(httpRequestDurationMicroseconds);

// (NOVO) Middleware para medir a duração de TODAS as rotas
app.use((req, res, next) => {
  const endTimer = httpRequestDurationMicroseconds.startTimer();
  
  res.on('finish', () => {
    // Labels para o histograma
    endTimer({ 
      method: req.method, 
      path: req.path, 
      code: res.statusCode 
    });

    // Labels para o contador
    counter.inc({
      method: req.method,
      path: req.path,
      status_code: res.statusCode
    });
  });
  
  next();
});


// --- ROTAS DA APLICAÇÃO ---

app.get('/', (req, res) => {
  // O middleware já está medindo a latência e incrementando o contador
  res.send('Prometheus+Grafana+kubernetes!!!');
});

app.get('/fast', (req, res) => {
  res.status(200).send('Resposta rápida!');
});

app.get('/slow', (req, res) => {
  setTimeout(() => {
    res.status(200).send('Resposta lenta...');
  }, 500); // Atraso de 500ms
});


// --- ROTA DE MÉTRICAS ---
app.get('/metrics', async (req, res) => {
  try {
    // CORREÇÃO APLICADA: Usando 'register.contentType'
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex.toString());
  }
});

// --- INICIA O SERVIDOR ---
app.listen(port, () => {
  console.log(`App rodando na porta ${port}`);
});
