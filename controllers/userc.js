
const Analysis = require("../models/analysis");
require("dotenv").config();
const fs = require("fs");
const pdf = require("pdf-parse");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// Retry wrapper with exponential backoff + jitter + fallback model
async function generateWithRetry(params, maxRetries = 4) {
    const models = ["gemini-3.5-flash"]; // primary + fallback

    for (const model of models) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await ai.models.generateContent({ ...params, model });
            } catch (err) {
                const isRetryable = err.status === 503 || err.status === 429;
                const isLastAttempt = attempt === maxRetries - 1;

                console.warn(`Model ${model} failed (attempt ${attempt + 1}/${maxRetries}): ${err.message}`);

                if (!isRetryable || isLastAttempt) break; // move to fallback model or give up

                // Exponential backoff with jitter so retries don't all land at once
                const base = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s, 16s
                const jitter = Math.random() * 500;
                await new Promise(resolve => setTimeout(resolve, base + jitter));
            }
        }
    }

    const err = new Error("All models are currently unavailable. Please try again shortly.");
    err.status = 503;
    throw err;
}

// Helper to safely clean up the uploaded file regardless of outcome
function cleanupFile(filePath) {
    if (!filePath) return;
    fs.unlink(filePath, (err) => {
        if (err) console.log("Unable to delete uploaded file:", err.message);
    });
}

exports.getfont = (req, res, next) => {
    res.render('font/first', { isLoggedIn: req.isLoggedIn, user: req.session.user });
};

exports.getabout = (req, res, next) => {
    res.render('font/about', { isLoggedIn: req.isLoggedIn, user: req.session.user });
};

exports.getfeatures = (req, res, next) => {
    res.render('font/features', { isLoggedIn: req.isLoggedIn, user: req.session.user });
};

exports.getanalyze = (req, res, next) => {
    res.render('font/analyze', { isLoggedIn: req.isLoggedIn, user: req.session.user });
};

exports.postanalyze = async (req, res) => {
    try {
        if (!req.isLoggedIn || !req.session.user) {
            cleanupFile(req.file?.path);
            return res.status(401).json({ error: "not_logged_in", message: "Please log in to analyze a resume." });
        }

        if (!req.file) {
            return res.status(400).json({ error: "no_file", message: "No resume file uploaded." });
        }

        const fileBuffer = fs.readFileSync(req.file.path);
        const data = await pdf(fileBuffer);

        const prompt = `
You are an ATS Resume Analyzer.

Analyze the following resume.

Target Job Role:
${req.body.jobRoles}

Experience:
${req.body.experience}

Job Description:
${req.body.jobDescription || "Not Provided"}

Resume:

${data.text}

Return ONLY valid JSON, with no markdown formatting or code fences.

{
  "atsScore": 0,
  "summary": "",
  "strengths": [],
  "weaknesses": [],
  "missingSkills": [],
  "suggestions": [],
  "jobMatch": 0
}
`;

        let response;
        try {
            response = await generateWithRetry({ contents: prompt });
        } catch (aiErr) {
            cleanupFile(req.file.path);
            throw aiErr;
        }

        // Strip potential ```json fences before parsing
        const rawText = response.text.trim();
        const cleaned = rawText.replace(/^```json\s*|\s*```$/g, "");

        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch (parseErr) {
            console.error("Failed to parse model output:", cleaned);
            cleanupFile(req.file.path);
            return res.status(502).json({
                error: "bad_ai_response",
                message: "AI returned invalid JSON."
            });
        }

        // Save analysis in MongoDB, with safe defaults in case fields are missing
        const result = new Analysis({
            userId: req.session.user._id,
            resumeFile: req.file.filename,
            jobRoles: Array.isArray(req.body.jobRoles) ? req.body.jobRoles : [req.body.jobRoles],
            experience: req.body.experience,
            jobDescription: req.body.jobDescription,
            atsScore: parsed.atsScore ?? 0,
            summary: parsed.summary ?? "",
            strengths: parsed.strengths ?? [],
            weaknesses: parsed.weaknesses ?? [],
            missingSkills: parsed.missingSkills ?? [],
            suggestions: parsed.suggestions ?? [],
            jobMatch: parsed.jobMatch ?? 0
        });

        await result.save();

        cleanupFile(req.file.path);

        return res.render("font/result", {
            analysis: parsed,
            isLoggedIn: req.isLoggedIn,
            user: req.session.user
        });

    } catch (err) {
        console.error(err);
        cleanupFile(req.file?.path);

        if (err.status === 503 || /unavailable/i.test(err.message)) {
            return res.status(503).json({
                error: "overloaded",
                message: "The AI service is currently overloaded. Please try again in a moment."
            });
        }

        if (err.status === 404) {
            return res.status(500).json({
                error: "model_unavailable",
                message: "The configured AI model is no longer available. Please contact the site admin."
            });
        }

        res.status(500).json({ error: "server_error", message: err.message });
    }
};


exports.getInterviewQuestionsForm = async (req, res) => {
    if (!req.isLoggedIn || !req.session.user) {
        return res.redirect('/login');
    }

    const analyses = await Analysis.find({ userId: req.session.user._id }).sort({ createdAt: -1 });

    res.render('font/question', {
        isLoggedIn: req.isLoggedIn,
        user: req.session.user,
        analyses,
        interview: null   // guarded in the view, safe for the form page
    });
};

