const { fillMyCalendar } = require('../ai/fillMyCalendar');
const { getAvailableSlots } = require('../ai/tools/getAvailableSlots');
const { getOldClients, getNumberOfCustomersContacted, getDynamicLapsedClients } = require('../model/clients');
const { getSuggestedResponsesByClient, updateSuggestedResponse, getNumberOfSuggestedResponses } = require('../model/messages');
const { getFillMyCalendarStatus } = require('../model/settings');

/**
 * Calculate next blast time based on cron schedule (9 AM and 2 PM daily)
 */
function getNextBlastTime() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Blast times: 9 AM and 2 PM
  const morningBlast = new Date(today.getTime() + 9 * 60 * 60 * 1000); // 9 AM
  const afternoonBlast = new Date(today.getTime() + 14 * 60 * 60 * 1000); // 2 PM
  
  let nextBlast;
  if (now < morningBlast) {
    nextBlast = morningBlast;
  } else if (now < afternoonBlast) {
    nextBlast = afternoonBlast;
  } else {
    // Next blast is tomorrow morning
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    nextBlast = new Date(tomorrow.getTime() + 9 * 60 * 60 * 1000);
  }
  
  return {
    nextBlastTime: nextBlast.toISOString(),
    timeUntilNext: Math.max(0, nextBlast.getTime() - now.getTime()),
    isToday: nextBlast.toDateString() === now.toDateString()
  };
}

/**
 * Get real-time metrics for today - Fill My Calendar specific
 */
async function getTodayMetrics(userId) {
  const db = require('../model/dbUtils').getDB();
  
  // Outreach messages sent today (OUTREACH type)
  const outreachSentQuery = `
    SELECT COUNT(*) as count
    FROM suggestedresponses sr
    INNER JOIN client c ON sr.clientid = c.id
    WHERE c.user_id = $1 
    AND sr.createdat >= CURRENT_DATE
    AND sr.type = 'OUTREACH'
  `;
  
  // Responses received today from clients who were sent outreach messages
  const outreachResponsesQuery = `
    SELECT COUNT(DISTINCT m.clientid) as count
    FROM messages m
    INNER JOIN client c ON m.clientid = c.id
    WHERE c.user_id = $1 
    AND m.date::date = CURRENT_DATE
    AND m.is_ai = false
    AND EXISTS (
      SELECT 1 FROM suggestedresponses sr 
      WHERE sr.clientid = m.clientid 
      AND sr.type = 'OUTREACH'
      AND sr.createdat >= CURRENT_DATE - INTERVAL '7 days'
    )
  `;
  
  // Appointments booked today from clients who received outreach in the last 7 days
  const outreachBookingsQuery = `
    SELECT COUNT(*) as count
    FROM appointment a
    INNER JOIN client c ON a.clientid = c.id
    WHERE c.user_id = $1 
    AND a.date::date = CURRENT_DATE
    AND EXISTS (
      SELECT 1 FROM suggestedresponses sr 
      WHERE sr.clientid = a.clientid 
      AND sr.type = 'OUTREACH'
      AND sr.createdat >= CURRENT_DATE - INTERVAL '7 days'
    )
  `;
  
  // Revenue generated today from outreach-attributed appointments
  const outreachRevenueQuery = `
    SELECT COALESCE(SUM(a.price), 0) as revenue
    FROM appointment a
    INNER JOIN client c ON a.clientid = c.id
    WHERE c.user_id = $1 
    AND a.date::date = CURRENT_DATE
    AND EXISTS (
      SELECT 1 FROM suggestedresponses sr 
      WHERE sr.clientid = a.clientid 
      AND sr.type = 'OUTREACH'
      AND sr.createdat >= CURRENT_DATE - INTERVAL '7 days'
    )
  `;
  
  // Total outreach messages sent in the last 7 days (for response rate calculation)
  const totalOutreachSentQuery = `
    SELECT COUNT(DISTINCT sr.clientid) as count
    FROM suggestedresponses sr
    INNER JOIN client c ON sr.clientid = c.id
    WHERE c.user_id = $1 
    AND sr.type = 'OUTREACH'
    AND sr.createdat >= CURRENT_DATE - INTERVAL '7 days'
  `;
  
  // Total responses from outreach clients in the last 7 days
  const totalOutreachResponsesQuery = `
    SELECT COUNT(DISTINCT m.clientid) as count
    FROM messages m
    INNER JOIN client c ON m.clientid = c.id
    WHERE c.user_id = $1 
    AND m.is_ai = false
    AND m.date::date >= CURRENT_DATE - INTERVAL '7 days'
    AND EXISTS (
      SELECT 1 FROM suggestedresponses sr 
      WHERE sr.clientid = m.clientid 
      AND sr.type = 'OUTREACH'
      AND sr.createdat >= CURRENT_DATE - INTERVAL '7 days'
    )
  `;
  
  try {
    const [
      outreachSent, 
      outreachResponses, 
      outreachBookings, 
      outreachRevenue,
      totalOutreachSent,
      totalOutreachResponses
    ] = await Promise.all([
      db.query(outreachSentQuery, [userId]),
      db.query(outreachResponsesQuery, [userId]),
      db.query(outreachBookingsQuery, [userId]),
      db.query(outreachRevenueQuery, [userId]),
      db.query(totalOutreachSentQuery, [userId]),
      db.query(totalOutreachResponsesQuery, [userId])
    ]);
    
    const sentToday = parseInt(outreachSent.rows[0].count);
    const responsesToday = parseInt(outreachResponses.rows[0].count);
    const bookingsToday = parseInt(outreachBookings.rows[0].count);
    const revenueToday = parseFloat(outreachRevenue.rows[0].revenue || 0);
    
    // Calculate response rate based on 7-day window
    const totalSent = parseInt(totalOutreachSent.rows[0].count);
    const totalResponses = parseInt(totalOutreachResponses.rows[0].count);
    const responseRate = totalSent > 0 ? Math.round((totalResponses / totalSent) * 100) : 0;
    
    return {
      outreachSent: sentToday,
      outreachResponses: responsesToday,
      outreachBookings: bookingsToday,
      outreachRevenue: revenueToday,
      responseRate: responseRate,
      // Legacy field names for backward compatibility
      messagesSent: sentToday,
      responsesReceived: responsesToday,
      appointmentsBooked: bookingsToday,
      revenueGenerated: revenueToday
    };
  } catch (error) {
    console.error('Error fetching today metrics:', error);
    return {
      outreachSent: 0,
      outreachResponses: 0,
      outreachBookings: 0,
      outreachRevenue: 0,
      responseRate: 0,
      messagesSent: 0,
      responsesReceived: 0,
      appointmentsBooked: 0,
      revenueGenerated: 0
    };
  }
}

