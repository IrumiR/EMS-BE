const express = require("express");
const {
  createComment,
  getCommentsByTaskId,
  uploadCommentImages,
  deleteComment,
  addReplyToComment,
} = require("../controllers/commentController");
const verifyToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const router = express.Router();

router.post(
  "/create",
  verifyToken,
  authorizeRoles("admin", "manager", "team-member", "client"),
  uploadCommentImages,
  createComment
);
router.post(
  "/:commentId/reply",
  verifyToken,
  authorizeRoles("admin", "manager", "team-member", "client"),
  uploadCommentImages,
  addReplyToComment
);
router.get(
  "/:taskId",
  verifyToken,
  authorizeRoles("admin", "manager", "team-member", "client"),
  getCommentsByTaskId
);
router.delete(
  "/:commentId",
  verifyToken,
  authorizeRoles("admin", "manager"),
  deleteComment
);

module.exports = router;
