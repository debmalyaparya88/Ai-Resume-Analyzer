const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    resumeFile: String,
    jobRoles: [String],
    experience: String,
    jobDescription: String,

    atsScore: Number,
    summary: String,
    strengths: [String],
    weaknesses: [String],
    missingSkills: [String],
    suggestions: [String],
    jobMatch: Number,

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Analysis", analysisSchema);