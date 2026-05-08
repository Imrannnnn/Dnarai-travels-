import express from 'express';
import { timeController } from '../controllers/time.controller.js';

const router = express.Router();

// Search airports
router.get('/search', timeController.searchAirports);

// Get live time for an airport
router.get('/airport/:iata', timeController.getAirportTime);

// Convert time between airports
router.get('/convert', timeController.convertTime);

export default router;
