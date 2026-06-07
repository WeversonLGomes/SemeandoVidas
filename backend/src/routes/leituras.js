const router = require('express').Router();
const { requireAuth, requireDevice } = require('../middleware/auth');
const ctrl = require('../controllers/leiturasController');

// Recepção de dados do ESP32 — autenticado por device_id
router.post('/esp32', requireDevice, ctrl.receberDadosEsp32);

// Consultas do dashboard — autenticado por JWT do usuário
router.get('/umidade/:plantaId',   requireAuth, ctrl.umidadeHistorico);
router.get('/vazao/:plantaId',     requireAuth, ctrl.vazaoHistorico);
router.get('/resumo/:plantaId',    requireAuth, ctrl.resumo);

module.exports = router;