exports.postInterviewQuestions = async (req, res) => {
    try {
        if (!req.isLoggedIn || !req.session.user) {
            return res.status(401).json({ error: "not_logged_in", message: "Please log in." });
        }

        const { analysisId, jobRole, experience, jobDescription } = req.body;

        let roleContext = { jobRole, experience, jobDescription };

        if (analysisId) {
            const analysis = await Analysis.findOne({ _id: analysisId, userId: req.session.user._id });
            if (!analysis) {
                return res.status(404).json({ error: "not_found", message: "Analysis not found." });
            }
            roleContext = {
                jobRole: analysis.jobRoles.join(", "),
                experience: analysis.experience,
                jobDescription: analysis.jobDescription
            };
        }

        if (!roleContext.jobRole) {
            return res.status(400).json({ error: "missing_fields", message: "Job role is required." });
        }

        const prompt = `
You are an expert technical interviewer and career coach.

Generate a set of interview questions for the following candidate profile.

Target Job Role: ${roleContext.jobRole}
Experience Level: ${roleContext.experience || "Not specified"}
Job Description: ${roleContext.jobDescription || "Not provided"}

Return ONLY valid JSON, no markdown formatting, no code fences, no explanation.

{
  "technical": ["question 1", "question 2", "question 3", "question 4", "question 5"],
  "projects": ["question 1", "question 2", "question 3", "question 4", "question 5"],
  "hr": ["question 1", "question 2", "question 3", "question 4", "question 5"],
  "tips": ["short actionable tip 1", "short actionable tip 2", "short actionable tip 3"]
}

Rules:
- Technical questions should match the seniority implied by the experience level.
- Project questions should ask the candidate to explain, justify, and defend decisions made in a typical project for this role.
- HR questions should cover behavioral, motivation, and culture-fit topics using STAR-style scenarios.
- Keep each question concise (under 25 words).
`;

        let response;
        try {
            response = await generateWithRetry({ contents: prompt });
        } catch (aiErr) {
            throw aiErr;
        }

        const rawText = response.text.trim();
        const cleaned = rawText.replace(/^```json\s*|\s*```$/g, "");

        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch (parseErr) {
            console.error("Failed to parse interview questions:", cleaned);
            return res.status(502).json({
                error: "bad_ai_response",
                message: "AI returned invalid JSON."
            });
        }

        // Safe defaults in case the model omits a field
        const interview = {
            technical: parsed.technical ?? [],
            projects: parsed.projects ?? [],
            hr: parsed.hr ?? [],
            tips: parsed.tips ?? []
        };

        if (analysisId) {
            await Analysis.findByIdAndUpdate(analysisId, { interviewQuestions: interview });
        }

        res.render('font/question', {
            isLoggedIn: req.isLoggedIn,
            user: req.session.user,
            analyses: [],        // not needed on result render, but keep the var defined for the shared view
            interview,
            roleContext
        });

    } catch (err) {
        console.error(err);

        if (err.status === 503 || /unavailable/i.test(err.message)) {
            return res.status(503).json({
                error: "overloaded",
                message: "The AI service is currently overloaded. Please try again in a moment."
            });
        }

        res.status(500).json({ error: "server_error", message: err.message });
    }
};



// Add near the top with your other requires — no new imports needed

exports.getChatbot = (req, res) => {
    if (!req.isLoggedIn || !req.session.user) {
        return res.redirect('/login');
    }

    // Initialize chat history in session if it doesn't exist yet
    if (!req.session.chatHistory) {
        req.session.chatHistory = [];
    }

    res.render('font/chatbot', {
        isLoggedIn: req.isLoggedIn,
        user: req.session.user,
        chatHistory: req.session.chatHistory
    });
};

exports.postChatbotMessage = async (req, res) => {
    try {
        if (!req.isLoggedIn || !req.session.user) {
            return res.status(401).json({ error: "not_logged_in", message: "Please log in." });
        }

        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: "empty_message", message: "Message cannot be empty." });
        }

        if (!req.session.chatHistory) {
            req.session.chatHistory = [];
        }

        // System-style priming only on the first message of the conversation
        const isFirstMessage = req.session.chatHistory.length === 0;

        // Add user's message to history
        req.session.chatHistory.push({
            role: "user",
            parts: [{ text: message }]
        });

        // Build the contents array Gemini expects for multi-turn chat
        const contents = isFirstMessage
            ? [
                {
                    role: "user",
                    parts: [{
                        text: `You are a helpful, friendly career and resume assistant embedded in a resume analyzer app. Help users with career advice, resume tips, interview prep, and general career questions. Keep answers concise and practical.\n\nUser: ${message}`
                    }]
                }
              ]
            : req.session.chatHistory;

        let response;
        try {
            response = await generateWithRetry({ contents });
        } catch (aiErr) {
            // Roll back the pushed user message on failure so retry doesn't duplicate it
            req.session.chatHistory.pop();
            throw aiErr;
        }

        const replyText = response.text.trim();

        // Add AI's reply to history
        req.session.chatHistory.push({
            role: "model",
            parts: [{ text: replyText }]
        });

        // Cap history length to avoid runaway session size / token usage (keep last 20 turns)
        if (req.session.chatHistory.length > 40) {
            req.session.chatHistory = req.session.chatHistory.slice(-40);
        }

        res.json({ reply: replyText });

    } catch (err) {
        console.error(err);

        if (err.status === 503 || /unavailable/i.test(err.message)) {
            return res.status(503).json({
                error: "overloaded",
                message: "The AI service is currently overloaded. Please try again in a moment."
            });
        }

        res.status(500).json({ error: "server_error", message: err.message });
    }
};

exports.postChatbotReset = (req, res) => {
    req.session.chatHistory = [];
    res.json({ success: true });
};