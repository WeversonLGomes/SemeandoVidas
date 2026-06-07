const router = require('express').Router();
const { requireAuth, requireDevice } = require('../middleware/auth');
const ctrl = require('../controllers/dispositivosController');

// ESP32 → registrar/atualizar heartbeat
router.post('/ping',  requireDevice, ctrl.ping);

// Dashboard → listar dispositivos do usuário
router.get('/',       requireAuth,   ctrl.listar);
router.get('/:plantaId', requireAuth, ctrl.buscarPorPlanta);

module.exports = router;
