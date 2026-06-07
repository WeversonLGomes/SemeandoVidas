const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/plantasController');

router.use(requireAuth);

router.get('/',         ctrl.listar);
router.get('/dashboard', ctrl.dashboard);
router.get('/:id',      ctrl.buscar);
router.post('/',        ctrl.criar);
router.put('/:id',      ctrl.atualizar);
router.delete('/:id',   ctrl.remover);

module.exports = router;
