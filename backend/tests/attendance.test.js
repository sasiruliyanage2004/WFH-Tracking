const request = require('supertest');
const express = require('express');

// Create a mock app for testing attendance logic
const app = express();
app.use(express.json());

// Mock Supabase
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  insert: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null })
};

// Simplified mock check-in endpoint (similar to what index.js does)
app.post('/api/attendance/checkin', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Simulated logic: check if there's already an active shift (checkout is null)
  const existing = await mockSupabase.from('attendance').select('*').eq('check_out_time', null).maybeSingle();
  
  if (existing.data) {
    return res.status(400).json({ message: 'You already have an active shift.' });
  }

  // Create new check-in
  await mockSupabase.from('attendance').insert([{ date: today, check_in_time: new Date().toISOString() }]).single();
  res.status(200).json({ message: 'Check-in successful' });
});

describe('Attendance Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Check-in should fail if there is an active shift from yesterday', async () => {
    // Mock that an active shift exists (e.g. from an overnight shift)
    mockSupabase.maybeSingle.mockResolvedValueOnce({ 
      data: { id: 1, date: '2026-06-30', check_out_time: null }, 
      error: null 
    });

    const response = await request(app).post('/api/attendance/checkin').send({});
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('You already have an active shift.');
  });

  test('Check-in should succeed if no active shift exists', async () => {
    // Mock that no active shift exists
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const response = await request(app).post('/api/attendance/checkin').send({});
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Check-in successful');
  });
});
