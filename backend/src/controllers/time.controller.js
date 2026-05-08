import { TimeService } from '../services/TimeService.js';

export const timeController = {
  /**
   * Search for airports by city or code
   */
  searchAirports: async (req, res, next) => {
    try {
      const { q } = req.query;
      const airports = await TimeService.searchAirports(q);
      res.json(airports);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get current local time for an airport
   */
  getAirportTime: async (req, res, next) => {
    try {
      const { iata } = req.params;
      const result = await TimeService.getAirportTime(iata);
      if (!result) {
        return res.status(404).json({ message: 'Airport not found' });
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Convert time between airports
   */
  convertTime: async (req, res, next) => {
    try {
      const { from, to, time } = req.query;
      if (!from || !to) {
        return res.status(400).json({ message: 'Origin and destination IATA codes are required' });
      }

      const result = await TimeService.convertTimeBetweenAirports(from, to, time);
      if (!result) {
        return res.status(404).json({ message: 'One or both airports not found or timezone derivation failed' });
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
};
