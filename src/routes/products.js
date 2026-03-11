const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { validateCreateProduct, handleValidationErrors } = require('../middleware/validators');

router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.post('/', validateCreateProduct, handleValidationErrors, productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
