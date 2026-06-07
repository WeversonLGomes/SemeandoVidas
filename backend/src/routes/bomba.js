const router = require('express').Router();
const { requireAuth, requireDevice } = require('../middleware/auth');
const ctrl = require('../controllers/bombaController');

// Dashboard → enviar comando para a bomba
router.post('/comando',          requireAuth,   ctrl.enviarComando);

// ESP32 → buscar próximo comando pendente
router.get('/pendente/:deviceId', requireDevice, ctrl.buscarPendente);

// ESP32 → confirmar execução do comando (POST pois o ESP32 só tem httpPost)
router.post('/confirmar/:id',     requireDevice, ctrl.confirmarExecucao);
router.patch('/confirmar/:id',    requireDevice, ctrl.confirmarExecucao);

module.exports = router;