/**
 * Get pending outreach messages with full client context
 */
async function getPendingOutreachMessages(userId) {
  const db = require('../model/dbUtils').getDB();
  
  const query = `
    SELECT 
      c.id,
      c.firstname,
      c.lastname,
      c.phonenumber,
      sr.response as message,
      sr.createdat,
      sr.updatedat,
      -- Last appointment info
      (SELECT MAX(a.date) FROM appointment a WHERE a.clientid = c.id) as last_appointment_date,
      (SELECT COUNT(*) FROM appointment a WHERE a.clientid = c.id) as total_appointments,
      (SELECT AVG(a.price) FROM appointment a WHERE a.clientid = c.id) as avg_spending,
      -- Message history
      (SELECT COUNT(*) FROM messages m WHERE m.clientid = c.id AND m.is_ai = false) as total_messages_received,
      (SELECT COUNT(*) FROM suggestedresponses sr2 WHERE sr2.clientid = c.id) as total_outreach_sent,
      -- Calculate days since last appointment
      CASE 
        WHEN (SELECT MAX(a.date) FROM appointment a WHERE a.clientid = c.id) IS NOT NULL 
        THEN (CURRENT_DATE - (SELECT MAX(a.date) FROM appointment a WHERE a.clientid = c.id)::date)
        ELSE NULL 
      END as days_since_last_appointment
    FROM suggestedresponses sr
    INNER JOIN client c ON sr.clientid = c.id
    WHERE c.user_id = $1 
    AND sr.type = 'OUTREACH'
    ORDER BY sr.createdat DESC
  `;
  
  try {
    const result = await db.query(query, [userId]);
    return result.rows.map(row => ({
      id: row.id,
      firstName: row.firstname,
      lastName: row.lastname,
      phoneNumber: row.phonenumber,
      message: row.message,
      createdAt: row.createdat,
      updatedAt: row.updatedat,
      lastAppointmentDate: row.last_appointment_date,
      totalAppointments: parseInt(row.total_appointments || 0),
      avgSpending: parseFloat(row.avg_spending || 0),
      totalMessagesReceived: parseInt(row.total_messages_received || 0),
      totalOutreachSent: parseInt(row.total_outreach_sent || 0),
      daysSinceLastAppointment: parseInt(row.days_since_last_appointment || 0),
      // Calculate readiness indicators
      isHighValue: parseFloat(row.avg_spending || 0) > 50,
      isResponsive: parseInt(row.total_messages_received || 0) > 0,
      isOverdue: parseInt(row.days_since_last_appointment || 0) > 60
    }));
  } catch (error) {
    console.error('Error fetching pending outreach messages:', error);
    return [];
  }
}

