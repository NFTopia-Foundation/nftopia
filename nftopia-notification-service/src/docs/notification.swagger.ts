/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [email, sms, push, in-app]
 *         content:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, sent, failed, read]
 *         metadata:
 *           type: object
 *           properties:
 *             nftId:
 *               type: string
 *             collectionId:
 *               type: string
 *             transactionHash:
 *               type: string
 */

/**
 * @swagger
 * /notifications:
 *   post:
 *     summary: Create a new notification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Notification'
 *     responses:
 *       201:
 *         description: Notification created
 */
// Add other endpoint documentation