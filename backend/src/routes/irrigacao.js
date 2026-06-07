const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/irrigacaoController');

router.use(requireAuth);

router.get('/:plantaId',          ctrl.historico);
router.get('/:plantaId/ativa',    ctrl.buscarAtiva);
router.post('/:plantaId/iniciar', ctrl.iniciar);
router.patch('/:id/finalizar',    ctrl.finalizar);

module.exports = router;
