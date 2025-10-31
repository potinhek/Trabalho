const express = require('express');
const app = express();
const port = 3123; // Porta do seu Dockerfile

// --- PROMETHEUS ---
const client = require('prom-client');
const register = new client.Registry();

// 1. Coleta métricas padrão (CPU, memória) e as registra
client.collectDefaultMetrics({ register });

// 2. Cria sua métrica customizada
const counter = new client.Counter({
  name: 'app_requests_total',
  help: 'contador de requesições recebidas',
  labelNames: ['method', 'path'] // Adicionei labels para ficar mais útil
});

// 3. Registra sua métrica customizada
register.registerMetric(counter);

// --- ROTAS DA APLICAÇÃO ---

app.get('/', (req, res) => {
  // Incrementa o contador usando os labels
  counter.inc({ method: 'GET', path: '/' });
  res.send('Prometheus+Grafana+kubernetes!!!');
});

// --- ROTA DE MÉTRICAS ---
app.get('/metrics', async (req, res) => {
  try {
    // CORREÇÃO AQUI: Use 'register', e não 'client.register'
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// --- INICIA O SERVIDOR ---
app.listen(port, () => {
    console.log(`App rodando na porta ${port}`);
});