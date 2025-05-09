const express = require('express');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const router = express.Router();
const { getAllUsers, getUserById,updateUser, deleteUser, getClientDropdown, getAssigneesDropdown } = require('../controllers/userController');

//only admin can access this router
router.get('/admin', verifyToken, authorizeRoles("admin"), (req, res) => {
    res.json({ message: "Welcome Admin!" });
});


//both admin and manager can access this router
router.get('/manager', verifyToken, authorizeRoles("admin", "manager"), (req, res) => {
    res.json({ message: "Welcome Manager!" });
});

//admin, manager and team member can access this router
router.get('/team-member', verifyToken, authorizeRoles("admin", "manager", "team-member"), (req, res) => {
    res.json({ message: "Welcome Team Member!" });
});

//all can access this router
router.get('/client', verifyToken, authorizeRoles("admin", "manager", "team-member", "client"), (req, res) => {
    res.json({ message: "Welcome Client!" });
});


router.get('/all', verifyToken, authorizeRoles("admin", "manager"), getAllUsers);
router.get('/:id', verifyToken, authorizeRoles("admin", "manager"), getUserById);
router.get('/dropdown/clients', verifyToken, authorizeRoles("admin", "manager"), getClientDropdown);
router.get('/dropdown/assignees', verifyToken, authorizeRoles("admin", "manager"), getAssigneesDropdown);
router.put('/:id', verifyToken, authorizeRoles("admin", "manager"), updateUser);
router.delete('/:id', verifyToken, authorizeRoles("admin", "manager"), deleteUser);


module.exports = router;