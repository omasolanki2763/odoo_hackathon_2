/**
 * Points System Utility Functions
 * 
 * This file contains utility functions for managing user points in the ReWear app.
 */

// Constants for points values
export const POINTS = {
  WELCOME_BONUS: 100,
  ADD_ITEM: 20,
  COMPLETE_SWAP: 30,
  DAILY_LOGIN: 5,
  ITEM_APPROVED: 10,
};

/**
 * Get the current user's points
 * @returns {number} The user's current points balance
 */
export const getUserPoints = () => {
  try {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    return userData.points || 0;
  } catch (err) {
    console.error('Error getting user points:', err);
    return 0;
  }
};

/**
 * Update the user's points balance
 * @param {number} points - The new points balance
 */
export const updateUserPoints = (points) => {
  try {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    userData.points = points;
    localStorage.setItem('userData', JSON.stringify(userData));
    
    // In a real app, you would also update the server
    // api.put('/users/points', { points });
  } catch (err) {
    console.error('Error updating user points:', err);
  }
};

/**
 * Add points to the user's balance
 * @param {number} amount - The amount of points to add
 * @param {string} reason - The reason for adding points (for tracking)
 * @returns {number} The new points balance
 */
export const addPoints = (amount, reason = '') => {
  const currentPoints = getUserPoints();
  const newPoints = currentPoints + amount;
  updateUserPoints(newPoints);
  
  // Log the transaction in localStorage for history
  logPointsTransaction(amount, reason);
  
  return newPoints;
};

/**
 * Deduct points from the user's balance
 * @param {number} amount - The amount of points to deduct
 * @param {string} reason - The reason for deducting points (for tracking)
 * @returns {boolean} True if successful, false if insufficient points
 */
export const deductPoints = (amount, reason = '') => {
  const currentPoints = getUserPoints();
  
  if (currentPoints < amount) {
    return false; // Insufficient points
  }
  
  const newPoints = currentPoints - amount;
  updateUserPoints(newPoints);
  
  // Log the transaction in localStorage for history
  logPointsTransaction(-amount, reason);
  
  return true;
};

/**
 * Check if user has enough points
 * @param {number} amount - The amount of points to check
 * @returns {boolean} True if user has enough points
 */
export const hasEnoughPoints = (amount) => {
  const currentPoints = getUserPoints();
  return currentPoints >= amount;
};

/**
 * Log a points transaction to localStorage
 * @param {number} amount - The amount of points (positive for add, negative for deduct)
 * @param {string} reason - The reason for the transaction
 */
const logPointsTransaction = (amount, reason) => {
  try {
    const transactions = JSON.parse(localStorage.getItem('pointsTransactions') || '[]');
    transactions.push({
      id: Date.now(),
      amount,
      reason,
      date: new Date().toISOString()
    });
    localStorage.setItem('pointsTransactions', JSON.stringify(transactions));
  } catch (err) {
    console.error('Error logging points transaction:', err);
  }
};

/**
 * Award welcome bonus to new users
 * Only awards points if the user hasn't received them before
 * @returns {boolean} True if points were awarded, false if already received
 */
export const awardWelcomeBonus = () => {
  try {
    const hasReceivedWelcomeBonus = localStorage.getItem('welcomeBonusReceived') === 'true';
    
    if (!hasReceivedWelcomeBonus) {
      addPoints(POINTS.WELCOME_BONUS, 'Welcome bonus');
      localStorage.setItem('welcomeBonusReceived', 'true');
      return true;
    }
    
    return false;
  } catch (err) {
    console.error('Error awarding welcome bonus:', err);
    return false;
  }
};

/**
 * Award points for adding a new item
 * @returns {number} The new points balance
 */
export const awardAddItemPoints = () => {
  return addPoints(POINTS.ADD_ITEM, 'Added new item');
};

/**
 * Award points for completing a swap
 * @returns {number} The new points balance
 */
export const awardCompleteSwapPoints = () => {
  return addPoints(POINTS.COMPLETE_SWAP, 'Completed swap');
};

/**
 * Award points for daily login
 * Only awards points once per day
 * @returns {boolean} True if points were awarded, false if already received today
 */
export const awardDailyLoginPoints = () => {
  try {
    const lastLoginDate = localStorage.getItem('lastLoginDate');
    const today = new Date().toDateString();
    
    if (lastLoginDate !== today) {
      addPoints(POINTS.DAILY_LOGIN, 'Daily login');
      localStorage.setItem('lastLoginDate', today);
      return true;
    }
    
    return false;
  } catch (err) {
    console.error('Error awarding daily login points:', err);
    return false;
  }
};

/**
 * Award points when an item is approved by admin
 * @param {string} itemId - The ID of the approved item
 * @returns {number} The new points balance
 */
export const awardItemApprovedPoints = (itemId) => {
  return addPoints(POINTS.ITEM_APPROVED, `Item ${itemId} approved`);
}; 