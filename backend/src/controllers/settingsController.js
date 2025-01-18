const { getFillMyCalendarStatus, setFillMyCalendarStatus, getNextDayRemindersStatus, setNextDayRemindersStatus } = require('../model/settings');

async function getFillMyCalendar(req, res) {
  const userId = req.user.id;
  try {
    const status = await getFillMyCalendarStatus(userId);
    res.json({ status });
  } catch (error) {
    console.error('Error getting fillMyCalendar status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function setFillMyCalendar(req, res) {
  const userId = req.user.id;
  try {
    const { status } = req.body;
    await setFillMyCalendarStatus(userId, status);
    res.json({ status });
  } catch (error) {
    console.error('Error setting fillMyCalendar status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function getNextDayReminders(req, res) {
  const userId = req.user.id;
  try {
    const status = await getNextDayRemindersStatus(userId);
    res.json({ status });
  } catch (error) {
    console.error('Error getting nextDayReminders status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function setNextDayReminders(req, res) {
  const userId = req.user.id;
  try {
    const { status } = req.body;
    await setNextDayRemindersStatus(userId, status);
    res.json({ status });
  } catch (error) {
    console.error('Error setting nextDayReminders status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = {
  getFillMyCalendar,
  setFillMyCalendar,
  getNextDayReminders,
  setNextDayReminders,
};