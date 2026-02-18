const Groq = require('groq-sdk');
const crypto = require('crypto');
const db = require('../config/database');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

class AIService {

  // Generate a hash for caching
  static generateHash(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  // Check cache before making API call
  static async getCachedAnalysis(userId, analysisType, inputData) {
    const inputHash = this.generateHash(inputData);
    const result = await db.query(
      `SELECT result FROM ai_analysis_cache 
       WHERE user_id = $1 AND analysis_type = $2 AND input_hash = $3 
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId, analysisType, inputHash]
    );
    return result.rows[0]?.result;
  }

  // Cache analysis result
  static async cacheAnalysis(userId, analysisType, inputData, result, expiresInHours = 24) {
    const inputHash = this.generateHash(inputData);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    await db.query(
      `INSERT INTO ai_analysis_cache (user_id, analysis_type, input_hash, result, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, analysis_type, input_hash) 
       DO UPDATE SET result = $4, created_at = NOW(), expires_at = $5`,
      [userId, analysisType, inputHash, JSON.stringify(result), expiresAt]
    );
  }

  // Analyze productivity patterns and generate insights
  static async analyzeProductivity(userId, sessions, tasks) {
    const cacheKey = { sessions: sessions.length, lastSession: sessions[0]?.id };
    const cached = await this.getCachedAnalysis(userId, 'productivity_analysis', cacheKey);
    if (cached) return cached;

    const prompt = `Analyze this user's Pomodoro session data and provide productivity insights:

Sessions (last 7 days):
${JSON.stringify(sessions, null, 2)}

Active Tasks:
${JSON.stringify(tasks, null, 2)}

Please provide:
1. Overall productivity trends
2. Best performing times of day
3. Focus patterns (when do they have longest uninterrupted sessions?)
4. Actionable suggestions for improvement
5. Optimal break timing recommendations based on their patterns

Return your response as JSON with this structure:
{
  "summary": "2-3 sentence overview",
  "trends": ["trend1", "trend2", "trend3"],
  "bestTimes": ["time period with explanation"],
  "focusPatterns": "description of focus patterns",
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "breakRecommendations": {
    "timing": "when to take breaks",
    "duration": "recommended break duration",
    "reasoning": "why this works for this user"
  },
  "focusScore": 85
}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // or 'mixtral-8x7b-32768' for faster responses
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0].message.content;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: responseText };

    await this.cacheAnalysis(userId, 'productivity_analysis', cacheKey, result, 6);
    return result;
  }

  // Prioritize tasks using AI
  static async prioritizeTasks(userId, tasks, sessionHistory) {
    const cacheKey = { tasks: tasks.map(t => t.id), historyCount: sessionHistory.length };
    const cached = await this.getCachedAnalysis(userId, 'task_prioritization', cacheKey);
    if (cached) return cached;

    const prompt = `You are a productivity AI helping prioritize tasks for a Pomodoro timer user.

Current Tasks:
${JSON.stringify(tasks, null, 2)}

Recent Session History:
${JSON.stringify(sessionHistory.slice(0, 20), null, 2)}

Please analyze and return a JSON object with:
{
  "prioritizedTasks": [
    {
      "taskId": number,
      "priority": "critical|high|medium|low",
      "reasoning": "why this priority",
      "suggestedPomodoros": number,
      "recommendedTimeOfDay": "morning|afternoon|evening",
      "dependencies": []
    }
  ],
  "schedule": {
    "morning": [taskIds],
    "afternoon": [taskIds],
    "evening": [taskIds]
  },
  "insights": "Overall strategy for completing these tasks"
}

Consider:
- Estimated vs completed pomodoros
- Task descriptions and complexity
- User's historical productivity patterns
- Cognitive load and energy levels throughout the day`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0].message.content;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { prioritizedTasks: [] };

    await this.cacheAnalysis(userId, 'task_prioritization', cacheKey, result, 12);
    return result;
  }

  // Generate smart break suggestions
  static async generateBreakSuggestion(userId, currentSession, recentSessions) {
    const completedPomodoros = recentSessions.filter(s =>
      s.session_type === 'work' && s.completed
    ).length;

    const lastBreak = recentSessions.find(s =>
      s.session_type.includes('break')
    );

    const timeSinceLastBreak = lastBreak
      ? (Date.now() - new Date(lastBreak.ended_at).getTime()) / 1000 / 60
      : 999;

    const prompt = `Based on this user's current session data, suggest when and how long their next break should be:

Current Session: ${JSON.stringify(currentSession)}
Completed Pomodoros Today: ${completedPomodoros}
Time Since Last Break: ${Math.round(timeSinceLastBreak)} minutes
Recent Sessions: ${JSON.stringify(recentSessions.slice(0, 5))}

Provide a JSON response:
{
  "shouldBreak": boolean,
  "breakType": "short|long",
  "duration": number (minutes),
  "reasoning": "explanation",
  "suggestion": "friendly message to the user"
}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = completion.choices[0].message.content;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  }

  // Calculate focus score based on session patterns
  static calculateFocusScore(session, userHistory) {
    if (!session.completed) return 0;

    let score = 50; // Base score

    // Completion bonus
    const completionRate = session.duration / session.planned_duration;
    if (completionRate >= 0.95) score += 30;
    else if (completionRate >= 0.8) score += 20;
    else if (completionRate >= 0.6) score += 10;

    // Consistency bonus
    const avgCompletionRate = userHistory.length > 0
      ? userHistory.reduce((sum, s) => sum + (s.duration / s.planned_duration), 0) / userHistory.length
      : 0.5;

    if (completionRate > avgCompletionRate) score += 10;

    // Time of day bonus (if it matches their best time)
    const hour = new Date(session.started_at).getHours();
    const bestHours = this.findBestProductivityHours(userHistory);
    if (bestHours.includes(hour)) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  static findBestProductivityHours(sessions) {
    const hourlyScores = {};
    sessions.forEach(session => {
      const hour = new Date(session.started_at).getHours();
      if (!hourlyScores[hour]) hourlyScores[hour] = [];
      hourlyScores[hour].push(session.duration / session.planned_duration);
    });

    const avgScores = Object.entries(hourlyScores)
      .map(([hour, scores]) => ({
        hour: parseInt(hour),
        avg: scores.reduce((a, b) => a + b, 0) / scores.length
      }))
      .sort((a, b) => b.avg - a.avg);

    return avgScores.slice(0, 3).map(s => s.hour);
  }

  // Generate daily summary
  static async generateDailySummary(userId, todaySessions, todayTasks) {
    const completedPomodoros = todaySessions.filter(s =>
      s.session_type === 'work' && s.completed
    ).length;

    const totalFocusTime = todaySessions
      .filter(s => s.session_type === 'work')
      .reduce((sum, s) => sum + s.duration, 0) / 60; // in minutes

    const prompt = `Generate a motivating daily summary for this user:

Completed Pomodoros: ${completedPomodoros}
Total Focus Time: ${Math.round(totalFocusTime)} minutes
Sessions: ${JSON.stringify(todaySessions)}
Tasks Worked On: ${JSON.stringify(todayTasks)}

Create a JSON response:
{
  "headline": "Catchy one-liner about their day",
  "stats": {
    "pomodoros": number,
    "focusTime": number,
    "tasksCompleted": number
  },
  "highlights": ["achievement1", "achievement2"],
  "tomorrow": "Suggestion for tomorrow",
  "motivation": "Encouraging message"
}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 800,
    });

    const responseText = completion.choices[0].message.content;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  }
}

module.exports = AIService;