/**
 * Get enhanced data for the Fill My Calendar dashboard.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getFillMyCalendarData(req, res) {
  try {
    const userId = req.user.id;
    
    // Get system status
    const isEnabled = await getFillMyCalendarStatus(userId);
    const nextBlastInfo = getNextBlastTime();
    const todayMetrics = await getTodayMetrics(userId);
    
    // Get available slots for the next 7 days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 7);
    
    const availableSlots = await getAvailableSlots(
      startDate.toISOString().split('T')[0], 
      endDate.toISOString().split('T')[0], 
      userId
    );
    
    // Calculate total empty spots and categorize by group
    const slotsByGroup = availableSlots.reduce((acc, day) => {
      Object.entries(day.slotsByGroup).forEach(([group, slots]) => {
        if (!acc[group]) {
          acc[group] = 0;
        }
        acc[group] += slots.length;
      });
      return acc;
    }, {});
    
    const totalEmptySpots = Object.values(slotsByGroup).reduce((sum, count) => sum + count, 0);
    
    // Get pending outreach messages
    const pendingMessages = await getPendingOutreachMessages(userId);
    
    // Get client pipeline data
    const dynamicLapsedClients = await getDynamicLapsedClients(userId);
    const readyForOutreach = dynamicLapsedClients.filter(client => 
      client.readiness_score >= 70 && !pendingMessages.find(pm => pm.id === client.id)
    ).slice(0, 10);
    
    // Create the enhanced response structure
    const data = {
      // System status and timing
      systemStatus: {
        isEnabled,
        isRunning: false, // This would be set by the actual cron job status
        lastRunTime: null, // This would come from a tracking table
        nextBlastTime: nextBlastInfo.nextBlastTime,
        timeUntilNext: nextBlastInfo.timeUntilNext,
        isNextBlastToday: nextBlastInfo.isToday
      },
      
      // Real-time metrics
      todayMetrics,
      
      // Appointment data
      appointmentData: {
        totalEmptySpots,
        slotsByGroup,
        timeframeDays: 7
      },
      
      // Message management
      pendingMessages,
      pendingCount: pendingMessages.length,
      
      // Client pipeline
      clientPipeline: {
        readyForOutreach: readyForOutreach.length,
        currentlyContacted: pendingMessages.length,
        totalEligible: dynamicLapsedClients.length
      },
      
      // Legacy data for backward compatibility
      recommendedStrategy: `Smart outreach to ${dynamicLapsedClients.length} eligible clients based on individual booking patterns`,
      clientsToContact: pendingMessages,
      upcomingClients: readyForOutreach.slice(0, 5),
      recentResults: [], // This would come from a results tracking table
      numberOfCustomersContacted: await getNumberOfCustomersContacted(30, userId)
    };
    
    res.json(data);
  } catch (error) {
    console.error('Error in getFillMyCalendarData:', error);
    res.status(500).json({ error: 'Failed to get Fill My Calendar data' });
  }
}

/**
 * Run Fill My Calendar process manually.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function runFillMyCalendarManually(req, res) {
  try {
    const userId = req.user.id;
    const result = await fillMyCalendar(userId);
    res.json({ message: result || 'Fill My Calendar process completed successfully' });
  } catch (error) {
    console.error('Error in runFillMyCalendarManually:', error);
    res.status(500).json({ error: 'Failed to run Fill My Calendar process' });
  }
}

/**
 * Approve and send an outreach message
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function approveOutreachMessage(req, res) {
  try {
    const { clientId } = req.params;
    const { getClientById } = require('../model/clients');
    const { sendMessage } = require('../config/twilio');
    const { clearSuggestedResponse, getSuggestedResponse } = require('../model/messages');
    
    // Get the suggested response
    const suggestedResponse = await getSuggestedResponse(clientId);
    if (!suggestedResponse) {
      return res.status(404).json({ error: 'No suggested response found for this client' });
    }
    
    // Get client details
    const client = await getClientById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Send the message
    await sendMessage(client.phonenumber, suggestedResponse, req.user.id, false, false);
    
    // Clear the suggested response
    await clearSuggestedResponse(clientId);
    
    res.json({ 
      success: true, 
      message: 'Outreach message sent successfully',
      clientName: `${client.firstname} ${client.lastname}`,
      phoneNumber: client.phonenumber
    });
  } catch (error) {
    console.error('Error in approveOutreachMessage:', error);
    res.status(500).json({ error: 'Failed to approve outreach message' });
  }
}

/**
 * Reject an outreach message
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function rejectOutreachMessage(req, res) {
  try {
    const { clientId } = req.params;
    const { clearSuggestedResponse } = require('../model/messages');
    
    await clearSuggestedResponse(clientId);
    
    res.json({ 
      success: true, 
      message: 'Outreach message rejected and removed'
    });
  } catch (error) {
    console.error('Error in rejectOutreachMessage:', error);
    res.status(500).json({ error: 'Failed to reject outreach message' });
  }
}

/**
 * Bulk approve multiple outreach messages
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function bulkApproveMessages(req, res) {
  try {
    const { clientIds } = req.body;
    const { getClientById } = require('../model/clients');
    const { sendMessage } = require('../config/twilio');
    const { clearSuggestedResponse, getSuggestedResponse } = require('../model/messages');
    
    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({ error: 'clientIds must be a non-empty array' });
    }
    
    const results = [];
    const errors = [];
    
    for (const clientId of clientIds) {
      try {
        // Get the suggested response
        const suggestedResponse = await getSuggestedResponse(clientId);
        if (!suggestedResponse) {
          errors.push({ clientId, error: 'No suggested response found' });
          continue;
        }
        
        // Get client details
        const client = await getClientById(clientId);
        if (!client) {
          errors.push({ clientId, error: 'Client not found' });
          continue;
        }
        
        // Send the message
        await sendMessage(client.phonenumber, suggestedResponse, req.user.id, false, false);
        
        // Clear the suggested response
        await clearSuggestedResponse(clientId);
        
        results.push({
          clientId,
          clientName: `${client.firstname} ${client.lastname}`,
          phoneNumber: client.phonenumber,
          success: true
        });
      } catch (error) {
        errors.push({ clientId, error: error.message });
      }
    }
    
    res.json({
      success: true,
      message: `Processed ${clientIds.length} messages`,
      results,
      errors,
      successCount: results.length,
      errorCount: errors.length
    });
  } catch (error) {
    console.error('Error in bulkApproveMessages:', error);
    res.status(500).json({ error: 'Failed to process bulk approval' });
  }
}

/**
 * Get system status including next blast timing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getSystemStatus(req, res) {
  try {
    const userId = req.user.id;
    const { getFillMyCalendarStatus } = require('../model/settings');
    
    const isEnabled = await getFillMyCalendarStatus(userId);
    const nextBlastInfo = getNextBlastTime();
    const todayMetrics = await getTodayMetrics(userId);
    
    res.json({
      isEnabled,
      isRunning: false, // This would be set by actual cron job status tracking
      lastRunTime: null, // This would come from a tracking table
      nextBlastTime: nextBlastInfo.nextBlastTime,
      timeUntilNext: nextBlastInfo.timeUntilNext,
      isNextBlastToday: nextBlastInfo.isToday,
      todayMetrics
    });
  } catch (error) {
    console.error('Error in getSystemStatus:', error);
    res.status(500).json({ error: 'Failed to get system status' });
  }
}

/**
 * Update outreach message for a client.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateClientOutreachMessage(req, res) {
  try {
    const { clientId } = req.params;
    const { message } = req.body;
    
    // Update the outreach message in the database, preserving its OUTREACH type
    await updateSuggestedResponse(clientId, message, 'OUTREACH');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error in updateClientOutreachMessage:', error);
    res.status(500).json({ error: 'Failed to update client outreach message' });
  }
}

module.exports = {
  getFillMyCalendarData,
  runFillMyCalendarManually,
  updateClientOutreachMessage,
  approveOutreachMessage,
  rejectOutreachMessage,
  bulkApproveMessages,
  getSystemStatus
}; 